import { redis } from '../../config/database.js';
import { CourierState, CourierLocation } from '../models/CourierState.js';
import { VehicleType, MATCHING_CONFIG } from '../config/vehicles.js';

const COURIER_KEY_PREFIX = 'courier:';
const AVAILABLE_SET_KEY = 'couriers:available';

export class CourierPresenceService {
  static async updateCourierLocation(
    courierId: string,
    location: CourierLocation,
    vehicleType?: VehicleType
  ): Promise<void> {
    const key = `${COURIER_KEY_PREFIX}${courierId}:state`;
    const existing = await this.getCourierState(courierId);
    const updated: CourierState = {
      ...existing,
      id: courierId,
      location,
      vehicleType: vehicleType ?? existing.vehicleType,
      lastSeen: Date.now()
    };
    await redis.setEx(key, MATCHING_CONFIG.COURIER_TTL, JSON.stringify(updated));

    if (updated.status === 'AVAILABLE') {
      await redis.sAdd(AVAILABLE_SET_KEY, courierId);
    }
  }

  static async updateCourierStatus(
    courierId: string,
    status: 'AVAILABLE' | 'BUSY' | 'OFFLINE',
    vehicleType?: VehicleType
  ): Promise<void> {
    const key = `${COURIER_KEY_PREFIX}${courierId}:state`;
    const state = await this.getCourierState(courierId);
    state.status = status;
    state.vehicleType = vehicleType ?? state.vehicleType;
    state.lastSeen = Date.now();
    await redis.setEx(key, MATCHING_CONFIG.COURIER_TTL, JSON.stringify(state));

    if (status === 'AVAILABLE') {
      await redis.sAdd(AVAILABLE_SET_KEY, courierId);
    } else {
      await redis.sRem(AVAILABLE_SET_KEY, courierId);
    }
  }

  static async getCourierState(courierId: string): Promise<CourierState> {
    const key = `${COURIER_KEY_PREFIX}${courierId}:state`;
    const raw = await redis.get(key);
    if (!raw) {
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
    return JSON.parse(raw);
  }

  static async getAvailableCouriers(): Promise<CourierState[]> {
    const ids = await redis.sMembers(AVAILABLE_SET_KEY);
    if (ids.length === 0) return [];

    const couriers: CourierState[] = [];
    const now = Date.now();

    for (const id of ids) {
      const raw = await redis.get(`${COURIER_KEY_PREFIX}${id}:state`);
      if (!raw) {
        await redis.sRem(AVAILABLE_SET_KEY, id);
        continue;
      }
      const state: CourierState = JSON.parse(raw);
      if (now - state.lastSeen > MATCHING_CONFIG.COURIER_TTL * 1000) {
        await redis.sRem(AVAILABLE_SET_KEY, id);
        continue;
      }
      if (state.status === 'AVAILABLE') {
        couriers.push(state);
      }
    }
    return couriers;
  }

  static async removeCourier(courierId: string): Promise<void> {
    await redis.del(`${COURIER_KEY_PREFIX}${courierId}:state`);
    await redis.sRem(AVAILABLE_SET_KEY, courierId);
  }
}
