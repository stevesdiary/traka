import { redis } from '../../config/database.js';
import { DeliveryRequest, CourierState } from '../models/CourierState.js';
import { MatchingEngine, CourierMatch } from './MatchingEngine.js';
import { MATCHING_CONFIG } from '../config/vehicles.js';
import { DispatchTimeoutService } from './DispatchTimeoutService.js';

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
    const lockAcquired = await redis.set(lockKey, '1', {
      NX: true,
      EX: 60 // 1 minute lock
    });

    if (!lockAcquired) {
      return {
        success: false,
        attempts: 0,
        message: 'Delivery already being processed'
      };
    }

    // Start tracking dispatch attempt with 10-minute timeout
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

    // In a real implementation, this would trigger a push notification
    // or WebSocket message to the courier
    console.log(`Offering delivery ${request.id} to courier ${match.courier.id}`);

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
        const { accepted } = JSON.parse(response);
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
      if (match.courier.vehicleType === 'BICYCLE' && match.distance > 3000) {
        return false;
      }
      return true;
    });

    if (eligibleMatches.length === 0) {
      return { success: false };
    }

    // Create broadcast offers
    const broadcastKey = `broadcast:${request.id}`;
    const offers = eligibleMatches.map(match => ({
      courierId: match.courier.id,
      eta: match.eta,
      score: match.score
    }));

    await redis.setEx(broadcastKey, 30, JSON.stringify({
      requestId: request.id,
      offers,
      timestamp: Date.now()
    }));

    // In production, send push notifications to all eligible couriers
    console.log(`Broadcasting delivery ${request.id} to ${offers.length} couriers`);

    // Wait for first acceptance (simplified - in production use pub/sub)
    const responseKey = `${broadcastKey}:response`;
    
    for (let i = 0; i < 10; i++) { // 10 second timeout for broadcast
      const response = await redis.get(responseKey);
      
      if (response) {
        const { courierId } = JSON.parse(response);
        const assignedCourier = eligibleMatches.find(m => m.courier.id === courierId)?.courier;
        
        await redis.del(broadcastKey);
        await redis.del(responseKey);
        
        return {
          success: true,
          assignedCourier
        };
      }
      
      await this.sleep(1000);
    }

    await redis.del(broadcastKey);
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

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}