import { formatPrice } from '../../shared/utils/formatPrice';
import React from 'react';
import { Trash2 } from 'lucide-react';
import { useCartStore, CartItem } from '../../features/cart/store/useCartStore';
import { useLocationStore } from '../../features/location/store/useLocationStore';
import { useCurrencyLanguageStore } from '../../core/config/currencyStore';

interface MiniCartRowProps {
  cartItem: CartItem;
  removeFromCart: (productId: string) => void;
}

export const MiniCartRow: React.FC<MiniCartRowProps> = ({ cartItem, removeFromCart }) => {
  useLocationStore((state) => state.currentLocation);
  const { currentLanguage } = useCurrencyLanguageStore();
  
  const getDynamicItemPrices = useCartStore((state) => state.getDynamicItemPrices);
  const dynamicPrices = getDynamicItemPrices();
  const rowTotal = dynamicPrices[cartItem.productId] ?? (cartItem.price * cartItem.quantity);

  return (
    <div className="group/row flex justify-between items-center text-sm py-1.5 rounded-xl hover:bg-muted/60 px-2.5 transition-colors border border-transparent hover:border-border/40">
      <span className="font-bold text-muted-foreground line-clamp-1 flex-1 text-xs">
        <span className="text-primary font-extrabold mr-1.5">{cartItem.quantity}x</span>
        <span className="notranslate" translate="no">{cartItem.name}</span>
      </span>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className="font-extrabold text-foreground text-xs">
          {currentLanguage.symbol} {formatPrice(rowTotal)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeFromCart(cartItem.productId);
          }}
          title="Remove item"
          aria-label={`Remove ${cartItem.name}`}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
