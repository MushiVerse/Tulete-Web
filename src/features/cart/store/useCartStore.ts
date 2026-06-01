import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  storeId: string;
  storeName: string;
}

interface CartState {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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

      updateQuantity: (productId, quantity) => set((state) => {
        if (quantity <= 0) {
          return { items: state.items.filter((i) => i.productId !== productId) };
        }
        return {
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        };
      }),

      clearCart: () => set({ items: [] }),

      getTotals: () => {
        const items = get().items;
        const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
        const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        
        // Dynamic mock rules for delivery and service fees
        const deliveryFee = subtotal > 0 ? (subtotal > 1500 ? 0 : 150) : 0; // Free delivery over 1500 KES
        const serviceFee = subtotal > 0 ? 45 : 0;
        const total = subtotal + deliveryFee + serviceFee;

        return { subtotal, deliveryFee, serviceFee, total, itemCount };
      },
    }),
    {
      name: 'tulete-cart-storage',
    }
  )
);
