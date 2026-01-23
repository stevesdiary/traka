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

  async geocodeAddress(address: string): Promise<GeocodingResult> {
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
      
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        city: result.address.city || result.address.town || result.address.village || '',
        state: result.address.state || '',
        country: result.address.country || 'Nigeria',
        formatted_address: result.display_name
      };
    } catch (error: any) {
      console.error('Geocoding error:', error);
      throw new Error(`Failed to geocode address: ${error.message}`);
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult> {
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

      return {
        latitude,
        longitude,
        city: result.address.city || result.address.town || result.address.village || '',
        state: result.address.state || '',
        country: result.address.country || 'Nigeria',
        formatted_address: result.display_name
      };
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
