import { ServiceAreaModel } from './service-area.model.js';
import { redis } from '../config/database.js';

export class ServiceAreaService {
  private CACHE_KEY = 'service_areas:active';
  private CACHE_TTL = 3600; // 1 hour

  async getActiveCities() {
    try {
      const cached = await redis.get(this.CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }

      const areas = await ServiceAreaModel.findAll({
        where: { is_active: true },
        attributes: ['id', 'city', 'state', 'country']
      });

      await redis.setEx(this.CACHE_KEY, this.CACHE_TTL, JSON.stringify(areas));
      return areas;
    } catch (error) {
      console.error('Error fetching active cities:', error);
      throw error;
    }
  }

  async checkCoverage(city: string, state: string): Promise<{ covered: boolean; city?: string }> {
    const serviceArea = await ServiceAreaModel.findOne({
      where: { 
        city: city,
        state: state,
        is_active: true 
      }
    });

    if (serviceArea) {
      return { covered: true, city: serviceArea.city };
    }

    return { covered: false };
  }

  async addServiceArea(data: {
    city: string;
    state: string;
    country: string;
  }) {
    const area = await ServiceAreaModel.create(data);
    await redis.del(this.CACHE_KEY);
    return area;
  }

  async invalidateCache() {
    await redis.del(this.CACHE_KEY);
  }
}
