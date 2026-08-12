import React, { useState } from 'react';
import { ShoppingBag, ArrowRight, Trash2, X } from 'lucide-react';
import { useCartStore } from '../../features/cart/store/useCartStore';
import { APP_SETTINGS } from '../../core/config/settings';
import { formatPrice } from '../utils/formatPrice';
import { Button } from './ui/Button';
import { MiniCartRow } from './MiniCartRow';

interface CartWidgetProps {
  onCheckout: () => void;
  className?: string;
}

export const CartWidget: React.FC<CartWidgetProps> = ({ onCheckout, className = '' }) => {
  const [isCartClosed, setIsCartClosed] = useState(false);
  const { items: cartItems, removeFromCart, clearCart, getTotals } = useCartStore();
  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;

  if (isCartClosed) {
    return (
      <div className={`bg-card border border-border rounded-3xl p-4 shadow-sm ${className}`}>
        <button
          onClick={() => setIsCartClosed(false)}
          className="w-full flex items-center justify-between text-xs font-extrabold text-foreground hover:text-primary transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span>Your Cart ({cartItems.length})</span>
          </div>
          <span className="text-primary font-bold">{APP_SETTINGS.currency} {formatPrice(cartTotal)}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-3xl p-5 shadow-sm relative ${className}`}>
      {/* Header with Title, Icon & Close Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Your Cart</h2>
        </div>
        <button
          onClick={() => setIsCartClosed(true)}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Close Cart temporarily"
          aria-label="Close Cart"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {hasItems ? (
        <>
          {/* Cart Item Rows */}
          <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto scrollbar-none">
            {cartItems.map((cartItem) => (
              <MiniCartRow 
                key={cartItem.productId} 
                cartItem={cartItem} 
                removeFromCart={removeFromCart} 
              />
            ))}
          </div>

          {/* Footer with Total, Checkout & Clear All */}
          <div className="pt-4 border-t border-border/50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-muted-foreground">Total</span>
              <span className="text-xl font-extrabold text-foreground">{APP_SETTINGS.currency} {formatPrice(cartTotal)}</span>
            </div>
            <Button
              onClick={onCheckout}
              className="w-full rounded-xl py-6 font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              Checkout Now <ArrowRight className="w-4 h-4" />
            </Button>
            <button
              onClick={() => clearCart()}
              className="w-full mt-3 text-xs font-bold text-destructive hover:text-destructive/80 transition-colors py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/15 flex items-center justify-center gap-1.5 cursor-pointer"
              title="Clear all items from cart"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Cart
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <ShoppingBag className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-sm font-bold text-muted-foreground">Your cart is empty</p>
          <p className="text-xs text-muted-foreground mt-1">Add items to get started</p>
        </div>
      )}
    </div>
  );
};
