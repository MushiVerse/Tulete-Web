import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useLocationStore } from '../../location/store/useLocationStore';
import { storeService } from '../../stores/services/storeService';
import { APP_SETTINGS } from '@/core/config/settings';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';

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
  vipSelected?: boolean;
  
  // Food & Product Configurations
  isDeliverySelected?: boolean; // True means Delivery, False means Pickup
  deliverySlot?: 'Lunch' | 'Dinner' | 'ASAP' | string;
  brand?: string;
  
  // App-specific category ("Food", "Nguo", "Product") used by backend schema
  cat?: string; 
  location?: { lat: number; lng: number };
  idadi?: number;
}

export interface LaundryRatios {
  iron: number;
  package: number;
  vip: number;
  wash: number;
  expressClient: number;
}

export const calculateItemTotal = (item: CartItem, ratios?: LaundryRatios): number => {
  const itemBaseSubtotal = item.price * item.quantity;
  let itemTotal = 0;

  if (item.isLaundry) {
    itemTotal = itemBaseSubtotal;
    if (ratios) {
      if (item.ironingSelected) itemTotal += itemBaseSubtotal * (ratios.iron - ratios.wash);
      if (item.packagingSelected) itemTotal += itemBaseSubtotal * (ratios.package - ratios.wash);
      if (item.vipSelected) itemTotal += itemBaseSubtotal * (ratios.vip - ratios.wash);
    } else {
      // Fallback logic based on the laudry_service values
      if (item.ironingSelected) itemTotal += itemBaseSubtotal * (150 / 100); 
      if (item.packagingSelected) itemTotal += itemBaseSubtotal * (300 / 100); 
      if (item.vipSelected) itemTotal += itemBaseSubtotal * (400 / 100); 
    }
  } else {
    // Food and Products: Base Price only
    itemTotal = itemBaseSubtotal;
    // Delivery fee is now calculated dynamically at checkout based on distance and deliveryRation
  }
  
  return Math.round(itemTotal);
};

export interface LaundryPreferences {
  deliverytime?: string;
  instructions?: string;
  globalExpressSelected?: boolean;
}

interface CartState {
  items: CartItem[];
  laundryPreferences: LaundryPreferences;
  setLaundryPreferences: (prefs: Partial<LaundryPreferences>) => void;
  updateLaundryItemConfig: (productId: string, config: { ironingSelected?: boolean; packagingSelected?: boolean; vipSelected?: boolean }) => void;
  applyLaundryServicesToAll: (config: { ironingSelected?: boolean; packagingSelected?: boolean; vipSelected?: boolean }) => void;
  laundryRatios: LaundryRatios | null;
  fetchLaundryRatios: () => Promise<void>;
  clearAllLaundryServices: () => void;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  toggleDelivery: (productId: string, isDelivery: boolean) => void;
  updateFoodItemSlot: (productId: string, slot: string) => void;
  clearCart: () => void;
  getTotals: () => {
    subtotal: number;
    deliveryFee: number;
    expressFee: number;
    pickupFee: number;
    serviceFee: number;
    total: number;
    itemCount: number;
  };
  getDynamicItemPrices: () => Record<string, number>; // productId -> dynamic row total
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      laundryRatios: null,
      laundryPreferences: {
        deliverytime: '',
        instructions: '',
        globalExpressSelected: false,
      },

      fetchLaundryRatios: async () => {
        try {
          // We assume the new document is in the ratios collection called 'laudry_service'
          const docRef = doc(db, 'ratios', 'laudry_service');
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            set({
              laundryRatios: {
                iron: data.ironPercent ? (data.ironPercent / 100 + 1) : 2.5, // e.g., 150 -> 2.5 times total, so added modifier is 1.5
                package: data.packagingPercent ? (data.packagingPercent / 100 + 1) : 4.0,
                vip: data.vipPercent ? (data.vipPercent / 100 + 1) : 5.0,
                wash: 1, // Base is always 1
                expressClient: data.expressClient ?? 2000,
              }
            });
          } else {
            // Fallback to older ratios doc if the new one doesn't exist
            const oldDocRef = doc(db, 'ratios', 'ratios');
            const oldSnap = await getDoc(oldDocRef);
            if (oldSnap.exists()) {
              const data = oldSnap.data();
              set({
                laundryRatios: {
                  iron: data.iron ?? 1.95,
                  package: data.package ?? 3.9,
                  vip: data.vip ?? 5.3,
                  wash: data.wash ?? 1,
                  expressClient: 2000,
                }
              });
            }
          }
        } catch (e) {
          console.error('Failed to fetch laundry ratios:', e);
        }
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
        laundryPreferences: { deliverytime: '', instructions: '', globalExpressSelected: false },
        items: state.items.map(i => i.isLaundry ? { 
          ...i, 
          ironingSelected: false, 
          packagingSelected: false, 
          vipSelected: false 
        } : i)
      })),

      addToCart: (item) => set((state) => {
        const existingItem = state.items.find((i) => i.productId === item.productId);
        if (existingItem) {
          if (item.idadi !== undefined && existingItem.quantity >= item.idadi) {
            alert(`Cannot add more. Only ${item.idadi} items available in stock.`);
            return state;
          }
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
        set((state) => {
          const item = state.items.find(i => i.productId === productId);
          if (item && item.idadi !== undefined && quantity > item.idadi) {
            alert(`Cannot update quantity. Only ${item.idadi} items available in stock.`);
            return state;
          }
          return {
            items: quantity <= 0 
              ? state.items.filter(i => i.productId !== productId)
              : state.items.map(i => i.productId === productId ? { ...i, quantity } : i)
          };
        });
      },

      toggleDelivery: (productId, isDeliverySelected) => {
        set((state) => ({
          items: state.items.map(i => i.productId === productId ? { ...i, isDeliverySelected } : i)
        }));
      },

      updateFoodItemSlot: (productId, deliverySlot) => {
        set((state) => ({
          items: state.items.map(i => i.productId === productId ? { ...i, deliverySlot } : i)
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotals: () => {
        const items = get().items;
        const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
        
        let subtotal = 0;
        let deliveryFee = 0;
        let globalExpressFee = 0;
        let pickupFee = 0;
        let serviceFee = 0;
        let maxRoundedFee = 0;
        let hasLaundry = false;

        // Get user location and stores for dynamic pricing
        let userLocation = null;
        let allStores: any[] = [];
        try {
          userLocation = useLocationStore.getState().currentLocation;
          allStores = storeService.getMockStores();
        } catch (e) {
          console.warn('Could not load location/store service for dynamic pricing');
        }
        
        const ratios = get().laundryRatios;
        items.forEach(item => {
          const itemIsLaundry = item.isLaundry || (item as any).cat === 'Nguo' || item.storeId === 'laundry' || item.storeName?.toLowerCase().includes('laundry');
          if (itemIsLaundry) hasLaundry = true;
          
          let itemTotal = calculateItemTotal(item, ratios || undefined);
          subtotal += itemTotal;

          if (userLocation) {
            let targetLocation = item.location;
            if (!targetLocation && allStores.length > 0) {
              const store = allStores.find(s => s.id === item.storeId);
              if (store && store.location) {
                targetLocation = store.location;
              }
            }

            if (targetLocation) {
              // Using Haversine formula from storeService
              const R = 6371;
              const dLat = (targetLocation.lat - userLocation.lat) * (Math.PI / 180);
              const dLon = (targetLocation.lng - userLocation.lng) * (Math.PI / 180);
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(userLocation.lat * (Math.PI / 180)) * Math.cos(targetLocation.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distanceKm = R * c;

              let calculatedFee = distanceKm * 1000;
              if (distanceKm > 150) {
                calculatedFee = 15000;
              }
              const roundedFee = Math.round(calculatedFee);

              if (itemIsLaundry) {
                if (roundedFee > maxRoundedFee) maxRoundedFee = roundedFee;

                let itemDeliveryFee = 0;
                if (roundedFee <= 0) { itemDeliveryFee = 50; }
                else if (roundedFee < 2000) { itemDeliveryFee = 0; }
                else if (roundedFee <= 3000) { itemDeliveryFee = 200; }
                else if (roundedFee <= 5000) { itemDeliveryFee = 300; }
                else if (roundedFee <= 7000) { itemDeliveryFee = 400; }
                else if (roundedFee <= 9000) { itemDeliveryFee = 500; }
                else if (roundedFee <= 15000) { itemDeliveryFee = 700; }
                else { itemDeliveryFee = 1200; }
                
                deliveryFee += itemDeliveryFee * item.quantity;
              } else {
                if (item.isDeliverySelected !== false) {
                  deliveryFee += roundedFee * item.quantity;
                }
              }
            }
          }
        });

        // 1. Express Charges (when Express is selected)
        if (hasLaundry && get().laundryPreferences.globalExpressSelected) {
          const expressClientFee = get().laundryRatios?.expressClient ?? 2000;
          globalExpressFee = ((maxRoundedFee > 0 ? maxRoundedFee : 1500) * 2) + expressClientFee;
        }

        // 2. Preferred Pickup Charges (normal delivery fee * 2 when pickup time is selected; 0 when cleared)
        const deliveryTimeStr = get().laundryPreferences.deliverytime ? String(get().laundryPreferences.deliverytime).trim() : '';
        if (hasLaundry && deliveryTimeStr.length > 0) {
          const baseFeeForPickup = deliveryFee > 0 ? deliveryFee : (maxRoundedFee > 0 ? maxRoundedFee : 2000);
          pickupFee = baseFeeForPickup * 2;
        }

        serviceFee = Math.round((subtotal + deliveryFee + globalExpressFee + pickupFee) * 0.05); // 5% service fee
        const total = subtotal + deliveryFee + globalExpressFee + pickupFee + serviceFee;

        return {
          subtotal: Math.round(subtotal),
          deliveryFee: Math.round(deliveryFee),
          expressFee: Math.round(globalExpressFee),
          pickupFee: Math.round(pickupFee),
          serviceFee: Math.round(serviceFee),
          total: Math.round(total),
          itemCount
        };
      },

      getDynamicItemPrices: () => {
        const items = get().items;
        const result: Record<string, number> = {};

        let userLocation = null;
        let allStores: any[] = [];
        try {
          userLocation = useLocationStore.getState().currentLocation;
          allStores = storeService.getMockStores();
        } catch (e) {
          console.warn('Could not load location/store for dynamic item prices');
        }

        const ratios = get().laundryRatios;
        items.forEach(item => {
          let itemTotal = calculateItemTotal(item, ratios || undefined);

          if (userLocation) {
            let targetLocation = item.location;
            if (!targetLocation && allStores.length > 0) {
              const store = allStores.find(s => s.id === item.storeId);
              if (store && store.location) {
                targetLocation = store.location;
              }
            }

            if (targetLocation) {
              const R = 6371;
              const dLat = (targetLocation.lat - userLocation.lat) * (Math.PI / 180);
              const dLon = (targetLocation.lng - userLocation.lng) * (Math.PI / 180);
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(userLocation.lat * (Math.PI / 180)) *
                Math.cos(targetLocation.lat * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distanceKm = R * c;

              let calculatedFee = distanceKm * 1000;
              if (distanceKm > 150) calculatedFee = 15000;
              const roundedFee = Math.round(calculatedFee);

              if (item.isLaundry) {
                let itemDeliveryFee = 0;
                if (roundedFee <= 0) { itemDeliveryFee = 50; }
                else if (roundedFee < 2000) { itemDeliveryFee = 0; }
                else if (roundedFee <= 3000) { itemDeliveryFee = 200; }
                else if (roundedFee <= 5000) { itemDeliveryFee = 300; }
                else if (roundedFee <= 7000) { itemDeliveryFee = 400; }
                else if (roundedFee <= 9000) { itemDeliveryFee = 500; }
                else if (roundedFee <= 15000) { itemDeliveryFee = 700; }
                else { itemDeliveryFee = 1200; }

                const delTime = get().laundryPreferences?.deliverytime;
                const pickupMultiplier = (delTime && String(delTime).trim().length > 0) ? 2 : 1;
                itemDeliveryFee = itemDeliveryFee * pickupMultiplier;

                itemTotal += itemDeliveryFee * item.quantity;
              } else {
                if (item.isDeliverySelected !== false) {
                  itemTotal += roundedFee * item.quantity;
                }
              }
            }
          }

          result[item.productId] = Math.round(itemTotal);
        });

        return result;
      },
    }),
    {
      name: 'tulete-cart-storage',
    }
  )
);
