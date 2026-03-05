import { redis } from '../../config/database.js';
import { CourierState, CourierLocation } from '../models/CourierState.js';
import { VehicleType, MATCHING_CONFIG } from '../config/vehicles.js';

export class CourierPresenceService {
  private static readonly COURIER_KEY_PREFIX = 'courier:';
  private static readonly LOCATION_KEY_PREFIX = 'location:';

  static async updateCourierLocation(
    courierId: string,
    location: CourierLocation,
    vehicleType?: VehicleType
  ): Promise<void> {
    const key = `${this.COURIER_KEY_PREFIX}${courierId}:state`;
    
    // Get existing state or create new
    const existingState = await this.getCourierState(courierId);
    const updatedState: CourierState = {
      ...existingState,
      id: courierId,
      location,
      vehicleType: vehicleType ?? existingState.vehicleType,
      lastSeen: Date.now()
    };

    // Store with TTL
    await redis.setEx(key, MATCHING_CONFIG.COURIER_TTL, JSON.stringify(updatedState));
  }

  static async getCourierState(courierId: string): Promise<CourierState> {
    const key = `${this.COURIER_KEY_PREFIX}${courierId}:state`;
    const state = await redis.get(key);
    
    if (!state) {
      // Return default state for new courier
      return {
        id: courierId,
        location: { lat: 0, lng: 0, timestamp: 0 },
        vehicleType: VehicleType.MOTORCYCLE,
        status: 'OFFLINE',
        currentLoad: { weight: 0, volume: 0 },
        acceptanceRate: MATCHING_CONFIG.COLD_START_ACCEPTANCE_RATE,
        idleTime: 0,
        lastSeen: Date.now()
      };
    }
    
    return JSON.parse(state);
  }

  static async updateCourierStatus(
    courierId: string, 
    status: 'AVAILABLE' | 'BUSY' | 'OFFLINE',
    vehicleType?: VehicleType
  ): Promise<void> {
    const state = await this.getCourierState(courierId);
    state.status = status;
    state.vehicleType = vehicleType ?? state.vehicleType;
    state.lastSeen = Date.now();
    
    const key = `${this.COURIER_KEY_PREFIX}${courierId}:state`;
    await redis.setEx(key, MATCHING_CONFIG.COURIER_TTL, JSON.stringify(state));
  }

  static async getAvailableCouriers(): Promise<CourierState[]> {
    // Note: Upstash Redis REST API doesn't support KEYS command efficiently
    // In production, maintain a separate set of available courier IDs
    // For now, return empty array - implement proper tracking in future
    return [];
  }

  static async removeCourier(courierId: string): Promise<void> {
    const stateKey = `${this.COURIER_KEY_PREFIX}${courierId}:state`;
    const locationKey = `${this.LOCATION_KEY_PREFIX}${courierId}`;
    
    await redis.del(stateKey);
    await redis.del(locationKey);
  }
}
