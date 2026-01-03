import { VehicleType } from '../config/vehicles.js';

export interface CourierLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface CourierState {
  id: string;
  location: CourierLocation;
  vehicleType: VehicleType;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  currentLoad: {
    weight: number;
    volume: number;
  };
  acceptanceRate: number;
  idleTime: number; // seconds since last delivery
  lastSeen: number;
}

export interface DeliveryRequest {
  id: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  dropoffLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  package: {
    weight: number;
    volume: number;
    fragile: boolean;
  };
  requiredVehicleType?: VehicleType;
  createdAt: number;
}