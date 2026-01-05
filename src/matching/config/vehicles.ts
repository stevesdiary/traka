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
    maxDistance: 3000, // 3km hard limit
    maxWeight: 10,
    avgSpeed: 15,
    trafficSensitivity: 0.1
  },
  [VehicleType.MOTORCYCLE]: {
    maxDistance: 15000, // 15km
    maxWeight: 50,
    avgSpeed: 35,
    trafficSensitivity: 0.3
  },
  [VehicleType.CAR]: {
    maxDistance: 30000, // 30km 
    maxWeight: 100,
    avgSpeed: 40,
    trafficSensitivity: 0.4
  },
  [VehicleType.VAN]: {
    maxDistance: 50000, // 50km
    maxWeight: 200,
    avgSpeed: 25,
    trafficSensitivity: 0.5
  }
};

export const MATCHING_CONFIG = {
  COURIER_TTL: 15, // seconds
  DISPATCH_TIMEOUT: 6, // seconds
  MAX_DISPATCH_ATTEMPTS: 3,
  GEO_QUERY_LIMIT: 20,
  COLD_START_ACCEPTANCE_RATE: 0.85
};