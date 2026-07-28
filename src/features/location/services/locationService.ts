export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface AddressItem {
  id: string;
  userId: string;
  title: string; // "Home", "Office", "Safaricom House"
  addressLine: string;
  city: string;
  location: GeoLocation;
  isDefault: boolean;
}

export interface TravelDetails {
  distanceKm: number;
  durationMins: number;
  routePath: GeoLocation[];
}

class LocationService {
  /**
   * Browser-native Geolocation fetcher
   */
  getCurrentPosition(): Promise<GeoLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  /**
   * Reverse Geocoding helper (Coordinates -> Human Address string) using OpenStreetMap Nominatim
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      if (data && data.display_name) {
        // Return a slightly simplified version of the address if possible
        const addressParts = data.display_name.split(', ');
        if (addressParts.length > 3) {
           return addressParts.slice(0, 3).join(', ');
        }
        return data.display_name;
      }
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback if API fails
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  /**
   * Forward Geocoding helper (Address string -> Coordinates) using OpenStreetMap Nominatim
   */
  async forwardGeocode(address: string): Promise<GeoLocation> {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      
      throw new Error('Address not found');
    } catch (error) {
      console.error('Forward geocoding error:', error);
      // Fallback to center of Dodoma hub if API fails or address not found
      return { lat: -6.1630, lng: 35.7516 };
    }
  }

  /**
   * Proximity distance finder using the Haversine formula (accurate spherical calculations)
   */
  calculateDistance(pos1: GeoLocation, pos2: GeoLocation): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(pos2.lat - pos1.lat);
    const dLng = this.deg2rad(pos2.lng - pos1.lng);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(pos1.lat)) * Math.cos(this.deg2rad(pos2.lat)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2)); // distance in km
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Returns travel distance, time estimates and vector coordinates along a route path
   */
  getTravelDirections(start: GeoLocation, end: GeoLocation): TravelDetails {
    const distanceKm = this.calculateDistance(start, end);
    // Assume average transit speed of 30km/h in traffic
    const durationMins = Math.round((distanceKm / 30) * 60) + 5; // transit mins + dispatch buffer

    // Generate interpolative vector coordinates representing intermediate street turns
    const steps = 6;
    const routePath: GeoLocation[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Introduce slight curves/wobble representing actual street bypasses rather than absolute straight lines
      const latWobble = Math.sin(t * Math.PI) * 0.0015;
      const lngWobble = Math.cos(t * Math.PI) * 0.0015;
      routePath.push({
        lat: start.lat + (end.lat - start.lat) * t + latWobble,
        lng: start.lng + (end.lng - start.lng) * t + lngWobble,
      });
    }

    return {
      distanceKm,
      durationMins,
      routePath,
    };
  }

  /**
   * Mock initial address book for offline-first cached layout testing
   */
  getMockAddresses(userId: string): AddressItem[] {
    return [
      {
        id: 'addr_home',
        userId,
        title: 'Home (Kisasa)',
        addressLine: 'Kisasa Housing Estate, Block B',
        city: 'Dodoma, Tanzania',
        location: { lat: -6.1630, lng: 35.7516 },
        isDefault: true,
      },
      {
        id: 'addr_office',
        userId,
        title: 'Central Office',
        addressLine: 'Central Dodoma Business Plaza',
        city: 'Dodoma, Tanzania',
        location: { lat: -6.1700, lng: 35.7400 },
        isDefault: false,
      }
    ];
  }
}

export const locationService = new LocationService();
