import { redis } from '../../config/database.js';
import { CourierState, CourierLocation } from '../models/CourierState.js';
import { VehicleType, MATCHING_CONFIG } from '../config/vehicles.js';

export class CourierPresenceService {
  private static readonly COURIER_KEY_PREFIX = 'courier:';
  private static readonly LOCATION_KEY_PREFIX = 'location:';

  static async updateCourierLocation(courierId: string, location: CourierLocation): Promise<void> {
    const key = `${this.COURIER_KEY_PREFIX}${courierId}:state`;
    
    // Get existing state or create new
    const existingState = await this.getCourierState(courierId);
    const updatedState: CourierState = {
      ...existingState,
      id: courierId,
      location,
      lastSeen: Date.now()
    };

    // Store with TTL
    await redis.setEx(key, MATCHING_CONFIG.COURIER_TTL, JSON.stringify(updatedState));
    
    // Store location separately for geo queries
    const locationKey = `${this.LOCATION_KEY_PREFIX}${courierId}`;
    await redis.geoAdd(locationKey, {
      longitude: location.lng,
      latitude: location.lat,
      member: courierId
    });
    await redis.expire(locationKey, MATCHING_CONFIG.COURIER_TTL);
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
        status: 'AVAILABLE',
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
    status: 'AVAILABLE' | 'BUSY' | 'OFFLINE'
  ): Promise<void> {
    const state = await this.getCourierState(courierId);
    state.status = status;
    state.lastSeen = Date.now();
    
    const key = `${this.COURIER_KEY_PREFIX}${courierId}:state`;
    await redis.setEx(key, MATCHING_CONFIG.COURIER_TTL, JSON.stringify(state));
  }

  static async getAvailableCouriers(): Promise<CourierState[]> {
    const pattern = `${this.COURIER_KEY_PREFIX}*:state`;
    const keys = await redis.keys(pattern);
    
    const couriers: CourierState[] = [];
    for (const key of keys) {
      const state = await redis.get(key);
      if (state) {
        const courier = JSON.parse(state);
        if (courier.status === 'AVAILABLE') {
          couriers.push(courier);
        }
      }
    }
    
    return couriers;
  }

  static async removeCourier(courierId: string): Promise<void> {
    const stateKey = `${this.COURIER_KEY_PREFIX}${courierId}:state`;
    const locationKey = `${this.LOCATION_KEY_PREFIX}${courierId}`;
    
    await redis.del(stateKey);
    await redis.del(locationKey);
  }
}