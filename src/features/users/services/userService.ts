import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';

export interface UserProfile extends BaseDocument {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  country?: string;
  joinedAt: Date;
  preferredLanguage: 'en' | 'sw';
  isVerified: boolean;
  totalOrders: number;
  totalSpent: number; // KES
}

export interface UserPreferences extends BaseDocument {
  userId: string;
  notifyOrders: boolean;
  notifyMessages: boolean;
  notifyPromotions: boolean;
  notifyDelivery: boolean;
  darkMode: boolean;
  currencyDisplay: 'KES' | 'USD';
  distanceUnit: 'km' | 'miles';
}

class UserService extends BaseFirestoreService<UserProfile> {
  constructor() {
    super('users');
  }

  getMockProfile(): UserProfile {
    return {
      id: 'user_current',
      uid: 'user_current',
      displayName: 'Alex Zalongwa',
      email: 'alex.zalongwa@tulete.co.ke',
      phone: '+254 712 345 678',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      bio: 'Freelance UX engineer based in Nairobi. Food, tech, and clean laundry enthusiast.',
      city: 'Nairobi',
      country: 'Kenya',
      joinedAt: new Date('2024-09-01'),
      preferredLanguage: 'en',
      isVerified: true,
      totalOrders: 14,
      totalSpent: 18450,
      createdAt: new Date('2024-09-01'),
      updatedAt: new Date(),
    };
  }

  getMockPreferences(): UserPreferences {
    return {
      id: 'prefs_user_current',
      userId: 'user_current',
      notifyOrders: true,
      notifyMessages: true,
      notifyPromotions: false,
      notifyDelivery: true,
      darkMode: false,
      currencyDisplay: 'KES',
      distanceUnit: 'km',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export const userService = new UserService();
