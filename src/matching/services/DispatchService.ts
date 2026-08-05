import { redis } from '../../config/database.js';
import { DeliveryRequest, CourierState } from '../models/CourierState.js';
import { MatchingEngine, CourierMatch } from './MatchingEngine.js';
import { MATCHING_CONFIG } from '../config/vehicles.js';
import { DispatchTimeoutService } from './DispatchTimeoutService.js';
import { emitNewJobOffer, NewJobOfferPayload } from '../../websocket/websocket.service.js';
import config from '../../config/environment.js';
import logger from '../../utils/logger.js';

export interface DispatchResult {
  success: boolean;
  assignedCourier?: CourierState;
  eta?: number;
  attempts: number;
  message?: string;
}

export class DispatchService {
  private static readonly DISPATCH_LOCK_PREFIX = 'dispatch:lock:';
  private static readonly COURIER_OFFER_PREFIX = 'offer:';
  private static timeoutService = new DispatchTimeoutService();

  static async dispatchDelivery(request: DeliveryRequest): Promise<DispatchResult> {
    // Get Redis lock for this delivery
    const lockKey = `${this.DISPATCH_LOCK_PREFIX}${request.id}`;
    const exists = await redis.exists(lockKey);
    
    if (exists) {
      return {
        success: false,
        attempts: 0,
        message: 'Delivery already being processed'
      };
    }

    await redis.setEx(lockKey, 60, '1'); // 1 minute lock

    // Start tracking dispatch attempt with 30-minute timeout
    await this.timeoutService.trackDispatchAttempt(request.id);

    try {
      const result = await this.performSequentialDispatch(request);
      
      // If successful, clear the timeout tracker
      if (result.success) {
        await this.timeoutService.clearDispatchAttempt(request.id);
      }
      
      return result;
    } finally {
      // Release lock
      await redis.del(lockKey);
    }
  }

  private static async performSequentialDispatch(request: DeliveryRequest): Promise<DispatchResult> {
    const matches = await MatchingEngine.findMatchingCouriers(request);
    
    if (matches.length === 0) {
      return {
        success: false,
        attempts: 0,
        message: 'No available couriers found'
      };
    }

    let attempts = 0;
    const maxAttempts = Math.min(MATCHING_CONFIG.MAX_DISPATCH_ATTEMPTS, matches.length);

    for (let i = 0; i < maxAttempts; i++) {
      const match = matches[i];
      attempts++;

      const result = await this.offerToSingleCourier(request, match);
      
      if (result.accepted) {
        return {
          success: true,
          assignedCourier: match.courier,
          eta: match.eta,
          attempts,
          message: 'Delivery assigned successfully'
        };
      }

      // Wait before trying next courier (except for last attempt)
      if (i < maxAttempts - 1) {
        await this.sleep(1000); // 1 second between attempts
      }
    }

    // If sequential dispatch fails, try broadcast to remaining couriers
    if (matches.length > maxAttempts) {
      const broadcastResult = await this.broadcastToRemainingCouriers(
        request, 
        matches.slice(maxAttempts)
      );
      
      if (broadcastResult.success) {
        return {
          ...broadcastResult,
          attempts: attempts + 1
        };
      }
    }

    return {
      success: false,
      attempts,
      message: `No courier accepted after ${attempts} attempts`
    };
  }

  private static async offerToSingleCourier(
    request: DeliveryRequest,
    match: CourierMatch
  ): Promise<{ accepted: boolean; courierId?: string }> {
    const offerKey = `${this.COURIER_OFFER_PREFIX}${match.courier.id}:${request.id}`;
    
    // Store offer with timeout
    await redis.setEx(offerKey, MATCHING_CONFIG.DISPATCH_TIMEOUT, JSON.stringify({
      requestId: request.id,
      courierId: match.courier.id,
      eta: match.eta,
      pickupAddress: request.pickupLocation.address,
      dropoffAddress: request.dropoffLocation.address,
      package: request.package,
      timestamp: Date.now()
    }));

    this.emitNewJobOffer(match, request);

    logger.info("Offering delivery to courier", { deliveryId: request.id, courierId: match.courier.id });

    // Wait for response (in real implementation, this would be event-driven)
    return await this.waitForCourierResponse(offerKey, match.courier.id);
  }

  private static async waitForCourierResponse(
    offerKey: string,
    courierId: string
  ): Promise<{ accepted: boolean; courierId?: string }> {
    const responseKey = `${offerKey}:response`;
    
    // Poll for response (in production, use pub/sub)
    for (let i = 0; i < MATCHING_CONFIG.DISPATCH_TIMEOUT; i++) {
      const response = await redis.get(responseKey);
      
      if (response) {
        const { accepted } = typeof response === 'string' ? JSON.parse(response) : response as any;
        await redis.del(offerKey);
        await redis.del(responseKey);
        
        return {
          accepted,
          courierId: accepted ? courierId : undefined
        };
      }
      
      await this.sleep(1000);
    }

    // Timeout - clean up and return rejection
    await redis.del(offerKey);
    return { accepted: false };
  }

  private static async broadcastToRemainingCouriers(
    request: DeliveryRequest,
    matches: CourierMatch[]
  ): Promise<{ success: boolean; assignedCourier?: CourierState }> {
    // Filter out bicycles if distance > 3km (anti-spam for bicycles)
    const eligibleMatches = matches.filter(match => {
      if (match.courier.vehicleType === 'BICYCLE' && match.distance > 1500) {
        return false;
      }
      return true;
    });

    if (eligibleMatches.length === 0) {
      return { success: false };
    }

    const requestId = request.id;
    const offerTtl = 30; // seconds

    // Create a per-courier offer + push a real-time offer to each eligible courier
    for (const match of eligibleMatches) {
      const offerKey = `${this.COURIER_OFFER_PREFIX}${match.courier.id}:${requestId}`;
      await redis.setEx(offerKey, offerTtl, JSON.stringify({
        requestId,
        courierId: match.courier.id,
        eta: match.eta,
        pickupAddress: request.pickupLocation.address,
        dropoffAddress: request.dropoffLocation.address,
        package: request.package,
        timestamp: Date.now()
      }));

      this.emitNewJobOffer(match, request, 10000);
    }

    logger.info('Broadcasting delivery to couriers', { requestId, courierCount: eligibleMatches.length });

    // Wait for the first acceptance
    for (let i = 0; i < 10; i++) { // 10 second timeout for broadcast
      for (const match of eligibleMatches) {
        const courierOfferKey = `${this.COURIER_OFFER_PREFIX}${match.courier.id}:${requestId}`;
        const courierResponseKey = `${courierOfferKey}:response`;
        const response = await redis.get(courierResponseKey);

        if (response) {
          const { accepted } = typeof response === 'string' ? JSON.parse(response) : response as any;

          if (accepted) {
            await redis.del(courierOfferKey);
            await redis.del(courierResponseKey);
            return { success: true, assignedCourier: match.courier };
          }

          // Courier declined — remove their offer so they aren't offered again
          await redis.del(courierOfferKey);
          await redis.del(courierResponseKey);
        }
      }

      await this.sleep(1000);
    }

    // Clean up remaining offers
    for (const match of eligibleMatches) {
      await redis.del(`${this.COURIER_OFFER_PREFIX}${match.courier.id}:${requestId}`);
      await redis.del(`${this.COURIER_OFFER_PREFIX}${match.courier.id}:${requestId}:response`);
    }
    return { success: false };
  }

  // Courier response methods (called by courier app)
  static async acceptOffer(courierId: string, requestId: string): Promise<boolean> {
    const offerKey = `${this.COURIER_OFFER_PREFIX}${courierId}:${requestId}`;
    const responseKey = `${offerKey}:response`;
    
    const offer = await redis.get(offerKey);
    if (!offer) {
      return false; // Offer expired or doesn't exist
    }

    await redis.setEx(responseKey, 10, JSON.stringify({
      accepted: true,
      courierId,
      timestamp: Date.now()
    }));

    return true;
  }

  static async rejectOffer(courierId: string, requestId: string): Promise<boolean> {
    const offerKey = `${this.COURIER_OFFER_PREFIX}${courierId}:${requestId}`;
    const responseKey = `${offerKey}:response`;
    
    await redis.setEx(responseKey, 10, JSON.stringify({
      accepted: false,
      courierId,
      timestamp: Date.now()
    }));

    return true;
  }

  private static emitNewJobOffer(match: CourierMatch, request: DeliveryRequest, expiresInMs?: number): void {
    const fee = this.estimateRiderEarnings(request, match.distance);
    const weightKg = request.package.weight ?? 0;
    const distanceKm = Math.round((match.distance / 1000) * 10) / 10;

    const payload: NewJobOfferPayload = {
      type: 'new-job-offer',
      requestId: request.id,
      packageId: request.packageId,
      courierId: match.courier.id,
      fee,
      pickupAddress: request.pickupLocation.address,
      dropoffAddress: request.dropoffLocation.address,
      distanceMeters: Math.round(match.distance),
      distanceKm,
      etaSeconds: Math.round(match.eta),
      etaMinutes: Math.max(1, Math.round(match.eta / 60)),
      packageType: 'PARCEL',
      packageSize: weightKg <= 1 ? 'SMALL' : weightKg <= 5 ? 'MEDIUM' : 'LARGE',
      weightKg,
      vehicleType: match.courier.vehicleType,
      expiresAt: Date.now() + (expiresInMs ?? MATCHING_CONFIG.DISPATCH_TIMEOUT * 1000)
    };

    emitNewJobOffer(match.courier.id, payload);
  }

  /** Approximates the rider's share of the delivery fee, mirroring PricingService maths. */
  private static estimateRiderEarnings(request: DeliveryRequest, distanceMeters: number): number {
    const distanceKm = distanceMeters / 1000;
    const baseFee = 500;
    const distanceFee = distanceKm * 100;
    const weight = request.package.weight ?? 1;
    let weightMultiplier = 1;
    if (weight > 15) weightMultiplier = 1.5;
    else if (weight > 5) weightMultiplier = 1.25;

    const subtotal = (baseFee + distanceFee) * weightMultiplier;
    const riderEarnings = subtotal * (1 - config.financial.riderCommissionRate);
    return Math.round(riderEarnings);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}