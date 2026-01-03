import { VehicleType, VEHICLE_PROFILES } from '../config/vehicles.js';

export class ETACalculator {
  // Simple distance calculation using Haversine formula
  static calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static calculatePickupETA(
    courierLat: number, courierLng: number,
    pickupLat: number, pickupLng: number,
    vehicleType: VehicleType
  ): number {
    const distance = this.calculateDistance(courierLat, courierLng, pickupLat, pickupLng);
    const profile = VEHICLE_PROFILES[vehicleType];
    const trafficMultiplier = this.getTrafficMultiplier();
    
    // ETA in seconds
    const baseTime = (distance / 1000) / profile.avgSpeed * 3600;
    return baseTime * (1 + profile.trafficSensitivity * trafficMultiplier);
  }

  static calculateDeliveryETA(
    pickupLat: number, pickupLng: number,
    dropoffLat: number, dropoffLng: number,
    vehicleType: VehicleType
  ): number {
    const distance = this.calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const profile = VEHICLE_PROFILES[vehicleType];
    const trafficMultiplier = this.getTrafficMultiplier();
    
    const baseTime = (distance / 1000) / profile.avgSpeed * 3600;
    return baseTime * (1 + profile.trafficSensitivity * trafficMultiplier);
  }

  static calculateTotalETA(
    courierLat: number, courierLng: number,
    pickupLat: number, pickupLng: number,
    dropoffLat: number, dropoffLng: number,
    vehicleType: VehicleType
  ): number {
    const pickupETA = this.calculatePickupETA(courierLat, courierLng, pickupLat, pickupLng, vehicleType);
    const deliveryETA = this.calculateDeliveryETA(pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType);
    
    return pickupETA + deliveryETA;
  }

  private static getTrafficMultiplier(): number {
    const hour = new Date().getHours();
    
    // Simple traffic model - peak hours have higher multiplier
    if (hour >= 7 && hour <= 9) return 0.4; // Morning rush
    if (hour >= 17 && hour <= 19) return 0.5; // Evening rush
    if (hour >= 12 && hour <= 14) return 0.2; // Lunch time
    
    return 0.1; // Off-peak
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}