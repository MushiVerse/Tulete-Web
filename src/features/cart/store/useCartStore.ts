import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useLocationStore } from '../../location/store/useLocationStore';
import { storeService } from '../../stores/services/storeService';
import { APP_SETTINGS } from '@/core/config/settings';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { calculateDeliveryFeeAlgorithm, getDeliveryFee, calculateLaundryServiceFee } from '../../location/hooks/useDynamicPrice';

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
  isFood?: boolean;
  isProduct?: boolean;
  isDeliverySelected?: boolean; // True means Delivery, False means Pickup
  packagepickup?: boolean;
  deliverySlot?: 'Lunch' | 'Dinner' | 'ASAP' | string;
  brand?: string;

  // App-specific category ("Food", "Nguo", "Product") used by backend schema
  cat?: string;
  category?: string;
  location?: { lat: number; lng: number };
  idadi?: number;
  maxQuantity?: number;
  isReordered?: boolean;
}

export interface LaundryRatios {
  iron: number;
  package: number;
  vip: number;
  wash: number;
  expressClient: number;
}

export function isLaundryItem(item: any): boolean {
  if (!item) return false;
  if (item.isLaundry === true) return true;
  if (item.isLaundry === false) return false;
  const cat = String(item.cat || item.category || item.specCat || item.subCat || item._collection || '').toLowerCase().trim();
  return cat === 'nguo' || cat === 'laundry' || cat === 'cloths' || cat.includes('laundry') || cat.includes('nguo');
}

export function isFoodItem(item: any): boolean {
  if (!item || isLaundryItem(item)) return false;
  if (item.isFood === true) return true;

  const cat = String(item.cat || item.category || item.specCat || item.subCat || item.mainCategory || '').toLowerCase().trim();
  const foodKeywords = [
    'food', 'foods', 'chakula', 'diko', 'restaurant', 'meal', 'meals', 
    'fast food', 'burgers', 'burger', 'pizza', 'breakfast', 'lunch', 
    'dinner', 'swahili', 'nyama choma', 'beverages', 'drinks', 'drink',
    'juice', 'smoothie', 'snacks', 'desserts', 'bakery', 'cakes', 
    'chicken', 'chips', 'combo', 'coffee', 'tea'
  ];

  if (foodKeywords.some(k => cat.includes(k))) return true;

  const coll = String(item._collection || '').toLowerCase().trim();
  const recType = String(item.recordType || item.type || '').toLowerCase().trim();
  if (coll === 'foods' || recType === 'food') return true;

  const slot = String(item.deliverySlot || '').toLowerCase().trim();
  if (['lunch', 'dinner', 'mchana', 'usiku', 'asap'].includes(slot)) return true;

  if (item.isFood === false) return false;

  return false;
}

export function isProductItem(item: any): boolean {
  if (!item) return false;
  return !isLaundryItem(item) && !isFoodItem(item);
}

export const calculateItemTotal = (item: CartItem, ratios?: LaundryRatios): number => {
  const washPrice = ((item as any).basePrice || item.price) * item.quantity;

  if (isLaundryItem(item)) {
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

export const getStoreDeliveryFee = (
  storeItems: CartItem[],
  userLocation: { lat: number; lng: number } | null | string,
  deliveryRation: number = 1000
): number => {
  if (!userLocation || !storeItems || storeItems.length === 0) return 0;

  const isLaundry = storeItems.some((i) => (i as any).cat === 'Nguo' || i.isLaundry);
  if (isLaundry) return 0;

  const needsDelivery = storeItems.some((i) => i.isDeliverySelected !== false);
  if (!needsDelivery) return 0;

  const firstItem = storeItems[0];
  let targetLocation: { lat: number; lng: number } | string | undefined = firstItem.location;
  if (!targetLocation) {
    const allStores = storeService.getMockStores();
    const rawSId = firstItem.storeId && firstItem.storeId !== 'unknown' ? firstItem.storeId : null;
    const store = allStores.find(
      (s) => (rawSId && s.id === rawSId) || s.id === firstItem.storeId || s.name?.toLowerCase() === firstItem.storeName?.toLowerCase()
    );
    if (store && store.location) {
      targetLocation = store.location;
    }
  }

  if (!targetLocation) {
    targetLocation = "-6.18541, 35.7671293";
  }

  return calculateDeliveryFeeAlgorithm(
    targetLocation,
    userLocation,
    deliveryRation,
    (firstItem as any).cat,
    false
  );
};

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

          const isLaundry = isLaundryItem(item);
          const isFd = isFoodItem(item);
          const isProd = !isLaundry && !isFd;

          const hour = new Date().getHours();
          const bVal = String((item as any).brand || (item as any).pbrand || (item as any).FBrand || (item as any).LBrand || '').toLowerCase().trim();
          const defaultFoodSlot = bVal === 'now' ? 'ASAP' : (hour < 15 ? 'Lunch' : 'Dinner');

          const defaultSlot = isProd ? 'Product' : (isLaundry ? 'Laundry' : (item.deliverySlot || defaultFoodSlot));
          const catValue = isProd ? 'Product' : (isLaundry ? 'Nguo' : (item.cat || (item as any).category || 'Food'));

          return { 
            items: [
              ...state.items, 
              { 
                ...item, 
                cat: catValue, 
                category: catValue,
                isLaundry, 
                isFood: isFd, 
                isProduct: isProd,
                deliverySlot: defaultSlot, 
                price: basePrice, 
                basePrice, 
                quantity: 1, 
                maxQuantity: stock 
              }
            ] 
          };
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
        let globalExpressFee = 0;
        let pickupFee = 0;
        let serviceFee = 0;
        let maxRoundedFee = 0;
        let hasLaundry = false;

        let userLocation = null;
        try {
          userLocation = useLocationStore.getState().currentLocation;
        } catch (e) {
          console.warn('Could not load location/store service for dynamic pricing');
        }

        let laundrySubtotal = 0;
        const ratios = get().laundryRatios;

        items.forEach((item) => {
          const itemIsLaundry = (item as any).cat === 'Nguo' || item.isLaundry;
          if (itemIsLaundry) hasLaundry = true;

          const baseItemTotal = calculateItemTotal(item, ratios || undefined);
          const unitDeliveryFee = getDeliveryFee(
            userLocation,
            item.location,
            item.storeId,
            itemIsLaundry,
            item.isDeliverySelected,
            (item as any).cat
          );
          const totalDeliveryFee = unitDeliveryFee * item.quantity;
          const itemTotalWithDelivery = baseItemTotal + totalDeliveryFee;

          subtotal += itemTotalWithDelivery;
          if (unitDeliveryFee > maxRoundedFee) maxRoundedFee = unitDeliveryFee;

          if (itemIsLaundry) {
            laundrySubtotal += baseItemTotal;
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
          const baseFeeForPickup = maxRoundedFee > 0 ? maxRoundedFee : 2000;
          pickupFee = baseFeeForPickup * 2;
        }

        // Calculate dynamic Service Charge specifically for Laundry items (cat === 'Nguo') based on distance algorithm (once per laundry item entry in cart)
        const laundryItems = items.filter((i) => (i as any).cat === 'Nguo' || i.isLaundry);
        if (laundryItems.length > 0) {
          serviceFee = laundryItems.reduce((acc, item) => {
            if (item.isDeliverySelected === false || (item as any).packagepickup === true) return acc;
            const storeLoc = item.location || item.storeId;
            const unitFee = calculateLaundryServiceFee(userLocation, storeLoc);
            return acc + unitFee;
          }, 0);
        } else {
          serviceFee = 0;
        }
        const total = subtotal + globalExpressFee + pickupFee + serviceFee;

        return {
          subtotal: Math.round(subtotal),
          deliveryFee: 0, // Delivery fee is inclusive in item prices as on Home Page
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
        const ratios = get().laundryRatios;

        let userLocation = null;
        try {
          userLocation = useLocationStore.getState().currentLocation;
        } catch (e) {
          console.warn('Could not load location/store service for dynamic pricing');
        }

        items.forEach((item) => {
          const baseItemTotal = calculateItemTotal(item, ratios || undefined);
          const itemIsLaundry = (item as any).cat === 'Nguo' || item.isLaundry;
          const unitDeliveryFee = getDeliveryFee(
            userLocation,
            item.location,
            item.storeId,
            itemIsLaundry,
            item.isDeliverySelected,
            (item as any).cat
          );
          const totalDeliveryFee = unitDeliveryFee * item.quantity;
          result[item.productId] = Math.round(baseItemTotal + totalDeliveryFee);
        });

        return result;
      },
    }),
    {
      name: 'tulete-cart-storage',
    }
  )
);
