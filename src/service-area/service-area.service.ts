import { ServiceAreaModel } from './service-area.model.js';
import { redis } from '../config/database.js';
import logger from '../utils/logger.js';

export interface CheckCoverageInput {
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}

export class ServiceAreaService {
  private CACHE_KEY = 'service_areas:active';
  private CACHE_TTL = 3600; // 1 hour

  async getActiveCities() {
    try {
      const cached = await redis.get(this.CACHE_KEY);
      if (cached) {
        return typeof cached === 'string' ? JSON.parse(cached) : cached as any;
      }

      const areas = await ServiceAreaModel.findAll({
        where: { is_active: true },
        attributes: ['id', 'city', 'state', 'country']
      });

      await redis.setEx(this.CACHE_KEY, this.CACHE_TTL, JSON.stringify(areas));
      return areas;
    } catch (error) {
      logger.error('Error fetching active cities:', error);
      throw error;
    }
  }

  async checkCoverage(input: CheckCoverageInput): Promise<{ covered: boolean; city?: string }> {
    const hasCoordinates =
      typeof input.latitude === 'number' && Number.isFinite(input.latitude) &&
      typeof input.longitude === 'number' && Number.isFinite(input.longitude);

    if (hasCoordinates) {
      const geoMatch = await this.checkCoverageByCoordinates(input.latitude!, input.longitude!);
      if (geoMatch) return geoMatch;
    }

    if (input.city?.trim() && input.state?.trim()) {
      const stringMatch = await this.checkCoverageByCityState(input.city, input.state);
      if (stringMatch.covered) return stringMatch;
    }

    return { covered: false };
  }

  private async checkCoverageByCoordinates(
    latitude: number,
    longitude: number
  ): Promise<{ covered: boolean; city?: string } | null> {
    const areas = await ServiceAreaModel.findAll({ where: { is_active: true } });

    const geoCodedAreas = areas.filter(area => {
      const areaLat = Number(area.latitude);
      const areaLng = Number(area.longitude);
      const areaRadius = Number(area.radius_km);
      return Number.isFinite(areaLat) && Number.isFinite(areaLng) && Number.isFinite(areaRadius);
    });

    // Legacy data without coordinates — fall back to city/state matching
    if (geoCodedAreas.length === 0) return null;

    let nearest: ServiceAreaModel | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const area of geoCodedAreas) {
      const distance = this.distanceKm(
        latitude,
        longitude,
        Number(area.latitude),
        Number(area.longitude)
      );
      if (distance < nearestDistance) {
        nearest = area;
        nearestDistance = distance;
      }
    }

    if (nearest && nearestDistance <= Number(nearest.radius_km)) {
      return { covered: true, city: nearest.city };
    }

    return null;
  }

  private async checkCoverageByCityState(
    city: string,
    state: string
  ): Promise<{ covered: boolean; city?: string }> {
    // Try exact match first
    const exactMatch = await ServiceAreaModel.findOne({
      where: {
        city: city,
        state: state,
        is_active: true
      }
    });

    if (exactMatch) {
      return { covered: true, city: exactMatch.city };
    }

    // Fallback: case-insensitive partial match on city OR state
    const allAreas = await ServiceAreaModel.findAll({ where: { is_active: true } });
    const normalizedCity = city.toLowerCase().trim();
    const normalizedState = state.toLowerCase().trim();

    const match = allAreas.find(area => {
      const areaCity = (area.city ?? '').toLowerCase();
      const areaState = (area.state ?? '').toLowerCase();
      if (!areaCity || !areaState) return false;
      return (
        (normalizedCity && (normalizedCity.includes(areaCity) || areaCity.includes(normalizedCity))) ||
        (normalizedState && (normalizedState === areaState || normalizedState.includes(areaState) || areaState.includes(normalizedState)))
      );
    });

    if (match) {
      return { covered: true, city: match.city };
    }

    return { covered: false };
  }

  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  async addServiceArea(data: {
    city: string;
    state: string;
    country: string;
    latitude?: number;
    longitude?: number;
    radius_km?: number;
  }) {
    const area = await ServiceAreaModel.create(data);
    await redis.del(this.CACHE_KEY);
    return area;
  }

  async invalidateCache() {
    await redis.del(this.CACHE_KEY);
  }
}
