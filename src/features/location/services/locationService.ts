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
   * Fast IP Geolocation fallback for desktop browsers / blocked permissions
   */
  async fetchIPLocation(): Promise<{ lat: number; lng: number; address: string }> {
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.latitude && data.longitude) {
          const city = data.city || data.region || 'Tanzania';
          const country = data.country || 'Tanzania';
          return {
            lat: data.latitude,
            lng: data.longitude,
            address: `${city}, ${country}`,
          };
        }
      }
    } catch (e) {
      // ignore
    }

    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          const city = data.city || data.region || 'Tanzania';
          const country = data.country_name || 'Tanzania';
          return {
            lat: data.latitude,
            lng: data.longitude,
            address: `${city}, ${country}`,
          };
        }
      }
    } catch (e) {
      // ignore
    }

    throw new Error('IP geolocation unavailable');
  }

  /**
   * Resilient user location detector catching exact GPS coordinates first
   */
  async detectUserLocation(): Promise<{ lat: number; lng: number; address: string }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        this.fetchIPLocation()
          .then(async (ipLoc) => {
            const address = await this.reverseGeocode(ipLoc.lat, ipLoc.lng);
            resolve({ lat: ipLoc.lat, lng: ipLoc.lng, address });
          })
          .catch(() => resolve({ lat: -6.1630, lng: 35.7516, address: 'Dodoma, Tanzania' }));
        return;
      }

      let resolved = false;

      // 1. Try High-Accuracy GPS first for exact position
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (resolved) return;
          resolved = true;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const address = await this.reverseGeocode(lat, lng);
          resolve({ lat, lng, address });
        },
        // 2. If high accuracy times out, try standard browser location
        () => {
          if (resolved) return;
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              if (resolved) return;
              resolved = true;
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              const address = await this.reverseGeocode(lat, lng);
              resolve({ lat, lng, address });
            },
            // 3. Fallback to IP geolocation if browser GPS fails/denied
            async () => {
              if (resolved) return;
              resolved = true;
              try {
                const ipLoc = await this.fetchIPLocation();
                const address = await this.reverseGeocode(ipLoc.lat, ipLoc.lng);
                resolve({ lat: ipLoc.lat, lng: ipLoc.lng, address });
              } catch (e) {
                resolve({ lat: -6.1630, lng: 35.7516, address: 'Dodoma, Tanzania' });
              }
            },
            { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

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
   * Uses Google Maps Geocoder if loaded, Nominatim, & BigDataCloud fallback.
   * NEVER returns raw numeric lat/lng strings!
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    // 1. Try Google Maps Geocoder if available on window
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results && response.results[0] && response.results[0].formatted_address) {
          const cleaned = response.results[0].formatted_address.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}(,\s*)?/i, '');
          if (cleaned.trim()) return cleaned.trim();
        }
      } catch (e) {
        console.warn('Google reverse geocode failed, trying OpenStreetMap:', e);
      }
    }

    // 2. Try OpenStreetMap Nominatim
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.address) {
          const addr = data.address;
          const road = addr.road || addr.street || addr.pedestrian || addr.residential || addr.suburb || addr.neighbourhood || addr.building || addr.amenity;
          const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district;
          const city = addr.city || addr.town || addr.municipality || addr.county || addr.state;
          const country = addr.country || 'Tanzania';

          const parts = [road, suburb, city, country].filter(Boolean);
          if (parts.length >= 2) {
            return parts.join(', ');
          }
        }

        if (data && data.display_name) {
          const addressParts = data.display_name.split(', ');
          if (addressParts.length > 3) {
            return addressParts.slice(0, 3).join(', ');
          }
          return data.display_name;
        }
      }
    } catch (error) {
      console.warn('Nominatim reverse geocode error:', error);
    }

    // 3. Try BigDataCloud Reverse Geocoding API (client free tier, HTTPS)
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      if (bdcRes.ok) {
        const bdcData = await bdcRes.json();
        const locality = bdcData.locality || bdcData.city || bdcData.principalSubdivision;
        const country = bdcData.countryName || 'Tanzania';
        if (locality) {
          return `${locality}, ${country}`;
        }
      }
    } catch (e) {
      // ignore
    }

    // 4. Default friendly address placeholder (NEVER return raw lat/long numerical string)
    return 'Selected Location';
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
