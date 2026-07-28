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
  getMockFavorites(userId: string): FavoriteItem[] {
    return [
      {
        id: 'fav_store_mama_safi',
        userId,
        type: 'store',
        itemId: 's1',
        name: 'Mama Safi Laundry',
        description: 'Professional laundry, dry cleaning, and fabric care services in Dodoma, Tanzania.',
        imageUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebd01?w=300',
        rating: 4.8,
        reviewCount: 120,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        id: 'fav_prod_chapati',
        userId,
        type: 'product',
        itemId: 'p3',
        name: 'Soft Layered Chapati',
        description: 'Warm, soft layered traditional chapatis (Pack of 5).',
        imageUrl: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=300',
        price: 150,
        rating: 4.9,
        reviewCount: 220,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
      {
        id: 'fav_serv_ironing',
        userId,
        type: 'service',
        itemId: 'p2',
        name: 'Executive Suit Ironing',
        description: 'Gentle steam pressing and creasing for suits, jackets, and corporate attire.',
        imageUrl: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=300',
        price: 450,
        rating: 4.7,
        reviewCount: 95,
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
        updatedAt: new Date(Date.now() - 1000 * 60 * 30),
      }
    ];
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
