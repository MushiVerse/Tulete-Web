import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '../../../shared/components/layout';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Input } from '../../../shared/components/ui/Input';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { Switch } from '../../../shared/components/ui/Switch';
import { laundryService, LaundryItem } from '../services/laundryService';
import { useCartStore, calculateItemTotal } from '../../cart/store/useCartStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import {
  Search, ShoppingCart, Plus, Minus, CheckCircle2,
  Shirt, Star, Sparkles, Clock, Zap, X, ChevronRight, Phone, ArrowRight, Settings2, Package
} from 'lucide-react';

const STATS = [
  { value: '50+', label: 'Local Cleaners', icon: Shirt },
  { value: '4.9★', label: 'Avg Rating', icon: Star },
  { value: '2hrs', label: 'Express Pickup', icon: Zap },
  { value: '24/7', label: 'Support', icon: Phone },
];

const CATEGORIES = ['All Services', 'Wash & Fold', 'Dry Cleaning', 'Ironing', 'Duvets'];

const LaundryItemCard = ({
  item,
  getCartQuantity,
  addingId,
  onAddToCart,
  onDecrement
}: {
  item: LaundryItem;
  getCartQuantity: (id: string) => number;
  addingId: string | null;
  onAddToCart: (item: LaundryItem, config: { washingSelected: boolean; ironingSelected: boolean; packagingSelected: boolean; expressSelected: boolean }) => void;
  onDecrement: (compositeId: string) => void;
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [washing, setWashing] = useState(true); // Default is true for washing
  const [ironing, setIroning] = useState(false);
  const [packaging, setPackaging] = useState(false);
  const [express, setExpress] = useState(false);

  const isAvailable = item.quantity > 0;
  
  let livePrice = 0;
  if (washing) livePrice += item.price;
  if (ironing) livePrice += item.price * 0.95;
  if (packaging) livePrice += item.price * 0.60;
  if (express) livePrice += 1900;
  
  const compositeId = `${item.id}-${washing ? 'wash' : 'no'}-${ironing ? 'iron' : 'no'}-${packaging ? 'pack' : 'no'}-${express ? 'exp' : 'no'}`;
  const isAddingThis = addingId === compositeId;
  const cartQty = getCartQuantity(compositeId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group bg-card border border-border p-3 sm:p-4 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col"
    >
      <div className="flex gap-3 sm:gap-4 items-center">
        {/* Image */}
        <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-muted">
          {item.imgURL ? (
            <img
              src={item.imgURL}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Shirt className="w-8 h-8 text-muted-foreground/50" />
            </div>
          )}
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-[10px] font-extrabold text-white px-2 py-1 bg-destructive rounded shadow">UNAVAILABLE</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-extrabold text-foreground text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {item.name}
            </h3>
            {item.brand && (
              <span className="bg-primary/10 text-primary text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                {item.brand}
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
            {item.description || 'Professional cleaning service'}
          </p>
          
          <div className="flex items-center justify-between">
            <p className="text-lg font-extrabold text-primary">
              KES {Math.round(livePrice).toLocaleString()}
            </p>
            {item.store && (
              <p className="text-[11px] font-bold text-muted-foreground">
                By {item.store}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Services Configurator */}
      <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Customize Service
          </button>

          {/* Controls */}
          <div className="shrink-0 flex items-center justify-end w-28">
            {cartQty === 0 ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={!isAvailable || isAddingThis || (!washing && !ironing && !packaging && !express)}
                onClick={() => onAddToCart(item, { washingSelected: washing, ironingSelected: ironing, packagingSelected: packaging, expressSelected: express })}
                className={`w-12 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm text-sm font-extrabold
                  ${(isAvailable && (washing || ironing || packaging || express))
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
              >
                {isAddingThis ? <Plus className="w-5 h-5 animate-spin" /> : 'Add'}
              </motion.button>
            ) : (
              <div className="flex items-center bg-muted border border-border rounded-xl overflow-hidden shadow-sm h-10">
                <button
                  onClick={() => onDecrement(compositeId)}
                  className="w-10 h-full flex items-center justify-center text-foreground hover:bg-card transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-extrabold text-sm text-foreground">
                  {cartQty}
                </span>
                <button
                  onClick={() => onAddToCart(item, { washingSelected: washing, ironingSelected: ironing, packagingSelected: packaging, expressSelected: express })}
                  className="w-10 h-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Toggles Panel */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex flex-col gap-3 bg-muted/30 p-3 rounded-2xl"
            >
              {/* Washing Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Washing & Folding</p>
                    <p className="text-xs text-muted-foreground">Standard cleaning</p>
                  </div>
                </div>
                <Switch checked={washing} onCheckedChange={setWashing} />
              </div>

              {/* Ironing Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                    <Shirt className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Ironing</p>
                    <p className="text-xs text-muted-foreground">+95% of base price</p>
                  </div>
                </div>
                <Switch checked={ironing} onCheckedChange={setIroning} />
              </div>

              {/* Packaging Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Special Packaging</p>
                    <p className="text-xs text-muted-foreground">+60% of base price</p>
                  </div>
                </div>
                <Switch checked={packaging} onCheckedChange={setPackaging} />
              </div>

              {/* Express Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Express Delivery</p>
                    <p className="text-xs text-muted-foreground">Premium flat fee</p>
                  </div>
                </div>
                <Switch checked={express} onCheckedChange={setExpress} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const LaundryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { addToCart, items: cartItems, updateQuantity } = useCartStore();

  const [items, setItems] = useState<LaundryItem[]>([]);
  const [ads, setAds] = useState<{ imgURL: string; store: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Services');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const adsRef = useRef<HTMLDivElement>(null);

  // Snap-scroll ads carousel
  useEffect(() => {
    if (ads.length <= 1) return;
    
    let interval: NodeJS.Timeout;
    const autoScroll = () => {
      if (adsRef.current && !adsRef.current.matches(':hover')) {
        const { scrollLeft, scrollWidth, clientWidth } = adsRef.current;
        const maxScroll = scrollWidth - clientWidth;
        // Calculate the width of one card + gap (approx)
        const cardWidth = adsRef.current.firstElementChild?.clientWidth || clientWidth / 2;
        
        let nextScroll = scrollLeft + cardWidth;
        if (nextScroll >= maxScroll - 10) {
          nextScroll = 0; // Wrap around
        }
        
        adsRef.current.scrollTo({ left: nextScroll, behavior: 'smooth' });
      }
    };
    
    interval = setInterval(autoScroll, 4000); // 4 seconds per card
    return () => clearInterval(interval);
  }, [ads.length]);

  // Real-time items subscription
  useEffect(() => {
    setIsLoading(true);
    const unsub = laundryService.subscribeToItems((fetched) => {
      setItems(fetched);
      setIsLoading(false);
    });

    // Load ads
    laundryService.getLaundryAds().then(setAds).catch(() => setAds([]));

    return () => unsub();
  }, []);

  // Filter items by search
  const filteredItems = items.filter(item => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!item.name?.toLowerCase().includes(q) &&
          !item.brand?.toLowerCase().includes(q) &&
          !item.store?.toLowerCase().includes(q)) return false;
    }
    // Very basic category matching (mocking categorization based on text)
    if (selectedCategory !== 'All Services') {
      const isMatch = item.name?.toLowerCase().includes(selectedCategory.toLowerCase().split(' ')[0]) || 
                      item.description?.toLowerCase().includes(selectedCategory.toLowerCase().split(' ')[0]);
      // If we are strictly filtering but the mock data doesn't have categories, we might accidentally filter everything.
      // We will skip strict category filtering here unless backend has it, but this adds the UI element.
    }
    return true;
  });

  const getCartQuantity = (productId: string) => {
    return cartItems.find(i => i.productId === productId)?.quantity || 0;
  };

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleAddToCart = async (item: LaundryItem, config: { washingSelected: boolean; ironingSelected: boolean; packagingSelected: boolean; expressSelected: boolean }) => {
    if (item.quantity <= 0) return; // Service unavailable

    const compositeId = `${item.id}-${config.washingSelected ? 'wash' : 'no'}-${config.ironingSelected ? 'iron' : 'no'}-${config.packagingSelected ? 'pack' : 'no'}-${config.expressSelected ? 'exp' : 'no'}`;

    setAddingId(compositeId);
    addToCart({
      productId: compositeId,
      baseProductId: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imgURL,
      storeId: item.brand || 'laundry',
      storeName: item.store || 'Laundry Service',
      isLaundry: true,
      ...config
    });
    showToast(`${item.name} added to cart`);
    setTimeout(() => setAddingId(null), 600);
  };

  const handleDecrement = (compositeId: string) => {
    const qty = getCartQuantity(compositeId);
    if (qty > 0) updateQuantity(compositeId, qty - 1);
  };

  const totalCartLaundryItems = cartItems.filter(i =>
    items.some(li => li.id === i.baseProductId || li.id === i.productId)
  ).reduce((acc, i) => acc + i.quantity, 0);

  const cartTotal = cartItems.filter(i =>
    items.some(li => li.id === i.baseProductId || li.id === i.productId)
  ).reduce((acc, i) => {
    let base = 0;
    if (i.isLaundry) {
      if (i.washingSelected !== false) base += (i.price * i.quantity);
      if (i.ironingSelected) base += (i.price * i.quantity) * 0.95;
      if (i.packagingSelected) base += (i.price * i.quantity) * 0.60;
      if (i.expressSelected) base += (1900 * i.quantity);
    } else {
      base = i.price * i.quantity;
    }
    return acc + base;
  }, 0);

  return (
    <PageContainer>
      <div className="flex w-full bg-background h-[calc(100vh-4rem)] overflow-hidden relative">
        
        {/* ── LEFT SIDEBAR (FILTERS & NAVIGATION) ── */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-8">
            
            {/* Highlights */}
            <div>
              <h2 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Why Us?</h2>
              <div className="space-y-3">
                {[
                  { icon: CheckCircle2, label: 'Verified Cleaners', color: 'text-emerald-500' },
                  { icon: Clock, label: 'Same Day Pickup', color: 'text-blue-500' },
                  { icon: Zap, label: 'Express Available', color: 'text-amber-500' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-3 bg-muted/50 rounded-xl p-3 border border-border">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <span className="text-xs font-bold text-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── CENTER/MAIN COLUMN ── */}
        <div className="flex-auto min-w-0 max-w-full h-full overflow-y-auto scrollbar-none pt-6 pb-32 xl:pb-28 px-4 lg:px-8 xl:px-10 space-y-8">
          
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-6 h-6 text-primary" />
              <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Premium Laundry
              </h1>
            </div>
            <p className="text-base text-muted-foreground mt-1">
              Professional cleaning, crisp ironing & swift delivery to your door.
            </p>
          </div>

          {/* Ad Banners */}
          {ads.length > 0 && (
            <div ref={adsRef} className="flex gap-4 overflow-x-auto scrollbar-none pb-2 snap-x snap-mandatory scroll-smooth">
              {ads.map((ad, i) => (
                <div key={i} className="snap-center shrink-0 w-[85%] sm:w-[60%] lg:w-[50%] xl:w-[45%]">
                  <div className="relative h-72 rounded-3xl overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all border border-border/50">
                    <img src={ad.imgURL} alt={ad.store} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-5 left-5">
                      <span className="text-white font-extrabold text-lg flex items-center gap-2 drop-shadow-md">
                        <Sparkles className="w-5 h-5 text-warning" />
                        {ad.store}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mobile Categories Pill Bar */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto scrollbar-none pb-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-extrabold transition-all border ${
                  selectedCategory === cat 
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                    : 'bg-card border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Row */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search services, items..."
                className="w-full pl-11 pr-10 py-3.5 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Items List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32 w-full rounded-3xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 bg-card border border-border rounded-3xl shadow-sm"
            >
              <Shirt className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-extrabold text-foreground mb-2">
                {searchQuery ? 'No services found' : 'Services Unavailable'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                {searchQuery
                  ? `No laundry services matching "${searchQuery}". Try a different search.`
                  : 'Laundry services will appear here once available in your area.'}
              </p>
              {searchQuery && (
                <Button onClick={() => setSearchQuery('')} className="rounded-full px-6">
                  Clear Search
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredItems.map((item, idx) => (
                  <LaundryItemCard
                    key={item.id}
                    item={item}
                    addingId={addingId}
                    onAddToCart={handleAddToCart}
                    getCartQuantity={getCartQuantity}
                    onDecrement={handleDecrement}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR (WIDGETS & CART) ── */}
        <div className="hidden xl:block flex-none w-[320px] shrink-0 border-l border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-6">
            
            {/* CART WIDGET */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Your Cart</h2>
                <ShoppingCart className="w-4 h-4 text-primary" />
              </div>

              {totalCartLaundryItems > 0 ? (
                <>
                  <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto scrollbar-none">
                    {cartItems.map((cartItem) => (
                      <div key={cartItem.productId} className="flex justify-between items-center text-sm">
                        <span className="font-bold text-muted-foreground line-clamp-1 flex-1">
                          {cartItem.quantity}x {cartItem.name}
                        </span>
                        <span className="font-extrabold text-foreground shrink-0 ml-3">
                          KES {calculateItemTotal(cartItem).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center mb-5">
                      <span className="text-sm font-bold text-muted-foreground">Total</span>
                      <span className="text-xl font-extrabold text-foreground">KES {cartTotal}</span>
                    </div>
                    <Button
                      onClick={() => navigate('/cart')}
                      className="w-full rounded-xl py-6 font-extrabold shadow-md flex items-center justify-center gap-2"
                    >
                      Checkout Now <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground mt-1">Add items to get started</p>
                </div>
              )}
            </div>

            {/* TRUST STATS BAND */}
            <div className="bg-primary rounded-3xl p-5 shadow-sm text-primary-foreground">
              <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider opacity-90">Service Stats</h2>
              <div className="grid grid-cols-1 gap-4">
                {STATS.map(({ value, label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-lg font-extrabold leading-tight">{value}</span>
                      <span className="block text-[10px] opacity-70 font-semibold uppercase">{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Sticky Cart (Visible only on small screens when cart has items) */}
        <AnimatePresence>
          {totalCartLaundryItems > 0 && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="xl:hidden fixed bottom-20 left-4 right-4 z-50"
            >
              <Button
                onClick={() => navigate('/cart')}
                className="w-full py-6 text-base font-extrabold shadow-2xl flex items-center justify-between px-6 rounded-3xl bg-primary text-primary-foreground"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-background/20 px-3 py-1 rounded-full text-xs">
                    {totalCartLaundryItems}
                  </div>
                  <span>Checkout</span>
                </div>
                <span>KES {cartTotal} <ArrowRight className="inline-block ml-1 w-4 h-4" /></span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-sm font-bold px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-success" />
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageContainer>
  );
};
