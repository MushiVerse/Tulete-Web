import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';
import {
  collection, query, where, orderBy, getDocs,
  onSnapshot, QuerySnapshot, DocumentData
} from 'firebase/firestore';
import { db } from '../../../core/firebase/config';

/** Mirrors Flutter's `cloths` Firestore collection schema */
export interface LaundryItem extends BaseDocument {
  name: string;
  price: number;
  imgURL: string;
  brand: string;
  location: string;
  quantity: number;          // > 0 means service available
  category: string;          // "Nguo" for laundry items
  store: string;
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}

/** Laundry-specific order options (mirrors Flutter's reorder.dart fields) */
export interface LaundryOrderOptions {
  irondelivery: boolean;     // Iron after washing
  packagepickup: boolean;    // Package & pickup service
  express: boolean;          // Express 24h turnaround
  deliverytime: string;      // Preferred pickup date/time string
  instructions?: string;     // Special garment instructions
}

class LaundryService extends BaseFirestoreService<LaundryItem> {
  constructor() {
    super('cloths'); // Mirrors Flutter's exact Firestore collection name
  }

  /** Get all available laundry items, ordered by time descending */
  async getAvailableItems(): Promise<LaundryItem[]> {
    const q = query(
      this.collectionRef,
      orderBy('time', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as LaundryItem));
  }

  /** Search items by name (client-side fuzzy for simplicity) */
  async searchByName(searchTerm: string): Promise<LaundryItem[]> {
    const all = await this.getAvailableItems();
    if (!searchTerm.trim()) return all;
    const lower = searchTerm.toLowerCase();
    return all.filter(item =>
      item.name?.toLowerCase().includes(lower) ||
      item.brand?.toLowerCase().includes(lower) ||
      item.store?.toLowerCase().includes(lower)
    );
  }

  /** Subscribe to real-time laundry items list */
  subscribeToItems(callback: (items: LaundryItem[]) => void): () => void {
    const q = query(this.collectionRef, orderBy('time', 'desc'));
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LaundryItem));
      callback(items);
    }, (err) => {
      console.error('LaundryService stream error:', err);
      callback([]);
    });
  }

  /** Get ads for laundry store banners (mirrors Flutter's `ads` collection query) */
  async getLaundryAds(): Promise<{ imgURL: string; store: string }[]> {
    const q = query(
      collection(db, 'ads'),
      where('category', '==', 'NguoStore')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as { imgURL: string; store: string });
  }
}

export const laundryService = new LaundryService();
