import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useLocationStore } from '../../location/store/useLocationStore';
import { storeService } from '../../stores/services/storeService';
import { APP_SETTINGS } from '@/core/config/settings';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { calculateDeliveryFeeAlgorithm } from '../../location/hooks/useDynamicPrice';

export interface CartItem {
  productId: string; // Composite ID for the cart (e.g., id-iron-pack)
  baseProductId?: string; // Original ID for backend
  name: string;
  price: number;
  basePrice?: number;
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
  packagepickup?: boolean;
  deliverySlot?: 'Lunch' | 'Dinner' | 'ASAP' | string;
  brand?: string;

  // App-specific category ("Food", "Nguo", "Product") used by backend schema
  cat?: string;
  location?: { lat: number; lng: number };
  idadi?: number;
  maxQuantity?: number;
}

export interface LaundryRatios {
  iron: number;
  package: number;
  vip: number;
  wash: number;
  expressClient: number;
}

export const calculateItemTotal = (item: CartItem, ratios?: LaundryRatios): number => {
  const washPrice = ((item as any).basePrice || item.price) * item.quantity;

  if ((item as any).cat === 'Nguo') {
    const isWash = item.washingSelected !== false; // Wash defaults to true unless turned off
    const isIron = Boolean(item.ironingSelected);
    const isPack = Boolean(item.packagingSelected);
    const isVip = Boolean(item.vipSelected);

    let itemTotal = 0;

    // 1. Include wash price if wash service is ON
    if (isWash) {
      itemTotal += washPrice;
    }

    // 2. Use washPrice as the reference to calculate other selected service values
    if (ratios) {
      const ironFactor = ratios.iron - ratios.wash;
      const packFactor = ratios.package - ratios.wash;
      const vipFactor = ratios.vip - ratios.wash;

      if (isIron) itemTotal += washPrice * (ironFactor > 0 ? ironFactor : ratios.iron);
      if (isPack) itemTotal += washPrice * (packFactor > 0 ? packFactor : ratios.package);
      if (isVip) itemTotal += washPrice * (vipFactor > 0 ? vipFactor : ratios.vip);
    } else {
      if (isIron) itemTotal += washPrice * 1.5;
      if (isPack) itemTotal += washPrice * 3.0;
      if (isVip) itemTotal += washPrice * 4.0;
    }

    return Math.round(itemTotal);
  }

  return Math.round(washPrice);
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
  updateLaundryItemConfig: (
    productId: string,
    config: { washingSelected?: boolean; ironingSelected?: boolean; packagingSelected?: boolean; vipSelected?: boolean }
  ) => void;
  applyLaundryServicesToAll: (config: {
    washingSelected?: boolean;
    ironingSelected?: boolean;
    packagingSelected?: boolean;
    vipSelected?: boolean;
  }) => void;
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
  getDynamicItemPrices: () => Record<string, number>;
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
          const docRef = doc(db, 'ratios', 'laudry_service');
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            set({
              laundryRatios: {
                iron: data.ironPercent ? data.ironPercent / 100 + 1 : 2.5,
                package: data.packagingPercent ? data.packagingPercent / 100 + 1 : 4.0,
                vip: data.vipPercent ? data.vipPercent / 100 + 1 : 5.0,
                wash: 1,
                expressClient: data.expressClient ?? 2000,
              },
            });
          } else {
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
                },
              });
            }
          }
        } catch (e) {
          console.error('Failed to fetch laundry ratios:', e);
        }
      },

      setLaundryPreferences: (prefs) =>
        set((state) => ({
          laundryPreferences: { ...state.laundryPreferences, ...prefs },
        })),

      updateLaundryItemConfig: (productId, config) =>
        set((state) => ({
          items: state.items.map((i) => (i.productId === productId ? { ...i, ...config } : i)),
        })),

      applyLaundryServicesToAll: (config) =>
        set((state) => ({
          items: state.items.map((i) => ((i as any).cat === 'Nguo' ? { ...i, ...config } : i)),
        })),

      clearAllLaundryServices: () =>
        set((state) => ({
          laundryPreferences: { deliverytime: '', instructions: '', globalExpressSelected: false },
          items: state.items.map((i) =>
            (i as any).cat === 'Nguo'
              ? {
                  ...i,
                  ironingSelected: false,
                  packagingSelected: false,
                  vipSelected: false,
                }
              : i
          ),
        })),

      addToCart: (item) =>
        set((state) => {
          const basePrice = (item as any).basePrice || item.price;
          const rawStock = (item as any).maxQuantity ?? (item as any).stockQuantity ?? (item as any).quantity ?? (item as any).idadi;
          const stock = typeof rawStock === 'number' && !isNaN(rawStock) 
            ? rawStock 
            : (typeof rawStock === 'string' && !isNaN(parseInt(rawStock, 10)) ? parseInt(rawStock, 10) : undefined);

          const existingItem = state.items.find((i) => i.productId === item.productId);
          if (existingItem) {
            const limit = existingItem.maxQuantity ?? stock;
            if (limit !== undefined && limit > 0 && existingItem.quantity >= limit) {
              alert(`Cannot add more. Maximum available stock reached (${limit} left in stock).`);
              return state;
            }
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + 1, price: basePrice, basePrice, maxQuantity: limit }
                  : i
              ),
            };
          }

          if (stock !== undefined && stock <= 0) {
            alert(`This item is currently out of stock.`);
            return state;
          }

          return { items: [...state.items, { ...item, price: basePrice, basePrice, quantity: 1, maxQuantity: stock }] };
        }),

      removeFromCart: (productId) =>
        set((state) => {
          const newItems = state.items.filter((i) => i.productId !== productId);
          const hasLaundry = newItems.some((i) => (i as any).cat === 'Nguo');
          return {
            items: newItems,
            laundryPreferences: hasLaundry
              ? state.laundryPreferences
              : { ...state.laundryPreferences, globalExpressSelected: false },
          };
        }),

      updateQuantity: (productId, quantity) => {
        set((state) => {
          const item = state.items.find((i) => i.productId === productId);
          let finalQty = quantity;
          if (item) {
            const limit = item.maxQuantity ?? (item as any).idadi;
            if (limit !== undefined && limit > 0 && quantity > limit) {
              alert(`Cannot increase quantity. Maximum available stock reached (${limit} left in stock).`);
              finalQty = limit;
            }
          }
          const newItems =
            finalQty <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) => (i.productId === productId ? { ...i, quantity: finalQty } : i));
          const hasLaundry = newItems.some((i) => (i as any).cat === 'Nguo');

          return {
            items: newItems,
            laundryPreferences: hasLaundry
              ? state.laundryPreferences
              : { ...state.laundryPreferences, globalExpressSelected: false },
          };
        });
      },

      toggleDelivery: (productId, isDeliverySelected) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, isDeliverySelected, packagepickup: isDeliverySelected === false }
              : i
          ),
        }));
      },

      updateFoodItemSlot: (productId, deliverySlot) => {
        set((state) => ({
          items: state.items.map((i) => (i.productId === productId ? { ...i, deliverySlot } : i)),
        }));
      },

      clearCart: () =>
        set({
          items: [],
          laundryPreferences: { deliverytime: '', instructions: '', globalExpressSelected: false },
        }),

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

        let userLocation = null;
        let allStores: any[] = [];
        try {
          userLocation = useLocationStore.getState().currentLocation;
          allStores = storeService.getMockStores();
        } catch (e) {
          console.warn('Could not load location/store service for dynamic pricing');
        }

        let laundrySubtotal = 0;
        const ratios = get().laundryRatios;
        items.forEach((item) => {
          const itemIsLaundry = (item as any).cat === 'Nguo';
          if (itemIsLaundry) hasLaundry = true;

          let itemTotal = calculateItemTotal(item, ratios || undefined);

          // For non-laundry items, automatically adjust item unit total to include distance delivery fee UNLESS Pick Up (isDeliverySelected === false) is selected
          if (!itemIsLaundry && userLocation && item.isDeliverySelected !== false) {
            let targetLocation = item.location;
            if (!targetLocation && allStores.length > 0) {
              const store = allStores.find((s) => s.id === item.storeId);
              if (store && store.location) {
                targetLocation = store.location;
              }
            }

            if (targetLocation) {
              const fee = calculateDeliveryFeeAlgorithm(
                targetLocation,
                userLocation,
                1000,
                (item as any).cat,
                false
              );
              const basePrice = (item as any).basePrice || item.price;
              itemTotal = (basePrice + fee) * item.quantity;
            }
          }

          subtotal += itemTotal;
          if (itemIsLaundry) {
            laundrySubtotal += itemTotal;
          }

          if (userLocation && itemIsLaundry && item.isDeliverySelected !== false) {
            let targetLocation = item.location;
            if (!targetLocation && allStores.length > 0) {
              const store = allStores.find((s) => s.id === item.storeId);
              if (store && store.location) {
                targetLocation = store.location;
              }
            }

            if (targetLocation) {
              const fee = calculateDeliveryFeeAlgorithm(
                targetLocation,
                userLocation,
                1000,
                (item as any).cat,
                true
              );
              if (fee > maxRoundedFee) maxRoundedFee = fee;
              deliveryFee += fee * item.quantity;
            }
          }
        });

        if (hasLaundry && get().laundryPreferences.globalExpressSelected) {
          const expressClientFee = get().laundryRatios?.expressClient ?? 2000;
          globalExpressFee = (maxRoundedFee > 0 ? maxRoundedFee : 1500) * 2 + expressClientFee;
        }

        const deliveryTimeStr = get().laundryPreferences.deliverytime
          ? String(get().laundryPreferences.deliverytime).trim()
          : '';
        if (hasLaundry && deliveryTimeStr.length > 0) {
          const baseFeeForPickup = deliveryFee > 0 ? deliveryFee : maxRoundedFee > 0 ? maxRoundedFee : 2000;
          pickupFee = baseFeeForPickup * 2;
        }

        // Calculate 5% Service Charge specifically for Laundry items
        serviceFee = hasLaundry && laundrySubtotal > 0 ? Math.round(laundrySubtotal * 0.05) : 0;
        const total = subtotal + deliveryFee + globalExpressFee + pickupFee + serviceFee;

        return {
          subtotal: Math.round(subtotal),
          deliveryFee: Math.round(deliveryFee),
          expressFee: Math.round(globalExpressFee),
          pickupFee: Math.round(pickupFee),
          serviceFee: Math.round(serviceFee),
          total: Math.round(total),
          itemCount,
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
        items.forEach((item) => {
          const itemIsLaundry = (item as any).cat === 'Nguo';
          let itemTotal = calculateItemTotal(item, ratios || undefined);

          if (!itemIsLaundry && userLocation && item.isDeliverySelected !== false) {
            let targetLocation = item.location;
            if (!targetLocation && allStores.length > 0) {
              const store = allStores.find((s) => s.id === item.storeId);
              if (store && store.location) {
                targetLocation = store.location;
              }
            }

            if (targetLocation) {
              const fee = calculateDeliveryFeeAlgorithm(
                targetLocation,
                userLocation,
                1000,
                (item as any).cat,
                false
              );
              const basePrice = (item as any).basePrice || item.price;
              itemTotal = (basePrice + fee) * item.quantity;
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
