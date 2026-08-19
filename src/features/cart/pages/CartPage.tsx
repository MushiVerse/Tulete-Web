import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, calculateItemTotal, getStoreDeliveryFee, isLaundryItem, isFoodItem, isProductItem } from '../store/useCartStore';
import { useLocationStore } from '../../location/store/useLocationStore';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Switch } from '../../../shared/components/ui/Switch';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, Store, X, Flame, Package, Zap, Sparkles, Clock, FileText, XCircle, MapPin, Shirt, AlertCircle, AlertTriangle, RotateCcw, ChevronDown, ChevronUp, Navigation, Search, Check } from 'lucide-react';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';
import { useLanguageStore } from '../../../core/i18n/useLanguageStore';
import { useFirestoreDocument } from '../../../core/hooks/useFirestoreQuery';
import { productService } from '../../products/services/productService';
import { storeService } from '../../stores/services/storeService';
import { useThemeStore } from '../../../core/theme/useThemeStore';
import { LocationPickerModal, GOOGLE_MAPS_LIBRARIES } from '../../location/components/LocationPickerModal';
import { MiniMapPreview } from '../../location/components/MiniMapPreview';
import { useJsApiLoader } from '@react-google-maps/api';
import { locationService } from '../../location/services/locationService';

const CartItemCard = ({ item, updateQuantity, removeFromCart, toggleDelivery, updateLaundryItemConfig, toggleSelectItem }: any) => {
  // Subscribe to location so re-renders happen on location change
  useLocationStore((state) => state.currentLocation);
  const getDynamicItemPrices = useCartStore((state) => state.getDynamicItemPrices);
  const dynamicPrices = getDynamicItemPrices();
  const itemTotal = dynamicPrices[item.productId] ?? (item.price * item.quantity);
  const isSelected = item.isSelected !== false;

  const targetId = item.baseProductId || item.productId || item.id || '';
  const { data: fetchedDoc } = useFirestoreDocument(
    ['cart_item_firestore', targetId],
    productService,
    targetId
  );

  return (
    <Card className={`p-2.5 sm:p-3 flex gap-2.5 sm:gap-3 items-start sm:items-center bg-card border border-border shadow-xs hover:shadow-md transition-all group/item ${!isSelected ? 'opacity-60 bg-muted/40 border-dashed' : ''
      }`}>
      {/* Item Selection Checkbox */}
      <button
        type="button"
        onClick={() => toggleSelectItem(item.productId, !isSelected)}
        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md sm:rounded-lg border flex items-center justify-center transition-all shrink-0 self-center cursor-pointer ${isSelected
            ? 'bg-primary border-primary text-primary-foreground shadow-xs scale-105'
            : 'border-muted-foreground/40 bg-background hover:border-primary/60 hover:bg-primary/5'
          }`}
        title={isSelected ? `Unselect ${item.name}` : `Select ${item.name}`}
      >
        {isSelected && <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />}
      </button>
      {/* Item Image */}
      <img
        src={item.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"}
        alt={item.name}
        className="w-12 h-12 sm:w-16 sm:h-16 rounded-md sm:rounded-lg object-cover bg-slate-100 flex-shrink-0"
      />

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <h3 className="notranslate font-bold text-foreground truncate text-xs sm:text-sm mb-0.5" translate="no">{item.name}</h3>

        {/* Left in stock indicator */}
        {(() => {
          const limit = item.maxQuantity ?? item.idadi;
          if (limit !== undefined && limit > 0) {
            return (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1 block">
                {limit} left in stock
              </span>
            );
          }
          return null;
        })()}

        <div className="flex items-center justify-between flex-wrap gap-1.5">
          {/* Price */}
          <span className="font-extrabold text-foreground text-xs sm:text-sm">
            {formatPrice(itemTotal)} {APP_SETTINGS.currency}
          </span>

          {/* Quantity controls */}
          <div className="flex items-center gap-1 border border-border/80 dark:border-border rounded-lg p-0.5 bg-muted/80 dark:bg-muted/50 shadow-inner">
            <button
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-foreground hover:text-primary hover:bg-background rounded-md transition-all shadow-xs active:scale-95 border border-border/40"
              title="Decrease quantity"
            >
              <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
            <span className="w-4 sm:w-5 text-center text-xs font-extrabold text-foreground">
              {item.quantity}
            </span>
            <button
              onClick={() => {
                const limit = item.maxQuantity ?? item.idadi;
                if (limit !== undefined && limit > 0 && item.quantity >= limit) {
                  alert(`Cannot add more. Maximum available stock reached (${limit} left in stock).`);
                  return;
                }
                updateQuantity(item.productId, item.quantity + 1);
              }}
              className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-foreground hover:text-primary hover:bg-background rounded-md transition-all shadow-xs active:scale-95 border border-border/40"
              title="Increase quantity"
            >
              <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
          </div>
        </div>

        {/* Reordered Item Notice (Hides subservices & pickup button, uses previous settings) */}
        {item.isReordered ? (
          <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <RotateCcw className="w-3 h-3 text-primary shrink-0" />
            <span>Reordered item — using previous order settings & delivery point</span>
          </div>
        ) : (
          <>
            {/* Per-Item Laundry Customization */}
            {(item as any).cat === 'Nguo' && (() => {
              const isWash = item.washingSelected !== false;
              const isIron = Boolean(item.ironingSelected);
              const isPack = Boolean(item.packagingSelected);
              const isVip = Boolean(item.vipSelected);
              const hasAnyService = isWash || isIron || isPack || isVip;

              return (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <div className="flex items-center flex-wrap gap-1.5">
                    {[
                      { key: 'wash', label: 'Wash', prop: 'washingSelected', isSelected: isWash, icon: Shirt },
                      { key: 'iron', label: 'Iron', prop: 'ironingSelected', isSelected: isIron, icon: Flame },
                      { key: 'pack', label: 'Package', prop: 'packagingSelected', isSelected: isPack, icon: Package },
                      { key: 'vip', label: 'VIP', prop: 'vipSelected', isSelected: isVip, icon: Sparkles }
                    ].map(({ key, label, prop, isSelected, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateLaundryItemConfig(item.productId, { [prop]: !isSelected })}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold transition-all border shadow-xs ${isSelected
                            ? 'bg-primary border-primary text-primary-foreground scale-105'
                            : 'bg-card border-border text-muted-foreground hover:bg-muted'
                          }`}
                      >
                        <Icon className={`w-3 h-3 ${isSelected ? 'fill-current' : ''}`} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {!hasAnyService && (
                    <div className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900/50 mt-1.5">
                      <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                      <span>Please select at least one service (Wash, Iron, Package, or VIP)</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Per-Item Non-Laundry Customization (Food options + Pick Up Toggle) */}
            {!isLaundryItem(item) && (() => {
              const isFood = item.isFood === true ||
                item.cat === 'Food' ||
                isFoodItem(item) ||
                (fetchedDoc as any)?.cat === 'Food' ||
                (fetchedDoc as any)?._collection === 'foods';

              return (
                <div className="flex items-center flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/50">
                  {/* Food Specific Delivery Slots (ONLY for Food items) */}
                  {isFood && (() => {
                    const hour = new Date().getHours();
                    const bVal = String(item.brand || (item as any).pbrand || (item as any).FBrand || (item as any).LBrand || '').toLowerCase().trim();
                    const isBrandNow = bVal === 'now';
                    const updateFoodItemSlot = useCartStore.getState().updateFoodItemSlot;
                    const defaultFoodSlot = isBrandNow ? 'ASAP' : (hour < 15 ? 'Lunch' : 'Dinner');
                    const validFoodSlots = isBrandNow ? ['ASAP', 'Lunch', 'Dinner', 'Mchana', 'Usiku'] : ['Lunch', 'Dinner', 'Mchana', 'Usiku'];
                    const currentSlot = validFoodSlots.includes(String(item.deliverySlot || '')) ? item.deliverySlot : defaultFoodSlot;

                    return (
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground mr-0.5">Delivery Time:</span>

                        {/* ASAP Option (Show when brand === "now") */}
                        {isBrandNow && (
                          <button
                            type="button"
                            onClick={() => updateFoodItemSlot(item.productId, currentSlot === 'ASAP' ? '' : 'ASAP')}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold transition-all border shadow-xs ${currentSlot === 'ASAP'
                              ? 'bg-amber-500 border-amber-500 text-white scale-105 shadow-amber-500/20'
                              : 'bg-card border-border text-muted-foreground hover:bg-muted'
                              }`}
                          >
                            <Zap className="w-3 h-3 fill-current" />
                            ASAP
                          </button>
                        )}

                        {/* Lunch Option (visible before 15:00) */}
                        {hour < 15 && (
                          <button
                            type="button"
                            onClick={() => updateFoodItemSlot(item.productId, currentSlot === 'Lunch' ? '' : 'Lunch')}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold transition-all border shadow-xs ${currentSlot === 'Lunch'
                              ? 'bg-orange-500 border-orange-500 text-white scale-105 shadow-orange-500/20'
                              : 'bg-card border-border text-muted-foreground hover:bg-muted'
                              }`}
                          >
                            <Clock className="w-3 h-3" />
                            Lunch
                          </button>
                        )}

                        {/* Dinner Option (visible both before and after 15:00) */}
                        <button
                          type="button"
                          onClick={() => updateFoodItemSlot(item.productId, currentSlot === 'Dinner' ? '' : 'Dinner')}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold transition-all border shadow-xs ${currentSlot === 'Dinner'
                            ? 'bg-indigo-500 border-indigo-500 text-white scale-105 shadow-indigo-500/20'
                            : 'bg-card border-border text-muted-foreground hover:bg-muted'
                            }`}
                        >
                          <Clock className="w-3 h-3" />
                          Dinner
                        </button>
                      </div>
                    );
                  })()}

                  {/* Pick Up Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleDelivery(item.productId, item.isDeliverySelected === false ? true : false)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold transition-all border shadow-xs ${item.isDeliverySelected === false || (item as any).packagepickup === true
                      ? 'bg-primary border-primary text-primary-foreground scale-105'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted'
                      }`}
                  >
                    <MapPin className={`w-3 h-3 ${item.isDeliverySelected === false || (item as any).packagepickup === true ? 'fill-current' : ''}`} />
                    Pick Up (No Delivery)
                  </button>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Delete button — grey by default, soft opacity red background with red icon on hover/active */}
      <button
        onClick={() => removeFromCart(item.productId)}
        className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-muted text-muted-foreground hover:bg-red-500/15 hover:text-red-600 dark:hover:bg-red-500/25 dark:hover:text-red-400 border border-border/40 hover:border-red-500/30 flex items-center justify-center transition-all self-start shrink-0 cursor-pointer shadow-xs active:scale-90"
        title={`Remove ${item.name}`}
        aria-label={`Remove ${item.name} from cart`}
      >
        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      </button>
    </Card>
  );
};

export const CartPage = () => {
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const t = useLanguageStore((state) => state.t);
  const { items, updateQuantity, removeFromCart, clearCart, getTotals, toggleDelivery, toggleSelectItem, toggleSelectAll, laundryPreferences, setLaundryPreferences, updateLaundryItemConfig, applyLaundryServicesToAll, clearAllLaundryServices } = useCartStore();
  const { currentLocation, savedLocations, setCurrentLocation, addSavedLocation } = useLocationStore();
  const [totals, setTotals] = useState(getTotals());
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isLocationExpanded, setIsLocationExpanded] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const handleDetectGps = async () => {
    setIsDetectingGps(true);
    try {
      const detected = await locationService.detectUserLocation();
      addSavedLocation({
        address: detected.address,
        lat: detected.lat,
        lng: detected.lng,
      });
    } catch (err) {
      console.error('GPS detection error:', err);
    } finally {
      setIsDetectingGps(false);
    }
  };

  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Recalculate totals whenever location, items, express selection, or delivery time change
  useEffect(() => {
    setTotals(getTotals());
  }, [currentLocation, items, laundryPreferences?.globalExpressSelected, laundryPreferences?.deliverytime]);

  // Clear preferred pickup time on CartPage mount and window close/unload
  useEffect(() => {
    setLaundryPreferences({ deliverytime: '' });

    const handleBeforeUnload = () => {
      useCartStore.getState().setLaundryPreferences({ deliverytime: '' });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [setLaundryPreferences]);

  const { subtotal, deliveryFee, expressFee, pickupFee, serviceFee, total, itemCount } = getTotals();
  const selectedItems = items.filter((i) => i.isSelected !== false);
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const someSelected = selectedItems.length > 0 && !allSelected;

  const isLaundryOrder = selectedItems.some(i => (i as any).cat === 'Nguo');
  const hasActiveLaundryService = selectedItems.some(item =>
    (item as any).cat === 'Nguo' &&
    (item.washingSelected !== false || item.ironingSelected || item.packagingSelected || item.vipSelected)
  );

  const handleProceedToCheckout = () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item to proceed to checkout.');
      return;
    }
    if (!currentLocation) {
      setIsLocationModalOpen(true);
      return;
    }
    const unselectedLaundryItem = items.find(item =>
      (item as any).cat === 'Nguo' &&
      (item.washingSelected === false && !item.ironingSelected && !item.packagingSelected && !item.vipSelected)
    );
    if (unselectedLaundryItem) {
      alert(`Please select at least one service (Wash, Iron, Package, or VIP) for "${unselectedLaundryItem.name}" before proceeding.`);
      return;
    }
    // Ensure all Product items carry 'Product' as their deliverySlot
    items.forEach(item => {
      if (isProductItem(item)) {
        useCartStore.getState().updateFoodItemSlot(item.productId, 'Product');
      }
    });
    navigate('/checkout');
  };

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
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-extrabold text-foreground">Shopping Cart</h1>

                {/* General Checkbox on Top */}
                <button
                  type="button"
                  onClick={() => toggleSelectAll(!allSelected)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all border bg-card border-border hover:bg-muted hover:border-primary/30 cursor-pointer shadow-xs active:scale-95"
                  title={allSelected ? "Deselect all items" : "Select all items"}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${allSelected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : someSelected
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'border-muted-foreground/40 bg-background'
                    }`}>
                    {allSelected ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : someSelected ? (
                      <Minus className="w-3 h-3 stroke-[3]" />
                    ) : null}
                  </div>
                  <span>Select All ({selectedItems.length}/{items.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} selected
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

            {/* Minimized & Expandable Delivery Location Section */}
            <Card className="p-3.5 sm:p-4 border border-border shadow-sm shrink-0 transition-all rounded-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Delivery Location</span>
                      {currentLocation && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300/60 shrink-0">
                          ✓ Set
                        </span>
                      )}
                    </div>
                    <p className="notranslate text-xs text-muted-foreground font-medium truncate mt-0.5" translate="no">
                      {currentLocation ? currentLocation.address : 'No destination set — required for checkout'}
                    </p>
                  </div>
                </div>

                {/* Direct Action Options */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* GPS Quick Detect Button */}
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={isDetectingGps}
                    title="Detect Current GPS Location"
                    className="p-2 rounded-xl bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all border border-border flex items-center justify-center cursor-pointer"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin text-primary' : ''}`} />
                  </button>

                  {/* Change / Set Location Button */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="font-bold shadow-xs text-xs px-3 py-1.5 h-8 whitespace-nowrap"
                  >
                    {currentLocation ? 'Change' : 'Set Location'}
                  </Button>

                  {/* Expand / Collapse Map Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsLocationExpanded(!isLocationExpanded)}
                    title={isLocationExpanded ? "Hide Map & Details" : "Show Map & Details"}
                    className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all border border-border flex items-center justify-center cursor-pointer"
                  >
                    {isLocationExpanded ? (
                      <ChevronUp className="w-4 h-4 text-primary" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Destination Options Chips (Always Visible to let customer change quickly) */}
              {(savedLocations.length > 0 || currentLocation) && (
                <div className="mt-2.5 pt-2 border-t border-border/50 space-y-1.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                    <span className="text-[10px] font-extrabold text-muted-foreground shrink-0 mr-1 uppercase tracking-wider">Quick Select:</span>

                    {savedLocations.map((loc) => {
                      const isSelected = currentLocation?.id === loc.id || currentLocation?.address === loc.address;
                      const labelText = loc.specificInstructions || loc.address.split(',')[0];
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => setCurrentLocation(loc)}
                          title={loc.address}
                          className={`notranslate text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all border shrink-0 flex items-center gap-1.5 max-w-[200px] truncate ${isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-muted/60 text-muted-foreground hover:bg-muted border-border'
                            }`}
                          translate="no"
                        >
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{labelText}</span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setIsLocationModalOpen(true)}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20 shrink-0 flex items-center gap-1"
                    >
                      <Search className="w-3 h-3" />
                      <span>More...</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Expandable Details & Map View */}
              <AnimatePresence>
                {isLocationExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      {currentLocation ? (
                        <div className="border border-primary/30 bg-primary/5 p-3 sm:p-4 rounded-xl relative overflow-hidden">
                          <div className="mb-2">
                            <p className="font-extrabold text-xs text-foreground mb-0.5">Selected Destination</p>
                            <p className="notranslate text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300" translate="no">
                              {currentLocation.address}
                            </p>
                            {currentLocation.specificInstructions && (
                              <p className="notranslate text-xs text-slate-500 mt-1 italic font-medium bg-background/60 p-2 rounded-md" translate="no">
                                Note: {currentLocation.specificInstructions}
                              </p>
                            )}
                          </div>

                          {/* Visual Map Preview */}
                          <MiniMapPreview
                            isLoaded={isMapLoaded}
                            lat={currentLocation.lat}
                            lng={currentLocation.lng}
                            address={currentLocation.address}
                          />
                        </div>
                      ) : (
                        <div className="bg-muted p-4 rounded-xl text-center border border-dashed border-border">
                          <MapPin className="w-7 h-7 mx-auto text-muted-foreground mb-2 opacity-50" />
                          <p className="text-xs text-foreground font-medium mb-3">No delivery location set</p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsLocationModalOpen(true)}
                            className="font-bold shadow-md text-xs"
                          >
                            Set Delivery Location
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!currentLocation && (
                <p className="text-xs text-destructive font-semibold flex justify-center mt-2">
                  * A delivery location is required
                </p>
              )}
            </Card>

            {/* Scrollable Cart Items Container Grouped by Store */}
            <div className="flex-1 lg:overflow-y-auto scrollbar-none space-y-4 min-h-0 pr-1 pb-4">
              <AnimatePresence>
                {(() => {
                  const groupedCart: { [key: string]: { storeId: string; storeName: string; isLaundry: boolean; items: typeof items } } = {};

                  items.forEach((item) => {
                    const isLaundry = (item as any).cat === 'Nguo';
                    const rawSId = item.storeId && item.storeId !== 'unknown' ? item.storeId : null;
                    let resolvedSName = item.storeName && item.storeName !== 'Unknown Store' && item.storeName !== 'Verified Partner' ? item.storeName : null;

                    if (!resolvedSName) {
                      const matchedStore = storeService.getMockStores().find((s) => s.id === rawSId || s.id === item.storeId);
                      if (matchedStore && matchedStore.name) {
                        resolvedSName = matchedStore.name;
                      } else {
                        const matchedProd = productService.getMockProducts('all').find((p) => p.id === item.productId || p.id === item.baseProductId);
                        if (matchedProd && matchedProd.store) {
                          resolvedSName = matchedProd.store;
                        }
                      }
                    }

                    const storeName = isLaundry
                      ? (item.storeName || 'Laundry Services')
                      : (resolvedSName || 'Store Order');

                    const key = isLaundry
                      ? 'laundry_pack'
                      : (rawSId || storeName);

                    if (!groupedCart[key]) {
                      groupedCart[key] = {
                        storeId: rawSId || key,
                        storeName: storeName,
                        isLaundry: isLaundry,
                        items: [],
                      };
                    }
                    groupedCart[key].items.push(item);
                  });

                  return Object.values(groupedCart).map((group) => {
                    const storeFee = getStoreDeliveryFee(group.items, currentLocation);

                    return (
                      <div key={group.storeId} className="space-y-2">
                        {/* Store / Laundry Pack Header */}
                        <div className="flex items-center justify-between p-2 sm:p-2.5 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border shadow-xs">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${group.isLaundry ? 'bg-sky-500/10 text-sky-500' : 'bg-primary/10 text-primary'
                              }`}>
                              {group.isLaundry ? <Sparkles className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <h3 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
                                {group.isLaundry ? `Laundry Pack (${group.storeName})` : group.storeName}
                              </h3>
                              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold">
                                {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Store Items */}
                        <div className="space-y-2 pl-1 sm:pl-2">
                          {group.items.map((item) => (
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
                                toggleSelectItem={toggleSelectItem}
                              />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
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
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {[
                              { key: 'wash', label: 'Washing', prop: 'washingSelected', icon: Shirt },
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
                          hasActiveLaundryService ? (
                            <div className="space-y-2">
                              <label htmlFor="deliverytime" className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                                <Clock className="w-4 h-4 text-primary" />
                                Preferred Pickup Time
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  id="deliverytime"
                                  type="datetime-local"
                                  value={laundryPreferences.deliverytime}
                                  onChange={(e) => setLaundryPreferences({ deliverytime: e.target.value })}
                                  min={new Date().toISOString().slice(0, 16)}
                                  style={{ colorScheme: isDark ? 'dark' : 'light' }}
                                  className="w-full h-12 rounded-xl border border-border bg-card px-4 pr-10 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm"
                                />
                                {laundryPreferences.deliverytime && (
                                  <button
                                    type="button"
                                    onClick={() => setLaundryPreferences({ deliverytime: '' })}
                                    title="Clear preferred pickup time"
                                    className="absolute right-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="md:col-span-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                              <span>Select at least one laundry service (Wash, Iron, Package, or VIP) for your item(s) to enable Preferred Pickup Time and Express Service.</span>
                            </div>
                          )
                        )}

                        <div className={`space-y-2 ${!isLaundryOrder || !hasActiveLaundryService ? 'md:col-span-2' : ''}`}>
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
                            className="w-full min-h-[48px] rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm resize-none overflow-hidden scrollbar-none"
                          />
                        </div>

                        {isLaundryOrder && hasActiveLaundryService && (
                          <div className="space-y-2 md:col-span-2">
                            <button
                              onClick={() => setLaundryPreferences({ globalExpressSelected: !laundryPreferences.globalExpressSelected })}
                              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm ${laundryPreferences.globalExpressSelected
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
                                    For Faster Laundry Pickups and Delivery (4HRS MAX)
                                  </p>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${laundryPreferences.globalExpressSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
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
                {isLaundryOrder && serviceFee > 0 && (
                  <div className="flex justify-between text-primary font-bold">
                    <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> Service Charge</span>
                    <span>+{formatPrice(serviceFee)} {APP_SETTINGS.currency}</span>
                  </div>
                )}
                {expressFee > 0 && (
                  <div className="flex justify-between text-primary font-bold">
                    <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary fill-primary/20" /> Express Charges</span>
                    <span>+{formatPrice(expressFee)} {APP_SETTINGS.currency}</span>
                  </div>
                )}
                {pickupFee > 0 && (
                  <div className="flex justify-between text-primary font-bold">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> Preferred Pickup Charge</span>
                    <span>+{formatPrice(pickupFee)} {APP_SETTINGS.currency}</span>
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
                onClick={handleProceedToCheckout}
                className="w-full py-6 text-base font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Card>
          </div>
        </div>
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          isLoaded={isMapLoaded}
        />
      </ContentContainer>
    </PageContainer>
  );
};
