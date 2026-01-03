import { CourierState, DeliveryRequest } from '../models/CourierState.js';
import { VehicleType, VEHICLE_PROFILES, MATCHING_CONFIG } from '../config/vehicles.js';
import { CourierPresenceService } from './CourierPresenceService.js';
import { ETACalculator } from './ETACalculator.js';

export interface CourierMatch {
  courier: CourierState;
  eta: number;
  distance: number;
  score: number;
}

export class MatchingEngine {
  static async findMatchingCouriers(request: DeliveryRequest): Promise<CourierMatch[]> {
    const availableCouriers = await CourierPresenceService.getAvailableCouriers();
    
    // Filter by vehicle constraints
    const eligibleCouriers = this.filterByVehicleConstraints(availableCouriers, request);
    
    // Calculate ETA and score for each courier
    const matches: CourierMatch[] = [];
    
    for (const courier of eligibleCouriers) {
      const distance = ETACalculator.calculateDistance(
        courier.location.lat, courier.location.lng,
        request.pickupLocation.lat, request.pickupLocation.lng
      );
      
      // Check distance constraint
      const profile = VEHICLE_PROFILES[courier.vehicleType];
      if (distance > profile.maxDistance) {
        continue;
      }
      
      const eta = ETACalculator.calculateTotalETA(
        courier.location.lat, courier.location.lng,
        request.pickupLocation.lat, request.pickupLocation.lng,
        request.dropoffLocation.lat, request.dropoffLocation.lng,
        courier.vehicleType
      );
      
      const score = this.calculateCourierScore(courier, eta, distance);
      
      matches.push({
        courier,
        eta,
        distance,
        score
      });
    }
    
    // Sort by score (higher is better) and limit results
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, MATCHING_CONFIG.GEO_QUERY_LIMIT);
  }

  private static filterByVehicleConstraints(
    couriers: CourierState[],
    request: DeliveryRequest
  ): CourierState[] {
    return couriers.filter(courier => {
      // Check if specific vehicle type is required
      if (request.requiredVehicleType && courier.vehicleType !== request.requiredVehicleType) {
        return false;
      }
      
      // Check weight capacity
      const profile = VEHICLE_PROFILES[courier.vehicleType];
      const availableWeight = profile.maxWeight - courier.currentLoad.weight;
      
      if (request.package.weight > availableWeight) {
        return false;
      }
      
      // Check if courier is truly available
      const timeSinceLastSeen = Date.now() - courier.lastSeen;
      if (timeSinceLastSeen > MATCHING_CONFIG.COURIER_TTL * 1000) {
        return false;
      }
      
      return true;
    });
  }

  private static calculateCourierScore(
    courier: CourierState,
    eta: number,
    distance: number
  ): number {
    // Weighted scoring: ETA (40%), Acceptance Rate (30%), Idle Time (30%)
    const etaScore = Math.max(0, 1 - (eta / 3600)); // Normalize to 1 hour max
    const acceptanceScore = courier.acceptanceRate;
    const idleScore = Math.min(1, courier.idleTime / 1800); // Normalize to 30 min max
    
    return (etaScore * 0.4) + (acceptanceScore * 0.3) + (idleScore * 0.3);
  }

  static async getBestMatch(request: DeliveryRequest): Promise<CourierMatch | null> {
    const matches = await this.findMatchingCouriers(request);
    return matches.length > 0 ? matches[0] : null;
  }

  static async handleBicycleConstraint(request: DeliveryRequest): Promise<{
    bicycleAvailable: boolean;
    alternatives: CourierMatch[];
    message?: string;
  }> {
    // Check if bicycle is specifically requested or optimal
    const bicycleCouriers = await this.findMatchingCouriers({
      ...request,
      requiredVehicleType: VehicleType.BICYCLE
    });

    if (bicycleCouriers.length > 0) {
      return {
        bicycleAvailable: true,
        alternatives: bicycleCouriers
      };
    }

    // No bicycle available - suggest alternatives
    const alternatives = await this.findMatchingCouriers(request);
    const motorcycleAlternatives = alternatives.filter(
      match => match.courier.vehicleType === VehicleType.MOTORCYCLE
    );

    return {
      bicycleAvailable: false,
      alternatives: motorcycleAlternatives,
      message: 'No bicycle courier available within 3km. Motorcycle alternatives shown with honest ETA.'
    };
  }
}