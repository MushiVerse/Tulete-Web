import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';

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
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  ownerId: string;
  rating: number;
  reviewCount: number;
  category: 'Food' | 'Laundry' | 'Electrical' | 'Beauty' | 'Rides';
  isOpen: boolean;
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
    super('stores');
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
   * Nairobi-based mock stores database for high-fidelity offline/caching fallback
   */
  getMockStores(): Store[] {
    return [
      {
        id: 'store_mama_safi',
        name: 'Mama Safi Laundry & Dryclean',
        description: 'Premium eco-friendly dry cleaning and express folding services in the heart of Kilimani.',
        logoUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebd01?w=120',
        bannerUrl: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=800',
        ownerId: 'owner_1',
        rating: 4.8,
        reviewCount: 142,
        category: 'Laundry',
        isOpen: true,
        address: 'Wood Avenue, Kilimani, Nairobi',
        phone: '+254711222333',
        whatsapp: '+254711222333',
        isVerified: true,
        gallery: [
          'https://images.unsplash.com/photo-1521566652839-697aa473761a?w=400',
          'https://images.unsplash.com/photo-1545173168-9f1947eebd01?w=400',
          'https://images.unsplash.com/photo-1489274495757-95c7c837b101?w=400'
        ],
        promotions: [
          { code: 'MAMACLEAN10', description: '10% off laundry services over 1000 KES', discountValue: '10%' },
          { code: 'FREESHIP', description: 'Free pickup/delivery on your first order', discountValue: 'Free Delivery' }
        ],
        hours: [
          { days: 'Monday - Friday', hours: '7:30 AM - 7:30 PM' },
          { days: 'Saturday', hours: '8:00 AM - 6:00 PM' },
          { days: 'Sunday & Holidays', hours: '10:00 AM - 4:00 PM' }
        ],
        location: { lat: -1.2915, lng: 36.7900 },
        reviews: [
          { id: 'rev_1', userName: 'Amina Omondi', rating: 5, comment: 'Extremely professional and quick! My suits arrived immaculate.', date: 'May 28, 2026' },
          { id: 'rev_2', userName: 'John Kiprop', rating: 4, comment: 'Good quality folding, though delivery had a minor delay due to rain.', date: 'May 24, 2026' }
        ]
      },
      {
        id: 'store_kibanda_delight',
        name: 'Kibanda Delight Fast Food',
        description: 'Authentic local Kenyan delicacies, fresh Ugali, Nyama Choma, and express Chapati meals.',
        logoUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120',
        bannerUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        ownerId: 'owner_2',
        rating: 4.6,
        reviewCount: 98,
        category: 'Food',
        isOpen: true,
        address: 'Ring Road, Westlands, Nairobi',
        phone: '+254722333444',
        whatsapp: '+254722333444',
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
        location: { lat: -1.2640, lng: 36.8040 },
        reviews: [
          { id: 'rev_3', userName: 'Wanjiku Mwangi', rating: 5, comment: 'The best Choma in Westlands! Tastes completely authentic.', date: 'May 29, 2026' }
        ]
      },
      {
        id: 'store_fundi_power',
        name: 'Fundi Power Electricals',
        description: 'Certified residential electrical repairs, wiring maintenance, solar panels, and safety checks.',
        logoUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=120',
        bannerUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
        ownerId: 'owner_3',
        rating: 4.9,
        reviewCount: 65,
        category: 'Electrical',
        isOpen: true,
        address: 'Kenyatta Avenue, Nairobi CBD',
        phone: '+254733444555',
        whatsapp: '+254733444555',
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
        location: { lat: -1.2825, lng: 36.8190 },
        reviews: [
          { id: 'rev_4', userName: 'David Ndolo', rating: 5, comment: 'Extremely polite technician. Fixed my breaker issue in 20 minutes.', date: 'May 20, 2026' }
        ]
      },
      {
        id: 'store_glam_salon',
        name: 'Glam Beauty Bar & Salon',
        description: 'High-end hair braiding, gel manicures, natural facials, and premium salon pampering.',
        logoUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=120',
        bannerUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
        ownerId: 'owner_4',
        rating: 4.7,
        reviewCount: 114,
        category: 'Beauty',
        isOpen: false, // Closed for demo styling
        address: 'Argwings Kodhek Rd, Hurlingham, Nairobi',
        phone: '+254744555666',
        whatsapp: '+254744555666',
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
        location: { lat: -1.2950, lng: 36.7990 },
        reviews: [
          { id: 'rev_5', userName: 'Mercy Chelagat', rating: 4.5, comment: 'Loved my micro-braids! Very neat. Docked half a star as the place was packed.', date: 'May 27, 2026' }
        ]
      }
    ];
  }
}

export const storeService = new StoreService();
