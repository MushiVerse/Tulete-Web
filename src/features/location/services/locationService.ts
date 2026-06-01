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
   * Reverse Geocoding helper (Coordinates -> Human Address string)
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    // Standard mock database lookup based on Nairobi coordinates
    if (Math.abs(lat - (-1.2921)) < 0.01 && Math.abs(lng - 36.8219) < 0.01) {
      return 'Kenyatta Avenue, Nairobi Central, Kenya';
    }
    if (Math.abs(lat - (-1.3033)) < 0.01 && Math.abs(lng - 36.7900) < 0.01) {
      return 'Ngong Road, Adams Arcade, Nairobi, Kenya';
    }
    if (Math.abs(lat - (-1.2915)) < 0.01 && Math.abs(lng - 36.7900) < 0.01) {
      return 'Wood Avenue, Kilimani, Nairobi, Kenya';
    }

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}, Kilimani, Nairobi, Kenya`;
  }

  /**
   * Forward Geocoding helper (Address string -> Coordinates)
   */
  async forwardGeocode(address: string): Promise<GeoLocation> {
    const clean = address.toLowerCase();
    if (clean.includes('ngong')) {
      return { lat: -1.3033, lng: 36.7900 };
    }
    if (clean.includes('kilimani') || clean.includes('wood')) {
      return { lat: -1.2915, lng: 36.7900 };
    }
    if (clean.includes('kenyatta') || clean.includes('cbd')) {
      return { lat: -1.2921, lng: 36.8219 };
    }

    // Default to center of Kilimani hub
    return { lat: -1.2920, lng: 36.7910 };
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
    // Assume average transit speed of 30km/h in Nairobi traffic
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
        title: 'Home (Apartment)',
        addressLine: 'Suite 4B, Wood Avenue Plaza, Wood Avenue',
        city: 'Kilimani, Nairobi',
        location: { lat: -1.2915, lng: 36.7900 },
        isDefault: true,
      },
      {
        id: 'addr_office',
        userId,
        title: 'Safaricom House',
        addressLine: 'HQ2, Waiyaki Way, Westlands',
        city: 'Nairobi',
        location: { lat: -1.2644, lng: 36.8044 },
        isDefault: false,
      }
    ];
  }
}

export const locationService = new LocationService();
