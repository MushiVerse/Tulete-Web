import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
}

export const calculateItemTotal = (item: CartItem): number => {
  const itemBaseSubtotal = item.price * item.quantity;
  let itemTotal = 0;

  if (item.isLaundry) {
    if (item.washingSelected !== false) itemTotal += itemBaseSubtotal;
    if (item.ironingSelected) itemTotal += itemBaseSubtotal * 0.95;
    if (item.packagingSelected) itemTotal += itemBaseSubtotal * 0.60;
    if (item.expressSelected) itemTotal += (item.quantity * 1900); 
  } else {
    // Food and Products: Base Price + Delivery Fee (if Delivery is selected)
    itemTotal = itemBaseSubtotal;
    // We default to true (Delivery) if undefined, just like Flutter
    if (item.isDeliverySelected !== false) {
      itemTotal += (250 * item.quantity); // 250 ${APP_SETTINGS.currency} flat delivery fee per item count
    }
  }
  
  return Math.round(itemTotal);
};

interface CartState {
  items: CartItem[];
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
        
        items.forEach(item => {
          subtotal += calculateItemTotal(item);
        });

        // Dynamic mock rules for delivery and service fees
        const deliveryFee = subtotal > 0 ? (subtotal > 1500 ? 0 : 150) : 0; // Free delivery over 1500 ${APP_SETTINGS.currency}
        const serviceFee = subtotal > 0 ? 45 : 0;
        const total = subtotal + deliveryFee + serviceFee;

        return { subtotal: Math.round(subtotal), deliveryFee, serviceFee, total: Math.round(total), itemCount };
      },
    }),
    {
      name: 'tulete-cart-storage',
    }
  )
);
