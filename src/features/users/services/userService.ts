import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';
import { storage, db, auth } from '../../../core/firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { APP_SETTINGS } from '@/core/config/settings';
import { useReviewsStore } from '../../reviews/hooks/useReviewsStore';

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
  totalFavorites: number;
  totalReviews: number;
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
    
    let avatar = data.image && data.image !== 'null' ? data.image : '';

    // If Firestore document image is missing or 'null', check auth.currentUser Google photoURL and sync it!
    if (!avatar && auth.currentUser && auth.currentUser.email?.toLowerCase() === emailKey && auth.currentUser.photoURL) {
      avatar = auth.currentUser.photoURL;
      try {
        await updateDoc(userRef, { image: avatar });
      } catch (err) {
        console.warn('Failed to sync google photoURL to image field:', err);
      }
    }

    const rootUserRef = doc(db, 'users', emailKey);
    const rootSnap = await getDoc(rootUserRef).catch(() => null);
    const rootData = rootSnap && rootSnap.exists() ? rootSnap.data() : {};

    const rawBio = data.bio || data.userBio || data.about || data.description || rootData.bio || rootData.userBio || rootData.about || '';
    const cleanBio = (rawBio && rawBio !== 'null' && String(rawBio).trim() !== '') ? String(rawBio).trim() : '';

    const uid = data.uid || auth.currentUser?.uid || '';

    // Calculate analytics and stats from Firestore documents according to user uid / email
    let totalOrders = 0;
    let totalSpent = 0;
    let totalFavorites = 0;
    let totalReviews = 0;

    // 1. Fetch analytics_users profile document if present
    if (uid) {
      try {
        const userAnalyticsSnap = await getDoc(doc(db, 'analytics_users', uid));
        if (userAnalyticsSnap.exists()) {
          const aData = userAnalyticsSnap.data();
          if (aData.totalOrders !== undefined) totalOrders = Number(aData.totalOrders) || 0;
          if (aData.totalSpent !== undefined) totalSpent = Number(aData.totalSpent) || 0;
          if (aData.totalFavorites !== undefined) totalFavorites = Number(aData.totalFavorites) || 0;
          if (aData.totalReviews !== undefined) totalReviews = Number(aData.totalReviews) || 0;
        }
      } catch (err) {
        console.warn('Failed to read analytics_users document:', err);
      }
    }

    // 2. Query user orders from `orders` and `newcomfirmedorders` collections for exact order counts and total spent
    try {
      const qOrders = uid 
        ? query(collection(db, 'orders'), where('userId', '==', uid))
        : query(collection(db, 'orders'), where('email', '==', emailKey));
      const qNc = uid
        ? query(collection(db, 'newcomfirmedorders'), where('uid', '==', uid))
        : query(collection(db, 'newcomfirmedorders'), where('email', '==', emailKey));

      const [ordersSnap, ncSnap] = await Promise.all([
        getDocs(qOrders).catch(() => null),
        getDocs(qNc).catch(() => null),
      ]);

      const seenOrderIds = new Set<string>();
      let calculatedOrdersCount = 0;
      let calculatedTotalSpent = 0;

      const processDoc = (docSnap: any) => {
        if (seenOrderIds.has(docSnap.id)) return;
        seenOrderIds.add(docSnap.id);
        calculatedOrdersCount++;
        const oData = docSnap.data();
        const price = Number(oData.totalPrice || oData.totalAmount || oData.total || oData.subtotal || oData.price || 0);
        if (!isNaN(price) && price > 0) {
          calculatedTotalSpent += price;
        }
      };

      if (ordersSnap) ordersSnap.docs.forEach(processDoc);
      if (ncSnap) ncSnap.docs.forEach(processDoc);

      if (calculatedOrdersCount > 0) {
        totalOrders = Math.max(totalOrders, calculatedOrdersCount);
        totalSpent = Math.max(totalSpent, calculatedTotalSpent);
      }
    } catch (e) {
      console.warn('Error calculating order stats from Firestore:', e);
    }

    // 3. Query user favorites count from `userfavorites/{uid}/favorites` & `userfavorites/{uid}/stores`
    if (uid) {
      try {
        const [favSnap, storeSnap] = await Promise.all([
          getDocs(collection(db, 'userfavorites', uid, 'favorites')).catch(() => null),
          getDocs(collection(db, 'userfavorites', uid, 'stores')).catch(() => null),
        ]);
        let favCount = 0;
        if (favSnap) favCount += favSnap.docs.filter((d) => d.data().fav !== false).length;
        if (storeSnap) favCount += storeSnap.docs.filter((d) => d.data().fav !== false).length;
        totalFavorites = Math.max(totalFavorites, favCount);
      } catch (e) {
        console.warn('Error reading user favorites count:', e);
      }
    }

    // 4. Query reviews & ratings count made by the user across BOTH items and stores
    if (uid || emailKey) {
      try {
        const [revSnap, ratingsSnap, userRevSnap, storeRatingsSnap, eventsSnap] = await Promise.all([
          uid ? getDocs(query(collection(db, 'reviews'), where('userId', '==', uid))).catch(() => null) : null,
          uid ? getDocs(query(collection(db, 'analytics_ratings'), where('userId', '==', uid))).catch(() => null) : null,
          getDocs(query(collection(db, 'reviews'), where('userEmail', '==', emailKey))).catch(() => null),
          getDocs(query(collection(db, 'analytics_ratings'), where('userEmail', '==', emailKey))).catch(() => null),
          uid ? getDocs(query(collection(db, 'analytics_events'), where('userId', '==', uid), where('eventType', '==', 'rate'))).catch(() => null) : null,
        ]);

        let revCount = 0;
        const seenRevIds = new Set<string>();
        const processRevDoc = (d: any) => {
          if (d && d.id && !seenRevIds.has(d.id)) {
            seenRevIds.add(d.id);
            revCount++;
          }
        };

        if (revSnap) revSnap.docs.forEach(processRevDoc);
        if (ratingsSnap) ratingsSnap.docs.forEach(processRevDoc);
        if (userRevSnap) userRevSnap.docs.forEach(processRevDoc);
        if (storeRatingsSnap) storeRatingsSnap.docs.forEach(processRevDoc);
        if (eventsSnap) eventsSnap.docs.forEach(processRevDoc);

        // Also count local store reviews created by the user (combining item reviews and store reviews)
        try {
          const storeRevs = useReviewsStore.getState().reviews;
          const userStoreRevs = storeRevs.filter(
            (r) => (r.userId && (r.userId === uid || r.userId === emailKey)) || (r as any).userEmail === emailKey
          );
          userStoreRevs.forEach((r) => {
            if (!seenRevIds.has(r.id)) {
              seenRevIds.add(r.id);
              revCount++;
            }
          });
        } catch (e) {
          // ignore
        }

        totalReviews = Math.max(totalReviews, revCount);
      } catch (e) {
        console.warn('Error reading combined item and store reviews count:', e);
      }
    }

    return {
      id: data.uid || '',
      uid: data.uid || '',
      displayName: data.name || '',
      email: data.email || emailKey,
      phone: data.phone && data.phone !== 'null' ? data.phone : '',
      avatarUrl: avatar,
      bio: cleanBio,
      city: data.city && data.city !== 'null' ? data.city : '',
      country: data.country && data.country !== 'null' ? data.country : '',
      joinedAt: data.signedUpOn ? new Date(data.signedUpOn) : new Date(),
      isVerified: true,
      preferredLanguage: 'en',
      totalOrders,
      totalSpent,
      totalFavorites,
      totalReviews,
    } as any;
  }

  async updateUserProfile(email: string, data: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'uid'>>): Promise<void> {
    if (!email) return;
    const emailKey = email.toLowerCase();
    const userRef = doc(db, 'users', emailKey, 'details', emailKey);
    const rootUserRef = doc(db, 'users', emailKey);
    
    const updates: any = {};
    if (data.displayName !== undefined) updates.name = data.displayName;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.avatarUrl !== undefined) updates.image = data.avatarUrl;
    if (data.city !== undefined) updates.city = data.city;
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.country !== undefined) updates.country = data.country;
    
    await setDoc(userRef, updates, { merge: true });
    await setDoc(rootUserRef, updates, { merge: true });
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
