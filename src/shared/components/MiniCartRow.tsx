import React from 'react';
import { Trash2 } from 'lucide-react';
import { useCartStore, CartItem } from '../../features/cart/store/useCartStore';
import { useLocationStore } from '../../features/location/store/useLocationStore';
import { APP_SETTINGS } from '@/core/config/settings';

interface MiniCartRowProps {
  cartItem: CartItem;
  removeFromCart: (productId: string) => void;
}

export const MiniCartRow: React.FC<MiniCartRowProps> = ({ cartItem, removeFromCart }) => {
  // Subscribe to location so the component re-renders when location changes
  useLocationStore((state) => state.currentLocation);
  
  const getDynamicItemPrices = useCartStore((state) => state.getDynamicItemPrices);
  const dynamicPrices = getDynamicItemPrices();
  const rowTotal = dynamicPrices[cartItem.productId] ?? (cartItem.price * cartItem.quantity);

  return (
    <div className="group/row flex justify-between items-center text-sm py-1 rounded-lg hover:bg-muted/50 px-1 transition-colors">
      <span className="font-bold text-muted-foreground line-clamp-1 flex-1">
        {cartItem.quantity}x {cartItem.name}
      </span>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <span className="font-extrabold text-foreground">
          {APP_SETTINGS.currency} {rowTotal.toLocaleString()}
        </span>
        <button
          onClick={() => removeFromCart(cartItem.productId)}
          title="Remove item"
          aria-label={`Remove ${cartItem.name}`}
          className="focus:opacity-100 w-6 h-6 flex items-center justify-center rounded-full text-destructive hover:text-primary hover:bg-primary/10 transition-all ml-1"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
