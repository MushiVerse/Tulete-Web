import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { favoriteService, FavoriteItem, WishlistCollection, FavoriteType } from '../services/favoriteService';

interface FavoritesStore {
  favorites: FavoriteItem[];
  wishlists: WishlistCollection[];
  initialized: boolean;

  // Actions
  initialize: (userId: string) => void;
  toggleFavorite: (userId: string, item: Omit<FavoriteItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  isFavorited: (itemId: string) => boolean;
  createWishlist: (userId: string, name: string, description?: string) => void;
  addToWishlist: (wishlistId: string, itemId: string) => void;
  removeFromWishlist: (wishlistId: string, itemId: string) => void;
  deleteWishlist: (wishlistId: string) => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      wishlists: [],
      initialized: false,

      initialize: (userId) => {
        if (get().initialized) return;

        const mockFavs = favoriteService.getMockFavorites(userId);
        const mockWishes = favoriteService.getMockWishlists(userId);

        set({
          favorites: mockFavs,
          wishlists: mockWishes,
          initialized: true,
        });
      },

      toggleFavorite: (userId, item) => {
        const current = get().favorites;
        const exists = current.find((f) => f.itemId === item.itemId);

        if (exists) {
          // Optimistic remove
          set({
            favorites: current.filter((f) => f.itemId !== item.itemId),
          });
        } else {
          // Optimistic add
          const newFavorite: FavoriteItem = {
            id: `fav_${Date.now()}`,
            userId,
            ...item,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          set({
            favorites: [...current, newFavorite],
          });
        }
      },

      isFavorited: (itemId) => {
        return get().favorites.some((f) => f.itemId === itemId);
      },

      createWishlist: (userId, name, description) => {
        const newWishlist: WishlistCollection = {
          id: `wish_${Date.now()}`,
          userId,
          name,
          description,
          itemIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set({
          wishlists: [...get().wishlists, newWishlist],
        });
      },

      addToWishlist: (wishlistId, itemId) => {
        const updated = get().wishlists.map((w) => {
          if (w.id === wishlistId) {
            if (w.itemIds.includes(itemId)) return w;
            return {
              ...w,
              itemIds: [...w.itemIds, itemId],
              updatedAt: new Date(),
            };
          }
          return w;
        });

        set({ wishlists: updated });
      },

      removeFromWishlist: (wishlistId, itemId) => {
        const updated = get().wishlists.map((w) => {
          if (w.id === wishlistId) {
            return {
              ...w,
              itemIds: w.itemIds.filter((id) => id !== itemId),
              updatedAt: new Date(),
            };
          }
          return w;
        });

        set({ wishlists: updated });
      },

      deleteWishlist: (wishlistId) => {
        set({
          wishlists: get().wishlists.filter((w) => w.id !== wishlistId),
        });
      },
    }),
    {
      name: 'tulete_favorites_storage', // Persist to LocalStorage
    }
  )
);
