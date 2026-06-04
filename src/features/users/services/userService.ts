import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';
import { storage, db } from '../../../core/firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { APP_SETTINGS } from '@/core/config/settings';

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
  totalSpent: number; // ${APP_SETTINGS.currency}
}

export interface UserPreferences extends BaseDocument {
  userId: string;
  notifyOrders: boolean;
  notifyMessages: boolean;
  notifyPromotions: boolean;
  notifyDelivery: boolean;
  darkMode: boolean;
  currencyDisplay: '${APP_SETTINGS.currency}' | 'USD';
  distanceUnit: 'km' | 'miles';
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
  notifyOrders: true,
  notifyMessages: true,
  notifyPromotions: false,
  notifyDelivery: true,
  darkMode: false,
  currencyDisplay: '${APP_SETTINGS.currency}',
  distanceUnit: 'km',
};

class UserService extends BaseFirestoreService<UserProfile> {
  constructor() {
    super('users');
  }

  async getUserProfile(email: string): Promise<UserProfile | null> {
    if (!email) return null;
    const emailKey = email.toLowerCase();
    const userRef = doc(db, 'users', emailKey, 'details', emailKey);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    
    return {
      id: data.uid || '',
      uid: data.uid || '',
      displayName: data.name || '',
      email: data.email || emailKey,
      phone: data.phone || '',
      avatarUrl: data.imgURL || '',
      joinedAt: data.signedUpOn ? new Date(data.signedUpOn) : new Date(),
      isVerified: true,
      preferredLanguage: 'en',
      totalOrders: 0,
      totalSpent: 0
    } as any;
  }

  async updateUserProfile(email: string, data: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'uid'>>): Promise<void> {
    if (!email) return;
    const emailKey = email.toLowerCase();
    const userRef = doc(db, 'users', emailKey, 'details', emailKey);
    
    const updates: any = {};
    if (data.displayName !== undefined) updates.name = data.displayName;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.avatarUrl !== undefined) updates.imgURL = data.avatarUrl;
    
    await updateDoc(userRef, updates);
  }

  async getUserPreferences(email: string): Promise<UserPreferences> {
    const emailKey = email.toLowerCase();
    const prefsRef = doc(db, 'users', emailKey, 'preferences', 'default');
    const prefsSnap = await getDoc(prefsRef);
    
    if (!prefsSnap.exists()) {
      // Create defaults
      const defaults = { ...DEFAULT_PREFERENCES, userId: emailKey };
      await setDoc(prefsRef, defaults);
      return { id: 'default', ...defaults, createdAt: new Date(), updatedAt: new Date() } as UserPreferences;
    }
    
    return { id: prefsSnap.id, ...prefsSnap.data() } as UserPreferences;
  }

  async updateUserPreferences(email: string, data: Partial<Omit<UserPreferences, 'id' | 'createdAt' | 'userId'>>): Promise<void> {
    const emailKey = email.toLowerCase();
    const prefsRef = doc(db, 'users', emailKey, 'preferences', 'default');
    await updateDoc(prefsRef, data);
  }

  async uploadProfileImage(email: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
    const emailKey = email.toLowerCase();
    const fileExtension = file.name.split('.').pop();
    const storageRef = ref(storage, `users/${emailKey}/profile.${fileExtension}`);
    
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          // Auto-update the profile with the new URL
          await this.updateUserProfile(emailKey, { avatarUrl: downloadURL });
          resolve(downloadURL);
        }
      );
    });
  }
}

export const userService = new UserService();
