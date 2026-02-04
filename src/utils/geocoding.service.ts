import { redis } from '../config/database.js';
import crypto from 'crypto';
import { SSRFProtection } from './ssrf-protection.js';

type GeocodingProvider = 'nominatim' | 'photon';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  formatted_address: string;
}

export class GeocodingService {
  private nominatimBaseUrl = this.normalizeBaseUrl(
    process.env.GEOCODING_NOMINATIM_URL || 'https://nominatim.openstreetmap.org'
  );
  private photonBaseUrl = this.normalizeBaseUrl(
    process.env.GEOCODING_PHOTON_URL || 'https://photon.komoot.io'
  );
  private userAgent = process.env.GEOCODING_USER_AGENT || 'TRAKA-Logistics/1.0';
  private countryCode = (process.env.GEOCODING_COUNTRY_CODE || '').toLowerCase().trim();
  private CACHE_PREFIX = 'geocode:';
  private CACHE_TTL = 2592000; // 30 days
  private lastRequestTime = 0;
  private MIN_REQUEST_INTERVAL = 1000; // 1 second (Nominatim rate limit)
  private providers: GeocodingProvider[] = ['nominatim', 'photon'];
  private allowedDomains: string[] = [];

  constructor() {
    this.allowedDomains = this.getAllowedDomainsFromProviders();
  }

  private generateCacheKey(input: string): string {
    const hash = crypto.createHash('md5').update(input.toLowerCase().trim()).digest('hex');
    return `${this.CACHE_PREFIX}${hash}`;
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
  }

  private getAllowedDomainsFromProviders(): string[] {
    const allowed = new Set<string>();

    for (const baseUrl of [this.nominatimBaseUrl, this.photonBaseUrl]) {
      try {
        const hostname = new URL(baseUrl).hostname.toLowerCase();
        if (hostname) {
          allowed.add(hostname);
        }
      } catch (error) {
        console.warn(`Invalid geocoding provider URL: ${baseUrl}`, error);
      }
    }

    return Array.from(allowed);
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

  private async applyProviderRateLimit(provider: GeocodingProvider): Promise<void> {
    if (provider === 'nominatim') {
      await this.rateLimit();
    }
  }

  private getAddressValue(address: Record<string, any>, key: string): string {
    const value = address[key];
    return typeof value === 'string' ? value : '';
  }

  private parseNominatimResult(result: any, fallbackLat?: number, fallbackLon?: number): GeocodingResult | null {
    const latitude = Number.parseFloat(result?.lat ?? `${fallbackLat ?? ''}`);
    const longitude = Number.parseFloat(result?.lon ?? `${fallbackLon ?? ''}`);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const safeLatitude = Number(latitude);
    const safeLongitude = Number(longitude);

    const address = result?.address ?? {};
    const city =
      this.getAddressValue(address, 'city') ||
      this.getAddressValue(address, 'town') ||
      this.getAddressValue(address, 'village') ||
      this.getAddressValue(address, 'county');
    const state =
      this.getAddressValue(address, 'state') ||
      this.getAddressValue(address, 'state_district') ||
      this.getAddressValue(address, 'region');
    const country = this.getAddressValue(address, 'country') || 'Nigeria';
    const formattedAddress =
      typeof result?.display_name === 'string' && result.display_name.trim()
        ? result.display_name
        : [city, state, country].filter(Boolean).join(', ');

    return {
      latitude: safeLatitude,
      longitude: safeLongitude,
      city,
      state,
      country,
      formatted_address: formattedAddress
    };
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private parsePhotonResult(result: any, fallbackLat?: number, fallbackLon?: number): GeocodingResult | null {
    const features = Array.isArray(result?.features) ? result.features : [];
    if (features.length === 0) {
      return null;
    }

    const feature = features[0];
    const coordinates = feature?.geometry?.coordinates;
    const longitude =
      Array.isArray(coordinates) && coordinates.length > 0
        ? Number(coordinates[0])
        : fallbackLon;
    const latitude =
      Array.isArray(coordinates) && coordinates.length > 1
        ? Number(coordinates[1])
        : fallbackLat;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const safeLatitude = Number(latitude);
    const safeLongitude = Number(longitude);

    const properties = feature?.properties ?? {};
    const city =
      this.asString(properties.city) ||
      this.asString(properties.locality) ||
      this.asString(properties.district) ||
      this.asString(properties.name);
    const state = this.asString(properties.state) || this.asString(properties.region);
    const country = this.asString(properties.country) || 'Nigeria';
    const formattedAddress =
      this.asString(properties.name) ||
      this.asString(properties.street) ||
      [city, state, country].filter(Boolean).join(', ');

    return {
      latitude: safeLatitude,
      longitude: safeLongitude,
      city,
      state,
      country,
      formatted_address: formattedAddress
    };
  }

  private buildSearchUrl(provider: GeocodingProvider, address: string): string {
    if (provider === 'nominatim') {
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: '3',
        addressdetails: '1'
      });

      if (this.countryCode) {
        params.set('countrycodes', this.countryCode);
      }

      return `${this.nominatimBaseUrl}/search?${params.toString()}`;
    }

    const params = new URLSearchParams({
      q: address,
      limit: '3',
      lang: 'en'
    });

    return `${this.photonBaseUrl}/api?${params.toString()}`;
  }

  private buildReverseUrl(provider: GeocodingProvider, latitude: number, longitude: number): string {
    if (provider === 'nominatim') {
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1'
      });
      return `${this.nominatimBaseUrl}/reverse?${params.toString()}`;
    }

    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      limit: '1',
      lang: 'en'
    });
    return `${this.photonBaseUrl}/reverse?${params.toString()}`;
  }

  private async requestProvider(url: string): Promise<any> {
    SSRFProtection.sanitizeUrl(url, this.allowedDomains);

    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  private async writeToCache(cacheKey: string, result: GeocodingResult, label: string): Promise<void> {
    try {
      await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));
      console.log(`💾 ${label}`);
    } catch (error) {
      console.warn('Redis cache write failed:', error);
    }
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

    try {
      const providerErrors: string[] = [];

      for (const provider of this.providers) {
        try {
          await this.applyProviderRateLimit(provider);

          const url = this.buildSearchUrl(provider, address);
          const data = await this.requestProvider(url);
          const geocodedResult =
            provider === 'nominatim'
              ? this.parseNominatimResult(Array.isArray(data) ? data[0] : null)
              : this.parsePhotonResult(data);

          if (geocodedResult) {
            await this.writeToCache(cacheKey, geocodedResult, `Geocoding cached (${provider}): ${address}`);
            return geocodedResult;
          }

          providerErrors.push(`${provider}: no result`);
        } catch (providerError) {
          const message = providerError instanceof Error ? providerError.message : String(providerError);
          providerErrors.push(`${provider}: ${message}`);
          console.warn(`Geocoding provider failed (${provider}): ${message}`);
        }
      }

      throw new Error(`Address not found (${providerErrors.join(' | ')})`);
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

    try {
      const providerErrors: string[] = [];

      for (const provider of this.providers) {
        try {
          await this.applyProviderRateLimit(provider);

          const url = this.buildReverseUrl(provider, latitude, longitude);
          const data = await this.requestProvider(url);
          const geocodedResult =
            provider === 'nominatim'
              ? this.parseNominatimResult(data, latitude, longitude)
              : this.parsePhotonResult(data, latitude, longitude);

          if (geocodedResult) {
            await this.writeToCache(
              cacheKey,
              geocodedResult,
              `Reverse geocoding cached (${provider}): ${latitude},${longitude}`
            );
            return geocodedResult;
          }

          providerErrors.push(`${provider}: no result`);
        } catch (providerError) {
          const message = providerError instanceof Error ? providerError.message : String(providerError);
          providerErrors.push(`${provider}: ${message}`);
          console.warn(`Reverse geocoding provider failed (${provider}): ${message}`);
        }
      }

      throw new Error(`Location not found (${providerErrors.join(' | ')})`);
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
