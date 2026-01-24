import { redis } from '../config/database.js';
import crypto from 'crypto';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  formatted_address: string;
}

export class GeocodingService {
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private userAgent = 'TRAKA-Logistics/1.0';
  private CACHE_PREFIX = 'geocode:';
  private CACHE_TTL = 2592000; // 30 days
  private lastRequestTime = 0;
  private MIN_REQUEST_INTERVAL = 1000; // 1 second (Nominatim rate limit)

  private generateCacheKey(input: string): string {
    const hash = crypto.createHash('md5').update(input.toLowerCase().trim()).digest('hex');
    return `${this.CACHE_PREFIX}${hash}`;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  async geocodeAddress(address: string): Promise<GeocodingResult> {
    // Check cache first
    const cacheKey = this.generateCacheKey(address);
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`Geocoding cache hit: ${address}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache read failed:', error);
    }

    // Rate limit to respect Nominatim usage policy
    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.baseUrl}/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': this.userAgent
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error('Address not found');
      }

      const result = data[0];
      
      const geocodedResult: GeocodingResult = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        city: result.address.city || result.address.town || result.address.village || '',
        state: result.address.state || '',
        country: result.address.country || 'Nigeria',
        formatted_address: result.display_name
      };

      // Cache the result
      try {
        await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(geocodedResult));
        console.log(`💾 Geocoding cached: ${address}`);
      } catch (error) {
        console.warn('Redis cache write failed:', error);
      }

      return geocodedResult;
    } catch (error: any) {
      console.error('Geocoding error:', error);
      throw new Error(`Failed to geocode address: ${error.message}`);
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult> {
    // Check cache first
    const cacheKey = this.generateCacheKey(`${latitude},${longitude}`);
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`✅ Reverse geocoding cache hit: ${latitude},${longitude}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache read failed:', error);
    }

    // Rate limit to respect Nominatim usage policy
    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.baseUrl}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
        {
          headers: {
            'User-Agent': this.userAgent
          }
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding request failed');
      }

      const result = await response.json();

      const geocodedResult: GeocodingResult = {
        latitude,
        longitude,
        city: result.address.city || result.address.town || result.address.village || '',
        state: result.address.state || '',
        country: result.address.country || 'Nigeria',
        formatted_address: result.display_name
      };

      // Cache the result
      try {
        await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(geocodedResult));
        console.log(`💾 Reverse geocoding cached: ${latitude},${longitude}`);
      } catch (error) {
        console.warn('Redis cache write failed:', error);
      }

      return geocodedResult;
    } catch (error: any) {
      console.error('Reverse geocoding error:', error);
      throw new Error(`Failed to reverse geocode: ${error.message}`);
    }
  }

  async validateServiceArea(address: string, city: string, state: string): Promise<boolean> {
    try {
      const geocoded = await this.geocodeAddress(address);
      
      // Fuzzy match city and state
      const cityMatch = geocoded.city.toLowerCase().includes(city.toLowerCase()) ||
                       city.toLowerCase().includes(geocoded.city.toLowerCase());
      
      const stateMatch = geocoded.state.toLowerCase().includes(state.toLowerCase()) ||
                        state.toLowerCase().includes(geocoded.state.toLowerCase());

      return cityMatch && stateMatch;
    } catch (error) {
      console.error('Service area validation error:', error);
      return false;
    }
  }
}
