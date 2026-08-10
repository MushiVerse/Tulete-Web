import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';

export type FavoriteType = 'store' | 'product' | 'service';

export interface FavoriteItem extends BaseDocument {
  userId: string;
  type: FavoriteType;
  itemId: string;
  name: string;
  description: string;
  imageUrl: string;
  price?: number;
  rating?: number;
  reviewCount?: number;
  category?: string;
  cat?: string;
  store?: string;
  brand?: string;
  location?: string;
  [key: string]: any;
}

export interface WishlistCollection extends BaseDocument {
  userId: string;
  name: string;
  description?: string;
  itemIds: string[]; // List of product/service IDs
}

class FavoriteService extends BaseFirestoreService<FavoriteItem> {
  constructor() {
    super('favorites');
  }

  /**
   * Return initial high-fidelity mock favorites for offline-ready demonstrations
   */
  getMockFavorites(_userId: string): FavoriteItem[] {
    return [];
  }

  /**
   * Return initial custom wishlist folders
   */
  getMockWishlists(userId: string): WishlistCollection[] {
    return [
      {
        id: 'wish_groceries',
        userId,
        name: 'Monthly Laundries & Meals',
        description: 'Frequent cleaning packages and food combo wishlists.',
        itemIds: ['p1', 'p3'], // Mama Safi standard laundry, layered chapati
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      }
    ];
  }
}

export const favoriteService = new FavoriteService();
