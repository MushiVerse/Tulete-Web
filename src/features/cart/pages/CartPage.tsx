import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, calculateItemTotal } from '../store/useCartStore';
import { useLocationStore } from '../../location/store/useLocationStore';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Switch } from '../../../shared/components/ui/Switch';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, Store, X, Flame, Package, Zap, Sparkles, Clock, FileText, XCircle, MapPin } from 'lucide-react';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';
import { useLanguageStore } from '../../../core/i18n/useLanguageStore';
import { useFirestoreDocument } from '../../../core/hooks/useFirestoreQuery';
import { productService } from '../../products/services/productService';

const CartItemCard = ({ item, updateQuantity, removeFromCart, toggleDelivery, updateLaundryItemConfig }: any) => {
  // Subscribe to location so re-renders happen on location change
  useLocationStore((state) => state.currentLocation);
  const getDynamicItemPrices = useCartStore((state) => state.getDynamicItemPrices);
  const dynamicPrices = getDynamicItemPrices();
  const itemTotal = dynamicPrices[item.productId] ?? (item.price * item.quantity);

  const targetId = item.baseProductId || item.productId || item.id || '';
  const { data: fetchedDoc } = useFirestoreDocument(
    ['cart_item_firestore', targetId],
    productService,
    targetId
  );
  
  return (
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
            {formatPrice(itemTotal)} {APP_SETTINGS.currency}
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
              onClick={() => {
                if (item.idadi !== undefined && item.quantity >= item.idadi) {
                  alert(`Cannot add more. Only ${item.idadi} items available in stock.`);
                  return;
                }
                updateQuantity(item.productId, item.quantity + 1);
              }}
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
              { key: 'vip', label: 'VIP', prop: 'vipSelected', icon: Sparkles }
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

        {/* Per-Item Non-Laundry Customization (Food options + Pick Up Toggle) */}
        {!item.isLaundry && (() => {
          const isFoodItem = (item.cat && item.cat.toLowerCase() === 'food') || 
                             ((item as any).category && (item as any).category.toLowerCase() === 'food') || 
                             (fetchedDoc as any)?.cat === 'Food' || 
                             (fetchedDoc as any)?._collection === 'foods';

          return (
            <div className="flex items-center flex-wrap gap-2 mt-4 pt-3 border-t border-border/50">
              {/* Food Specific Delivery Slots (ONLY for Food items) */}
              {isFoodItem && (() => {
                const hour = new Date().getHours();
                const bVal = String(item.brand || (item as any).pbrand || (item as any).FBrand || (item as any).LBrand || '').toLowerCase().trim();
                const isBrandNow = bVal === 'now';
                const updateFoodItemSlot = useCartStore.getState().updateFoodItemSlot;
                const currentSlot = item.deliverySlot || (isBrandNow ? 'ASAP' : (hour < 15 ? 'Lunch' : 'Dinner'));

                return (
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-xs font-bold text-muted-foreground mr-1">Delivery Time:</span>
                    
                    {/* ASAP Option (Show when brand === "now") */}
                    {isBrandNow && (
                      <button
                        type="button"
                        onClick={() => updateFoodItemSlot(item.productId, currentSlot === 'ASAP' ? '' : 'ASAP')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold transition-all border shadow-sm ${
                          currentSlot === 'ASAP'
                            ? 'bg-amber-500 border-amber-500 text-white scale-105 shadow-amber-500/20'
                            : 'bg-card border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        ASAP
                      </button>
                    )}

                    {/* Lunch Option (if time is before 15:00) */}
                    {hour < 15 && (
                      <button
                        type="button"
                        onClick={() => updateFoodItemSlot(item.productId, currentSlot === 'Lunch' ? '' : 'Lunch')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold transition-all border shadow-sm ${
                          currentSlot === 'Lunch'
                            ? 'bg-orange-500 border-orange-500 text-white scale-105 shadow-orange-500/20'
                            : 'bg-card border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Lunch
                      </button>
                    )}

                    {/* Dinner Option (if time is After 15:00) */}
                    {hour >= 15 && (
                      <button
                        type="button"
                        onClick={() => updateFoodItemSlot(item.productId, currentSlot === 'Dinner' ? '' : 'Dinner')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold transition-all border shadow-sm ${
                          currentSlot === 'Dinner'
                            ? 'bg-indigo-500 border-indigo-500 text-white scale-105 shadow-indigo-500/20'
                            : 'bg-card border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Dinner
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Pick Up Toggle */}
              <button
                type="button"
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
          );
        })()}
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
  );
};

export const CartPage = () => {
  const navigate = useNavigate();
  const t = useLanguageStore((state) => state.t);
  const { items, updateQuantity, removeFromCart, clearCart, getTotals, toggleDelivery, laundryPreferences, setLaundryPreferences, updateLaundryItemConfig, applyLaundryServicesToAll, clearAllLaundryServices } = useCartStore();
  const { currentLocation } = useLocationStore();
  const [totals, setTotals] = useState(getTotals());

  // Recalculate totals whenever location, items, express selection, or delivery time change
  useEffect(() => {
    setTotals(getTotals());
  }, [currentLocation, items, laundryPreferences?.globalExpressSelected, laundryPreferences?.deliverytime]);
  const { subtotal, deliveryFee, expressFee, pickupFee, serviceFee, total, itemCount } = getTotals();
  
  const isLaundryOrder = items.some(i => (i as any).cat === 'Nguo' || i.isLaundry || i.storeId === 'laundry' || i.storeName?.toLowerCase().includes('laundry'));

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
              onClick={() => navigate('/explore')} 
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
                  <CartItemCard 
                    item={item} 
                    updateQuantity={updateQuantity} 
                    removeFromCart={removeFromCart} 
                    toggleDelivery={toggleDelivery} 
                    updateLaundryItemConfig={updateLaundryItemConfig} 
                  />
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
                      { key: 'vip', label: 'VIP', prop: 'vipSelected', icon: Sparkles },
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
                  {isLaundryOrder && (
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
                  )}

                  <div className={`space-y-2 ${!isLaundryOrder ? 'md:col-span-2' : ''}`}>
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

                  {isLaundryOrder && (
                    <div className="space-y-2 md:col-span-2">
                      <button
                        onClick={() => setLaundryPreferences({ globalExpressSelected: !laundryPreferences.globalExpressSelected })}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm ${
                          laundryPreferences.globalExpressSelected
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-card border-border hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${laundryPreferences.globalExpressSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                            <Zap className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold">Express</p>
                            <p className={`text-xs ${laundryPreferences.globalExpressSelected ? 'text-primary/80' : 'text-muted-foreground'}`}>
                              Fast track your entire order processing
                            </p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                          laundryPreferences.globalExpressSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                          {laundryPreferences.globalExpressSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </button>
                    </div>
                  )}
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
            
            <div className="space-y-3 text-sm mb-6 border-b border-border/50 pb-4">
              <div className="flex justify-between text-muted-foreground font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)} {APP_SETTINGS.currency}</span>
              </div>
              {/* Delivery Fee hidden per request, total calculation remains identical */}
              {expressFee > 0 && (
                <div className="flex justify-between text-primary font-bold">
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary fill-primary/20" /> Express Charges</span>
                  <span>+{formatPrice(expressFee)} {APP_SETTINGS.currency}</span>
                </div>
              )}
              {pickupFee > 0 && (
                <div className="flex justify-between text-primary font-bold">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> Pickup Charge (2x Delivery)</span>
                  <span>+{formatPrice(pickupFee)} {APP_SETTINGS.currency}</span>
                </div>
              )}
              {serviceFee > 0 && (
                <div className="flex justify-between text-muted-foreground font-semibold">
                  <span>Service Fee (5%)</span>
                  <span>{formatPrice(serviceFee)} {APP_SETTINGS.currency}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between text-base font-extrabold text-foreground">
                <span>Total to Pay</span>
                <span className="text-primary font-black text-lg">{formatPrice(total)} {APP_SETTINGS.currency}</span>
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
