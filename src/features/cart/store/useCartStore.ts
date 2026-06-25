import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useLocationStore } from '../../location/store/useLocationStore';
import { storeService } from '../../stores/services/storeService';
import { APP_SETTINGS } from '@/core/config/settings';

export interface CartItem {
  productId: string; // Composite ID for the cart (e.g., id-iron-pack)
  baseProductId?: string; // Original ID for backend
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  storeId: string;
  storeName: string;
  // Laundry Configurations
  isLaundry?: boolean;
  washingSelected?: boolean;
  ironingSelected?: boolean;
  packagingSelected?: boolean;
  expressSelected?: boolean;
  
  // Food & Product Configurations
  isDeliverySelected?: boolean; // True means Delivery, False means Pickup
  
  // App-specific category ("Food", "Nguo", "Product") used by backend schema
  cat?: string; 
}

export const calculateItemTotal = (item: CartItem): number => {
  const itemBaseSubtotal = item.price * item.quantity;
  let itemTotal = 0;

  if (item.isLaundry) {
    itemTotal = itemBaseSubtotal;
    if (item.ironingSelected) itemTotal += itemBaseSubtotal * 0.95;
    if (item.packagingSelected) itemTotal += itemBaseSubtotal * 0.60;
    if (item.expressSelected) itemTotal += 1500; // Flat fee per line item, mirrors Flutter (deliveryFee * 2 + 1500) where deliveryFee=0
  } else {
    // Food and Products: Base Price only
    itemTotal = itemBaseSubtotal;
    // Delivery fee is now calculated dynamically at checkout based on distance and deliveryRation
  }
  
  return Math.round(itemTotal);
};

export interface LaundryPreferences {
  deliverytime: string;
  instructions: string;
}

interface CartState {
  items: CartItem[];
  laundryPreferences: LaundryPreferences;
  setLaundryPreferences: (prefs: Partial<LaundryPreferences>) => void;
  updateLaundryItemConfig: (productId: string, config: { ironingSelected?: boolean; packagingSelected?: boolean; expressSelected?: boolean }) => void;
  applyLaundryServicesToAll: (config: { ironingSelected?: boolean; packagingSelected?: boolean; expressSelected?: boolean }) => void;
  clearAllLaundryServices: () => void;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  toggleDelivery: (productId: string, isDelivery: boolean) => void;
  clearCart: () => void;
  getTotals: () => {
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    total: number;
    itemCount: number;
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      laundryPreferences: {
        deliverytime: '',
        instructions: '',
      },

      setLaundryPreferences: (prefs) => set((state) => ({
        laundryPreferences: { ...state.laundryPreferences, ...prefs }
      })),

      updateLaundryItemConfig: (productId, config) => set((state) => ({
        items: state.items.map(i => i.productId === productId ? { ...i, ...config } : i)
      })),

      applyLaundryServicesToAll: (config) => set((state) => ({
        items: state.items.map(i => i.isLaundry ? { ...i, ...config } : i)
      })),

      clearAllLaundryServices: () => set((state) => ({
        laundryPreferences: { deliverytime: '', instructions: '' },
        items: state.items.map(i => i.isLaundry ? { 
          ...i, 
          ironingSelected: false, 
          packagingSelected: false, 
          expressSelected: false 
        } : i)
      })),

      addToCart: (item) => set((state) => {
        const existingItem = state.items.find((i) => i.productId === item.productId);
        if (existingItem) {
          return {
            items: state.items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          };
        }
        return { items: [...state.items, { ...item, quantity: 1 }] };
      }),

      removeFromCart: (productId) => set((state) => ({
        items: state.items.filter((i) => i.productId !== productId),
      })),

      updateQuantity: (productId, quantity) => {
        set((state) => ({
          items: quantity <= 0 
            ? state.items.filter(i => i.productId !== productId)
            : state.items.map(i => i.productId === productId ? { ...i, quantity } : i)
        }));
      },

      toggleDelivery: (productId, isDeliverySelected) => {
        set((state) => ({
          items: state.items.map(i => i.productId === productId ? { ...i, isDeliverySelected } : i)
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotals: () => {
        const items = get().items;
        const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
        
        let subtotal = 0;
        let deliveryFee = 0;

        // Get user location and stores for dynamic pricing
        let userLocation = null;
        let allStores: any[] = [];
        try {
          userLocation = useLocationStore.getState().currentLocation;
          allStores = storeService.getMockStores();
        } catch (e) {
           console.warn('Could not load location/store service for dynamic pricing');
        }
        
        items.forEach(item => {
          let itemTotal = calculateItemTotal(item);
          let itemDeliveryFee = 0;

          if (userLocation && allStores.length > 0) {
            const store = allStores.find(s => s.id === item.storeId);
            if (store && store.location) {
               // Using Haversine formula from storeService
               const R = 6371;
               const dLat = (store.location.lat - userLocation.lat) * (Math.PI / 180);
               const dLon = (store.location.lng - userLocation.lng) * (Math.PI / 180);
               const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(userLocation.lat * (Math.PI / 180)) * Math.cos(store.location.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
               const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
               const distanceKm = R * c;

               const roundedFee = distanceKm * 1000; // 1000 TZS per km

               if (item.isLaundry) {
                 // Tiered pickup fee for laundry (mirrors Flutter logic)
                 if (roundedFee <= 0) { itemDeliveryFee = 50; }
                 else if (roundedFee < 2000) { itemDeliveryFee = 0; }
                 else if (roundedFee <= 3000) { itemDeliveryFee = 200; }
                 else if (roundedFee <= 5000) { itemDeliveryFee = 300; }
                 else if (roundedFee <= 7000) { itemDeliveryFee = 400; }
                 else if (roundedFee <= 9000) { itemDeliveryFee = 500; }
                 else if (roundedFee <= 15000) { itemDeliveryFee = 700; }
                 else { itemDeliveryFee = 1200; }
                 
                 itemTotal += itemDeliveryFee; // Baked directly into the item cost
               } else {
                 // For Food/Products, distance fee is baked into the price
                 // Unless the user chose Pick Up (isDeliverySelected === false)
                 if (item.isDeliverySelected !== false) {
                   itemTotal += roundedFee;
                 }
               }
            }
          }

          subtotal += itemTotal;
        });

        // The fee is inside the prices, no separate service fee (matches Flutter)
        const serviceFee = 0;
        let total = subtotal;

        // Delivery fee is forced to 0 for the UI since it is already baked into the subtotal/item costs
        return { subtotal: Math.round(subtotal), deliveryFee: 0, serviceFee, total: Math.round(total), itemCount };
      },
    }),
    {
      name: 'tulete-cart-storage',
    }
  )
);
