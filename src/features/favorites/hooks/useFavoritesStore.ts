import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { favoriteService, FavoriteItem, WishlistCollection } from '../services/favoriteService';
import { db } from '../../../core/firebase/config';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { buildCompleteProductPayload, resolveImageUrl } from '../../../shared/utils/productPayload';

interface FavoritesStore {
  favorites: FavoriteItem[];
  wishlists: WishlistCollection[];
  initialized: boolean;
  activeUserId: string | null;

  // Actions
  initialize: (userId: string) => void;
  toggleFavorite: (userId: string, item: any) => Promise<void>;
  removeFavorite: (userId: string, item: any) => Promise<void>;
  isFavorited: (itemId: string) => boolean;
  createWishlist: (userId: string, name: string, description?: string) => void;
  addToWishlist: (wishlistId: string, itemId: string) => void;
  removeFromWishlist: (wishlistId: string, itemId: string) => void;
  deleteWishlist: (wishlistId: string) => void;
}

let firestoreUnsubscribe: (() => void) | null = null;

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      wishlists: [],
      initialized: false,
      activeUserId: null,

      initialize: (userId) => {
        if (!userId) return;
        if (get().activeUserId === userId && get().initialized) return;

        // Clean up any previous listener
        if (firestoreUnsubscribe) {
          firestoreUnsubscribe();
          firestoreUnsubscribe = null;
        }

        set({ activeUserId: userId, initialized: true });

        if (userId !== 'guest_user') {
          try {
            const favsRef = collection(db, 'userfavorites', userId, 'favorites');
            firestoreUnsubscribe = onSnapshot(favsRef, (snapshot) => {
              const items: FavoriteItem[] = [];
              snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.fav !== false) {
                  const targetId = data.foodId || data.id || docSnap.id;
                  items.push({
                    id: docSnap.id,
                    userId,
                    type: (data.type as any) || 'product',
                    itemId: targetId,
                    name: data.name || data.nam1 || 'Favorite Item',
                    description: data.description || '',
                    imageUrl: resolveImageUrl(data),
                    price: Number(data.price || 0),
                    rating: Number(data.rating || 0),
                    reviewCount: Number(data.reviewCount || 0),
                    location: data.location || data.productloc || '',
                    cat: data.cat || data.specCat || data.category || '',
                    category: data.category || data.cate || data.cat || '',
                    storeId: data.storeId || data.store || data.brand || '',
                    store: data.store || data.brand || '',
                    createdAt: data.time ? new Date(data.time) : new Date(),
                    updatedAt: data.time ? new Date(data.time) : new Date(),
                    ...(data as any),
                  });
                }
              });
              set({ favorites: items });
            }, (err) => {
              console.warn('Error listening to userfavorites:', err);
            });
          } catch (e) {
            console.warn('Firestore subscription failed in useFavoritesStore:', e);
          }
        } else {
          const mockFavs = favoriteService.getMockFavorites(userId);
          const mockWishes = favoriteService.getMockWishlists(userId);
          set({
            favorites: mockFavs,
            wishlists: mockWishes,
          });
        }
      },

      toggleFavorite: async (userId, item: any) => {
        const current = get().favorites;
        const targetItemId = item?.itemId || item?.id || item?.foodId || '';
        const exists = current.find((f) => f.itemId === targetItemId || f.id === targetItemId || (f as any).foodId === targetItemId);

        if (exists) {
          // Optimistic remove
          set({
            favorites: current.filter((f) => f.itemId !== targetItemId && f.id !== targetItemId && (f as any).foodId !== targetItemId),
          });

          if (userId && userId !== 'guest_user') {
            try {
              const favDocRef = doc(db, 'userfavorites', userId, 'favorites', targetItemId);
              await updateDoc(favDocRef, { fav: false }).catch(async () => {
                await deleteDoc(favDocRef);
              });
            } catch (err) {
              console.error('Error removing favorite from Firestore userfavorites:', err);
            }
          }
        } else {
          // Optimistic add
          const newFavorite: FavoriteItem = {
            id: targetItemId || `fav_${Date.now()}`,
            userId: userId || 'guest_user',
            type: item.type || 'product',
            itemId: targetItemId || `item_${Date.now()}`,
            name: item.name || item.title || '',
            description: item.description || '',
            imageUrl: item.imageUrl || item.imgURL || item.imgUrl || '',
            ...item,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set({
            favorites: [...current, newFavorite],
          });

          if (userId && userId !== 'guest_user') {
            try {
              const favDocRef = doc(db, 'userfavorites', userId, 'favorites', targetItemId);
              const favPayload = buildCompleteProductPayload(item, userId, { foodId: targetItemId, fav: true });
              await setDoc(favDocRef, favPayload, { merge: true });
            } catch (err) {
              console.error('Error adding favorite to Firestore userfavorites:', err);
            }
          }
        }
      },

      removeFavorite: async (userId, item: any) => {
        const current = get().favorites;
        const targetItemId = typeof item === 'string' ? item : (item?.itemId || item?.id || item?.foodId || item?.docId || '');
        const docId = typeof item === 'string' ? item : (item?.id || item?.docId || targetItemId);

        set({
          favorites: current.filter(
            (f) => f.itemId !== targetItemId && f.id !== targetItemId && f.id !== docId && f.itemId !== docId && (f as any).foodId !== targetItemId
          ),
        });

        if (userId && userId !== 'guest_user') {
          try {
            const possibleIds = Array.from(new Set([targetItemId, docId, item?.id, item?.itemId, item?.docId].filter(Boolean)));
            for (const idToDelete of possibleIds) {
              if (!idToDelete) continue;
              const favDocRef = doc(db, 'userfavorites', userId, 'favorites', idToDelete);
              await deleteDoc(favDocRef).catch(async () => {
                await updateDoc(favDocRef, { fav: false }).catch(() => {});
              });
            }
          } catch (err) {
            console.error('Error removing favorite from Firestore userfavorites:', err);
          }
        }
      },

      isFavorited: (itemId) => {
        if (!itemId) return false;
        return get().favorites.some((f) => f.itemId === itemId || f.id === itemId || (f as any).foodId === itemId);
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
      name: 'tulete_favorites_storage',
    }
  )
);

