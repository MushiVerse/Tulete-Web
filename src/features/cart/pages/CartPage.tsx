import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, calculateItemTotal } from '../store/useCartStore';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Switch } from '../../../shared/components/ui/Switch';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, Store, X } from 'lucide-react';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';

export const CartPage = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, clearCart, getTotals, toggleDelivery } = useCartStore();
  const { subtotal, deliveryFee, serviceFee, total, itemCount } = getTotals();

  if (items.length === 0) {
    return (
      <PageContainer>
        <ContentContainer size="full" className="flex flex-col items-center justify-center min-h-[70vh]">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-md mx-auto"
          >
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-3 text-foreground">Your Cart is Empty</h2>
            <p className="text-muted-foreground mb-8 text-base">
              Looks like you haven't added anything to your cart yet. Let's find some amazing items for you!
            </p>
            <Button 
              onClick={() => navigate('/discover')} 
              size="lg"
              className="w-full sm:w-auto font-semibold px-8 shadow-lg hover:shadow-xl transition-all"
            >
              Start Discovering
            </Button>
          </motion.div>
        </ContentContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ContentContainer size="lg">
        <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items List */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Shopping Cart</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
              <button
                onClick={() => clearCart()}
                title="Clear all items"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 rounded-full border border-border hover:border-red-200 dark:hover:border-red-800 transition-all group"
              >
                <X className="w-3.5 h-3.5" />
                Clear Cart
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="p-3 sm:p-4 flex gap-3 sm:gap-4 items-start sm:items-center bg-card border border-border shadow-sm hover:shadow-md transition-all group/item">
                    {/* Item Image */}
                    <img 
                      src={item.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"} 
                      alt={item.name} 
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                    />

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-sm sm:text-base mb-0.5">{item.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2 truncate">From {item.storeName}</p>
                      
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        {/* Price */}
                        <span className="font-bold text-foreground text-sm sm:text-base">
                          {calculateItemTotal(item).toLocaleString()} ${APP_SETTINGS.currency}
                        </span>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-1.5 sm:gap-2 border border-border rounded-lg p-0.5 sm:p-1 bg-slate-50 dark:bg-slate-800">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-slate-600 hover:text-primary dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                          >
                            <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <span className="w-5 sm:w-6 text-center text-xs sm:text-sm font-bold text-foreground">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-slate-600 hover:text-primary dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                          >
                            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Delivery vs Pickup Toggle for Food/Products */}
                      {!item.isLaundry && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold transition-colors ${item.isDeliverySelected === false ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                            <Store className="w-3.5 h-3.5" /> Pickup
                          </div>
                          <Switch 
                            checked={item.isDeliverySelected !== false} 
                            onCheckedChange={(checked) => toggleDelivery(item.productId, checked)}
                            className="scale-75"
                          />
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold transition-colors ${item.isDeliverySelected !== false ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                            <Truck className="w-3.5 h-3.5" /> Delivery (+250)
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delete button — revealed on row hover */}
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 p-1.5 sm:p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-all self-start shrink-0 focus:opacity-100"
                      title="Remove item"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="w-full lg:w-[350px]">
          <Card className="p-6 sticky top-6 bg-muted border border-border shadow-md">
            <h2 className="text-xl font-bold text-foreground mb-4">Summary</h2>
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{subtotal.toLocaleString()} {APP_SETTINGS.currency}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery Fee</span>
                {deliveryFee === 0 ? (
                  <span className="font-semibold text-emerald-600">FREE</span>
                ) : (
                  <span className="font-medium text-foreground">{deliveryFee.toLocaleString()} {APP_SETTINGS.currency}</span>
                )}
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Service Fee</span>
                <span className="font-medium text-foreground">{serviceFee.toLocaleString()} {APP_SETTINGS.currency}</span>
              </div>
              <div className="border-t border-border my-4"></div>
              <div className="flex justify-between text-base font-extrabold text-foreground">
                <span>Grand Total</span>
                <span>{total.toLocaleString()} {APP_SETTINGS.currency}</span>
              </div>
            </div>

            {deliveryFee > 0 && (
              <div className="bg-primary/5 rounded-lg p-3 text-xs text-primary mb-6 text-center font-medium">
                Add {(1500 - subtotal > 0 ? 1500 - subtotal : 0).toLocaleString()} {APP_SETTINGS.currency} more for FREE Delivery!
              </div>
            )}

            <Button
              onClick={() => navigate('/checkout')}
              className="w-full py-6 text-base font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              Proceed to Checkout
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Card>
        </div>
      </div>
      </ContentContainer>
    </PageContainer>
  );
};
