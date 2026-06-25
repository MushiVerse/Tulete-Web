import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, calculateItemTotal } from '../store/useCartStore';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Switch } from '../../../shared/components/ui/Switch';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, Store, X, Flame, Package, Zap, Sparkles, Clock, FileText, XCircle, MapPin } from 'lucide-react';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';

export const CartPage = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, clearCart, getTotals, toggleDelivery, laundryPreferences, setLaundryPreferences, updateLaundryItemConfig, applyLaundryServicesToAll, clearAllLaundryServices } = useCartStore();
  const { subtotal, deliveryFee, serviceFee, total, itemCount } = getTotals();
  
  const isLaundryOrder = items.some(i => i.isLaundry || i.storeId === 'laundry' || i.storeName?.toLowerCase().includes('laundry'));

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
      <ContentContainer size="lg" className="h-full">
        <div className="flex flex-col lg:flex-row gap-8 lg:h-[calc(100vh-6rem)] items-stretch pb-6 pt-2">
        {/* Left Column Wrapper */}
        <div className="flex-1 w-full flex flex-col gap-4 lg:pr-2 min-w-0 min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Shopping Cart</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
              <button
                onClick={() => clearCart()}
                title="Clear all items"
                className="flex items-center gap-1.5 text-xs font-semibold text-destructive hover:text-primary hover:bg-primary/10 px-3 py-1.5 rounded-full border border-border hover:border-primary/20 transition-all group"
              >
                <X className="w-3.5 h-3.5" />
                Clear Cart
              </button>
            </div>
          </div>

          {/* Scrollable Cart Items Container */}
          <div className="flex-1 lg:overflow-y-auto scrollbar-none space-y-3 min-h-0 pr-1 pb-4">
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
                          {calculateItemTotal(item).toLocaleString()} {APP_SETTINGS.currency}
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



                      {/* Per-Item Laundry Customization */}
                      {item.isLaundry && (
                        <div className="flex items-center flex-wrap gap-2 mt-4 pt-3 border-t border-border/50">
                          {[
                            { key: 'iron', label: 'Iron', prop: 'ironingSelected', icon: Flame },
                            { key: 'pack', label: 'Package', prop: 'packagingSelected', icon: Package },
                            { key: 'exp', label: 'Express', prop: 'expressSelected', icon: Zap }
                          ].map(({ key, label, prop, icon: Icon }) => {
                            const isSelected = item[prop as keyof typeof item];
                            return (
                              <button
                                key={key}
                                onClick={() => updateLaundryItemConfig(item.productId, { [prop]: !isSelected })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold transition-all border shadow-sm ${
                                  isSelected 
                                    ? 'bg-primary border-primary text-primary-foreground scale-105' 
                                    : 'bg-card border-border text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'fill-current' : ''}`} />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Per-Item Non-Laundry Customization (Pick Up Toggle) */}
                      {!item.isLaundry && (
                        <div className="flex items-center flex-wrap gap-2 mt-4 pt-3 border-t border-border/50">
                          <button
                            onClick={() => toggleDelivery(item.productId, item.isDeliverySelected === false ? true : false)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold transition-all border shadow-sm ${
                              item.isDeliverySelected === false 
                                ? 'bg-primary border-primary text-primary-foreground scale-105' 
                                : 'bg-card border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            <MapPin className={`w-3.5 h-3.5 ${item.isDeliverySelected === false ? 'fill-current' : ''}`} />
                            Pick Up (No Distance Fee)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete button — revealed on row hover */}
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-destructive hover:text-primary p-1.5 sm:p-2 rounded-full hover:bg-primary/10 transition-all self-start shrink-0 focus:opacity-100"
                      title="Remove item"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Order Preferences Section in Cart (Scrolls with items) */}
            {items.length > 0 && (
              <div className="shrink-0 pt-4">
                <Card className="border border-primary/20 bg-primary/5 shadow-sm rounded-3xl overflow-hidden relative">
              {/* Decorative Accent */}
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              
              <div className="p-6 sm:p-8 flex flex-col gap-6">
                
                {/* Header */}
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-extrabold text-foreground mb-1">
                    <Sparkles className="w-5 h-5 text-primary" />
                    {isLaundryOrder ? 'Laundry Services' : 'Order Preferences'}
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    {isLaundryOrder ? 'Customize your laundry order settings.' : 'Add special instructions and pickup time.'}
                  </p>
                </div>

                {/* Bulk Actions (Only for Laundry) */}
                {isLaundryOrder && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Bulk Apply to All</h3>
                    <button 
                      onClick={clearAllLaundryServices}
                      className="text-[10px] font-bold flex items-center gap-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1 rounded-full transition-colors"
                    >
                      <XCircle className="w-3 h-3" /> Reset Services
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'iron', label: 'Ironing', prop: 'ironingSelected', icon: Flame },
                      { key: 'pack', label: 'Packaging', prop: 'packagingSelected', icon: Package },
                      { key: 'exp', label: 'Express (24h)', prop: 'expressSelected', icon: Zap },
                    ].map(({ key, label, prop, icon: Icon }) => {
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => applyLaundryServicesToAll({ [prop]: true })}
                          className="flex flex-col sm:flex-row items-center justify-center gap-2 border rounded-2xl p-3 transition-all border-border hover:bg-primary hover:border-primary hover:text-white text-foreground text-[11px] sm:text-xs font-extrabold shadow-sm active:scale-95 bg-card group"
                        >
                          <Icon className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}

                {/* Inputs */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${isLaundryOrder ? 'pt-5 border-t border-border/50' : ''}`}>
                  <div className="space-y-2">
                    <label htmlFor="deliverytime" className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                      <Clock className="w-4 h-4 text-primary" />
                      Preferred Pickup Time
                    </label>
                    <input
                      id="deliverytime"
                      type="datetime-local"
                      value={laundryPreferences.deliverytime}
                      onChange={(e) => setLaundryPreferences({ deliverytime: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full h-12 rounded-xl border border-border bg-card px-4 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="laundry-instructions" className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                      <FileText className="w-4 h-4 text-primary" />
                      Special Instructions
                    </label>
                    <textarea
                      id="laundry-instructions"
                      value={laundryPreferences.instructions}
                      onChange={(e) => setLaundryPreferences({ instructions: e.target.value })}
                      placeholder="e.g. Separate whites from colours..."
                      rows={1}
                      className="w-full min-h-[48px] rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            </Card>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Summary (Fixed on right side) */}
        <div className="w-full lg:w-[350px] shrink-0">
          <Card className="p-6 bg-muted border border-border shadow-md">
            <h2 className="text-xl font-bold text-foreground mb-4">Summary</h2>
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between text-base font-extrabold text-foreground">
                <span>
                  {isLaundryOrder 
                    ? `Total + Pickup Fee (${deliveryFee.toLocaleString()})`
                    : 'Total'}
                </span>
                <span>{total.toLocaleString()} {APP_SETTINGS.currency}</span>
              </div>
            </div>


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
