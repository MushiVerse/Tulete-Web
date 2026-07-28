import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';
import { APP_SETTINGS } from '@/core/config/settings';

export interface StoreReview {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
}

export interface StorePromotion {
  code: string;
  description: string;
  discountValue: string;
}

export interface StoreHours {
  days: string;
  hours: string;
}

export interface Store extends BaseDocument {
  store: string;
  description: string;
  imgURL: string;
  ownerId: string;
  rating: number;
  reviewCount: number;
  category: 'Food' | 'Laundry' | 'Electrical' | 'Beauty' | 'Rides';
  availability: boolean;
  address: string;
  phone?: string;
  whatsapp?: string;
  isVerified?: boolean;
  gallery?: string[];
  promotions?: StorePromotion[];
  hours?: StoreHours[];
  location?: {
    lat: number;
    lng: number;
  };
  reviews?: StoreReview[];
}

class StoreService extends BaseFirestoreService<Store> {
  constructor() {
    super('foodStores');
  }

  protected override parse(data: any): Store {
    let lat = -1.2894;
    let lng = 36.7909;
    
    if (data.location && typeof data.location === 'string') {
      const parts = data.location.split(',');
      if (parts.length === 2) {
        const parsedLat = parseFloat(parts[0].trim());
        const parsedLng = parseFloat(parts[1].trim());
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          lat = parsedLat;
          lng = parsedLng;
        }
      }
    } else if (data.location && typeof data.location.lat === 'number' && typeof data.location.lng === 'number') {
      lat = data.location.lat;
      lng = data.location.lng;
    } else if (data.location && typeof data.location.latitude === 'number' && typeof data.location.longitude === 'number') {
      lat = data.location.latitude;
      lng = data.location.longitude;
    }

    // Determine category safely
    let category: 'Food' | 'Laundry' | 'Electrical' | 'Beauty' | 'Rides' = 'Food';
    const rawCat = String(data.cat || data.category || '').toLowerCase();
    if (rawCat.includes('laund') || rawCat.includes('clean')) {
      category = 'Laundry';
    } else if (rawCat.includes('elect')) {
      category = 'Electrical';
    } else if (rawCat.includes('beaut') || rawCat.includes('salon')) {
      category = 'Beauty';
    } else if (rawCat.includes('ride') || rawCat.includes('deliver')) {
      category = 'Rides';
    }

    return {
      id: data.id,
      store: data.store || data.name || '',
      description: data.description || '',
      imgURL: data.imgURL || '',
      ownerId: data.ownerId || '',
      rating: data.rating !== undefined ? Number(data.rating) : 0,
      reviewCount: data.reviewCount !== undefined ? Number(data.reviewCount) : 0,
      category,
      availability: data.availability !== undefined ? !!data.availability : true,
      address: data.address || '',
      phone: data.phone,
      whatsapp: data.whatsapp,
      isVerified: data.isVerified !== undefined ? !!data.isVerified : true,
      gallery: data.gallery || [],
      promotions: data.promotions || [],
      hours: data.hours || [],
      location: { lat, lng },
      reviews: data.reviews || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  /**
   * Calculate distance between two GPS coordinates in kilometers (Haversine Formula)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Dodoma-based mock stores database for high-fidelity offline/caching fallback
   */
  getMockStores(): Store[] {
    return [
      {
        id: 'store_mama_safi',
        store: 'Mama Safi Laundry & Dryclean',
        description: 'Premium eco-friendly dry cleaning and express folding services in the heart of Dodoma.',
        imgURL: 'https://images.unsplash.com/photo-1545173168-9f1947eebd01?w=120',
        ownerId: 'owner_1',
        rating: 4.8,
        reviewCount: 142,
        category: 'Laundry',
        availability: true,
        address: 'Kisasa, Dodoma, Tanzania',
        phone: '+255757449734',
        whatsapp: '+255757449734',
        isVerified: true,
        gallery: [
          'https://images.unsplash.com/photo-1521566652839-697aa473761a?w=400',
          'https://images.unsplash.com/photo-1545173168-9f1947eebd01?w=400',
          'https://images.unsplash.com/photo-1489274495757-95c7c837b101?w=400'
        ],
        promotions: [
          { code: 'MAMACLEAN10', description: `10% off laundry services over 1000 ${APP_SETTINGS.currency}`, discountValue: '10%' },
          { code: 'FREESHIP', description: 'Free pickup/delivery on your first order', discountValue: 'Free Delivery' }
        ],
        hours: [
          { days: 'Monday - Friday', hours: '7:30 AM - 7:30 PM' },
          { days: 'Saturday', hours: '8:00 AM - 6:00 PM' },
          { days: 'Sunday & Holidays', hours: '10:00 AM - 4:00 PM' }
        ],
        location: { lat: -6.1630, lng: 35.7516 },
        reviews: [
          { id: 'rev_1', userName: 'Amina Omondi', rating: 5, comment: 'Extremely professional and quick! My suits arrived immaculate.', date: 'May 28, 2026' },
          { id: 'rev_2', userName: 'John Kiprop', rating: 4, comment: 'Good quality folding, though delivery had a minor delay due to rain.', date: 'May 24, 2026' }
        ]
      },
      {
        id: 'store_kibanda_delight',
        store: 'Kibanda Delight Fast Food',
        description: 'Authentic local delicacies, fresh Ugali, Nyama Choma, and express Chapati meals.',
        imgURL: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120',
        ownerId: 'owner_2',
        rating: 4.6,
        reviewCount: 98,
        category: 'Food',
        availability: true,
        address: 'Central Dodoma, Tanzania',
        phone: '+255757449734',
        whatsapp: '+255757449734',
        isVerified: true,
        gallery: [
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
          'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400'
        ],
        promotions: [
          { code: 'CHOMAFEST', description: 'Get free soda with 1kg Nyama Choma', discountValue: 'Free Item' }
        ],
        hours: [
          { days: 'Monday - Sunday', hours: '9:00 AM - 11:00 PM' }
        ],
        location: { lat: -6.1700, lng: 35.7400 },
        reviews: [
          { id: 'rev_3', userName: 'Wanjiku Mwangi', rating: 5, comment: 'The best Choma in town! Tastes completely authentic.', date: 'May 29, 2026' }
        ]
      },
      {
        id: 'store_fundi_power',
        store: 'Fundi Power Electricals',
        description: 'Certified residential electrical repairs, wiring maintenance, solar panels, and safety checks.',
        imgURL: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=120',
        ownerId: 'owner_3',
        rating: 4.9,
        reviewCount: 65,
        category: 'Electrical',
        availability: true,
        address: 'Makulu, Dodoma, Tanzania',
        phone: '+255757449734',
        whatsapp: '+255757449734',
        isVerified: true,
        gallery: [
          'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
          'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400'
        ],
        promotions: [
          { code: 'SOLARSAVE', description: '15% discount on residential solar diagnostics', discountValue: '15%' }
        ],
        hours: [
          { days: 'Monday - Saturday', hours: '8:00 AM - 6:00 PM' }
        ],
        location: { lat: -6.1800, lng: 35.7600 },
        reviews: [
          { id: 'rev_4', userName: 'David Ndolo', rating: 5, comment: 'Extremely polite technician. Fixed my breaker issue in 20 minutes.', date: 'May 20, 2026' }
        ]
      },
      {
        id: 'store_glam_salon',
        store: 'Glam Beauty Bar & Salon',
        description: 'High-end hair braiding, gel manicures, natural facials, and premium salon pampering.',
        imgURL: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=120',
        ownerId: 'owner_4',
        rating: 4.7,
        reviewCount: 114,
        category: 'Beauty',
        availability: false, // Closed for demo styling
        address: 'Area D, Dodoma, Tanzania',
        phone: '+255757449734',
        whatsapp: '+255757449734',
        isVerified: false,
        gallery: [
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400'
        ],
        promotions: [
          { code: 'GLAMSUNDAY', description: '20% off all styling on Sundays', discountValue: '20%' }
        ],
        hours: [
          { days: 'Monday - Saturday', hours: '9:00 AM - 8:00 PM' },
          { days: 'Sunday', hours: '10:00 AM - 5:00 PM' }
        ],
        location: { lat: -6.7800, lng: 39.2700 },
        reviews: [
          { id: 'rev_5', userName: 'Mercy Chelagat', rating: 4.5, comment: 'Loved my micro-braids! Very neat. Docked half a star as the place was packed.', date: 'May 27, 2026' }
        ]
      }
    ];
  }
}

export const storeService = new StoreService();
