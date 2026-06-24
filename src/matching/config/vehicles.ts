export enum VehicleType {
  BICYCLE = 'BICYCLE',
  MOTORCYCLE = 'MOTORCYCLE',
  CAR = 'CAR',
  VAN = 'VAN'
}

export interface VehicleProfile {
  maxDistance: number; // meters
  maxWeight: number; // kg
  avgSpeed: number; // km/h
  trafficSensitivity: number; // 0-1 multiplier
}

export const VEHICLE_PROFILES: Record<VehicleType, VehicleProfile> = {
  [VehicleType.BICYCLE]: {
    maxDistance: 1500, // 1.5km
    maxWeight: 10,
    avgSpeed: 15,
    trafficSensitivity: 0.1
  },
  [VehicleType.MOTORCYCLE]: {
    maxDistance: 3000, // 3km
    maxWeight: 40,
    avgSpeed: 35,
    trafficSensitivity: 0.3
  },
  [VehicleType.CAR]: {
    maxDistance: 5000, // 5km
    maxWeight: 100,
    avgSpeed: 40,
    trafficSensitivity: 0.4
  },
  [VehicleType.VAN]: {
    maxDistance: 7000, // 7km
    maxWeight: 200,
    avgSpeed: 25,
    trafficSensitivity: 0.5
  }
};

export const MATCHING_CONFIG = {
  COURIER_TTL: 120, // seconds — rider considered online if seen within 2 minutes
  DISPATCH_TIMEOUT: 30, // seconds per courier offer
  MAX_DISPATCH_ATTEMPTS: 3,
  GEO_QUERY_LIMIT: 20,
  COLD_START_ACCEPTANCE_RATE: 0.85
};