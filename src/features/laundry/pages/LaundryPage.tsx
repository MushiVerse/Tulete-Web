import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '../../../shared/components/layout';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Input } from '../../../shared/components/ui/Input';
import { Skeleton, LaundryCardSkeleton } from '../../../shared/components/ui/Skeleton';
import { Switch } from '../../../shared/components/ui/Switch';
import { laundryService, LaundryItem } from '../services/laundryService';
import { useCartStore, calculateItemTotal } from '../../cart/store/useCartStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useLocationStore } from '../../location/store/useLocationStore';
import { useDynamicPrice } from '../../location/hooks/useDynamicPrice';
import { APP_SETTINGS } from '@/core/config/settings';
import {
  Search, ShoppingCart, Plus, Minus, CheckCircle2,
  Shirt, Star, Sparkles, Clock, Zap, X, ChevronRight, Phone, ArrowRight, Settings2, Package, Trash2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog';
import { MobileSearchOverlay } from '../../../shared/components/MobileSearchOverlay';
import { searchTuleteItems } from '../../../core/services/algoliaService';
import { isItemFuzzyMatch } from '../../../shared/utils/fuzzyMatch';

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
  onDecrement,
  onRemoveAll,
  hasAnyInCart,
}: {
  item: LaundryItem;
  getCartQuantity: (id: string) => number;
  addingId: string | null;
  onAddToCart: (item: LaundryItem) => void;
  onDecrement: (id: string) => void;
  onRemoveAll: (id: string) => void;
  hasAnyInCart: boolean;
}) => {
  const navigate = useNavigate();
  const isAvailable = item.quantity > 0;
  const livePrice = useDynamicPrice(item.price, item.brand || 'laundry', true, undefined);
  const id = item.id;
  const isAddingThis = addingId === id;
  const cartQty = getCartQuantity(id);

  /** Confirm: add to cart immediately */
  const handleConfirmAdd = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onAddToCart(item);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={() => navigate(`/product/${encodeURIComponent(item.id)}`)}
      className={`group rounded-3xl border p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col bg-card border-border h-full cursor-pointer`}
    >
      <div className="flex flex-col gap-4 flex-1">
        {/* Image */}
        <div className="relative w-full aspect-[4/3] shrink-0 rounded-2xl overflow-hidden bg-muted">
          {item.imgURL ? (
            <img
              src={item.imgURL}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Shirt className="w-10 h-10 text-muted-foreground/50" />
            </div>
          )}
          {/* Floating quantity left badge in top right corner of image */}
          {(() => {
            const stockVal = item.quantity !== undefined ? item.quantity : item.idadi;
            if (stockVal !== undefined && stockVal > 0 && isAvailable) {
              return (
                <div className="absolute top-2 right-2 bg-background/90 backdrop-blur text-foreground border border-border/50 font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-sm z-10">
                  {stockVal} left
                </div>
              );
            }
            return null;
          })()}
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-[10px] font-extrabold text-white px-2 py-1 bg-destructive rounded shadow">UNAVAILABLE</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            {item.brand && (
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                {item.brand}
              </span>
            )}
            {item.store && (
              <span className="text-[10px] font-bold text-muted-foreground truncate">
                by {item.store}
              </span>
            )}
          </div>
          
          <h3 className="font-extrabold text-foreground text-base leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
            {item.name}
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
            {item.description || 'Professional cleaning service'}
          </p>

          <div className="mt-auto flex items-end justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">Est. Total</span>
              <p className="text-xl font-extrabold text-foreground">
                {APP_SETTINGS.currency} {formatPrice(livePrice)}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* ── Add to Cart Actions ── */}
      <div 
        className="mt-auto pt-4 border-t border-border flex items-center justify-end gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {cartQty > 0 ? (
          <div 
            className="flex items-center gap-1.5 sm:gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 sm:gap-1.5 bg-muted px-1.5 sm:px-2 py-1 rounded-xl">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDecrement(id);
                }} 
                className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-md bg-background text-foreground shadow-sm hover:bg-background/80"
              >
                <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
              <span className="font-extrabold text-xs sm:text-sm min-w-[1rem] text-center">{cartQty}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmAdd(e);
                }} 
                className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            </div>
          </div>
        ) : (
          <button
            disabled={!isAvailable}
            onClick={handleConfirmAdd}
            className={`px-4 py-2 rounded-xl shadow-sm transition-all text-sm font-extrabold flex items-center gap-1.5 ${
              isAvailable 
                ? 'bg-primary text-primary-foreground hover:scale-105 active:scale-95' 
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const LaundryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { addToCart, items: cartItems, removeFromCart, updateQuantity, clearCart, getTotals } = useCartStore();

  const [items, setItems] = useState<LaundryItem[]>([]);
  const [ads, setAds] = useState<{ imgURL: string; store: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Services');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileResults, setMobileResults] = useState<any[]>([]);
  const [mobileLoading, setMobileLoading] = useState(false);

  // Pagination state (20 items initially, loads +20 on scroll)
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMobileSearchOpen || !searchQuery.trim()) { setMobileResults([]); return; }
    const controller = new AbortController();
    const run = async () => {
      setMobileLoading(true);
      try {
        const hits = await searchTuleteItems(searchQuery, { filters: '(recordType:cloth OR recordType:laundry OR category:Laundry OR category:Nguo)', hitsPerPage: 40 });
        if (!controller.signal.aborted) setMobileResults(hits);
      } finally {
        if (!controller.signal.aborted) setMobileLoading(false);
      }
    };
    const t = setTimeout(run, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [searchQuery, isMobileSearchOpen]);


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

  // Filter and sort items by accuracy, relevance, and time
  const filteredItems = items.filter(item => {
    if ((item as any).availability === false || (item as any).availability === 'false' || (item as any).available === false || (item as any).isAvailable === false) return false;
    
    // Category filter
    if (selectedCategory !== 'All Services') {
      const catLower = selectedCategory.toLowerCase();
      const itemCat = String(item.category || item.cat || item.brand || '').toLowerCase();
      const itemName = String(item.name || '').toLowerCase();
      const itemDesc = String(item.description || '').toLowerCase();

      let matchCat = itemCat.includes(catLower) || itemName.includes(catLower) || itemDesc.includes(catLower);
      if (selectedCategory === 'Wash & Fold') {
        matchCat = matchCat || itemCat.includes('wash') || itemName.includes('wash') || itemCat.includes('nguo') || itemCat.includes('fold');
      } else if (selectedCategory === 'Dry Cleaning') {
        matchCat = matchCat || itemCat.includes('dry') || itemName.includes('dry') || itemDesc.includes('dry');
      } else if (selectedCategory === 'Ironing') {
        matchCat = matchCat || itemCat.includes('iron') || itemName.includes('iron') || itemCat.includes('pasi') || itemName.includes('pasi');
      } else if (selectedCategory === 'Duvets') {
        matchCat = matchCat || itemCat.includes('duvet') || itemName.includes('duvet') || itemCat.includes('blanket') || itemName.includes('blanket') || itemName.includes('mashuka');
      }
      if (!matchCat) return false;
    }

    if (searchQuery.trim()) {
      if (!isItemFuzzyMatch(searchQuery, item, ['name', 'brand', 'store', 'category', 'cat', 'description', 'title'])) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      // Search Relevance Scoring
      const getScore = (item: LaundryItem) => {
        const name = (item.name || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const store = (item.store || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();

        if (name === q) return 1000;
        if (name.startsWith(q)) return 800;
        if (name.includes(q)) return 600;
        if (brand.includes(q) || store.includes(q)) return 400;
        if (desc.includes(q)) return 200;
        return 50;
      };
      const scoreA = getScore(a);
      const scoreB = getScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
    }

    // Secondary sort: time (descending - newest first)
    const timeA = (a as any).time || (a as any).createdAt || '';
    const timeB = (b as any).time || (b as any).createdAt || '';
    if (timeA && timeB) {
      const timeDiff = String(timeB).localeCompare(String(timeA));
      if (timeDiff !== 0) return timeDiff;
    } else if (timeB) {
      return 1;
    } else if (timeA) {
      return -1;
    }
    return (b.rating || 0) - (a.rating || 0);
  });

  // Reset pagination when category or search query changes
  useEffect(() => {
    setVisibleCount(20);
  }, [selectedCategory, searchQuery]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 20);
        }
      },
      { threshold: 0.1 }
    );

    const target = loadMoreRef.current;
    observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [filteredItems.length, visibleCount]);

  const displayedItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  const getCartQuantity = (productId: string) => {
    return cartItems.find(i => i.productId === productId)?.quantity || 0;
  };

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleAddToCart = async (item: LaundryItem) => {
    if (item.quantity <= 0) return; // Service unavailable

    setAddingId(item.id);
    addToCart({
      productId: item.id,
      baseProductId: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imgURL,
      storeId: item.brand || 'laundry',
      storeName: item.store || 'Laundry Service',
      isLaundry: true,
      cat: 'Nguo',
    });
    showToast(`${item.name} added to cart`);
    setTimeout(() => setAddingId(null), 600);
  };

  const handleDecrement = (compositeId: string) => {
    const qty = getCartQuantity(compositeId);
    if (qty > 0) updateQuantity(compositeId, qty - 1);
  };

  const { total: cartTotal, itemCount: totalCartItems } = getTotals();
  const hasItems = cartItems.length > 0;
  const { currentLocation } = useLocationStore();

  const handleCheckout = () => {
    navigate('/cart');
  };

  return (
    <PageContainer className="flex-1 flex flex-col min-h-0">
      <AnimatePresence>
        {isMobileSearchOpen && (
          <MobileSearchOverlay
            query={searchQuery}
            onChange={setSearchQuery}
            onClose={() => { setIsMobileSearchOpen(false); setSearchQuery(''); setMobileResults([]); }}
            loading={mobileLoading}
            results={mobileResults}
            placeholder="Search laundry services..."
          />
        )}
      </AnimatePresence>
      <div className="flex w-full bg-background relative items-start lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
        
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
        <div className="flex-auto min-w-0 max-w-full h-auto lg:h-full overflow-visible lg:overflow-y-auto scrollbar-none pt-6 pb-32 xl:pb-28 px-4 lg:px-8 xl:px-10 space-y-8">
          
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

          {/* Search Row (Brought to the top above Promo Cards) */}
          <div className="sticky top-0 z-30 flex gap-3 py-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-sm transition-all">
            <div className="relative flex items-center w-full bg-card/75 dark:bg-card/60 backdrop-blur-xl border border-border/80 rounded-2xl shadow-md transition-all focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary px-3 h-14">
              <Search className="w-5 h-5 text-muted-foreground shrink-0 ml-2 cursor-pointer hover:text-primary transition-colors" />
              <div className="flex items-center gap-1.5 ml-3 px-3 py-1.5 bg-primary/10 text-primary text-xs font-extrabold rounded-full shrink-0">
                Laundry
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (window.innerWidth < 1024) setIsMobileSearchOpen(true); }}
                placeholder="Search services, items..."
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium text-foreground px-3 placeholder:text-muted-foreground h-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground shrink-0 mr-2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Ad Banners (Promo Cards - hidden when user types search query) */}
          {!searchQuery.trim() && ads.length > 0 && (
            <div ref={adsRef} className="flex gap-4 overflow-x-auto scrollbar-none pb-2 snap-x snap-mandatory scroll-smooth">
              {ads.map((ad, i) => (
                <div key={i} className="snap-center shrink-0 w-[85%] sm:w-[60%] lg:w-[50%] xl:w-[45%]">
                  <div className="relative h-64 rounded-3xl overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all border border-border/50">
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

          {/* Items List */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Shirt className="w-5 h-5 text-sky-500" /> Services & Package Deals
            </h2>
            <span className="text-sm font-bold text-muted-foreground">
              Showing {Math.min(visibleCount, filteredItems.length)} of {filteredItems.length} Items
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <LaundryCardSkeleton key={i} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              <AnimatePresence>
                {displayedItems.map((item, idx) => (
                  <div key={item.id} className="flex flex-col h-full">
                    <LaundryItemCard
                      item={item}
                      addingId={addingId}
                      onAddToCart={handleAddToCart}
                      getCartQuantity={getCartQuantity}
                      onDecrement={handleDecrement}
                      onRemoveAll={(compositeId) => updateQuantity(compositeId, 0)}
                      hasAnyInCart={cartItems.some(i => i.baseProductId === item.id)}
                    />
                  </div>
                ))}
              </AnimatePresence>

              {hasMore && (
                <div ref={loadMoreRef} className="col-span-full py-8 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold text-muted-foreground">Loading more items...</span>
                </div>
              )}
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

              {totalCartItems > 0 ? (
                <>
                  <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto scrollbar-none">
                    {cartItems.map((cartItem) => (
                      <div key={cartItem.productId} className="group/row flex justify-between items-center text-sm py-1 rounded-lg hover:bg-muted/50 px-1 transition-colors">
                        <span className="font-bold text-muted-foreground line-clamp-1 flex-1">
                          {cartItem.quantity}x {cartItem.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <span className="font-extrabold text-foreground">
                            {APP_SETTINGS.currency} {formatPrice(calculateItemTotal(cartItem))}
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
                    ))}
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center mb-5">
                      <span className="text-sm font-bold text-muted-foreground">Total</span>
                      <span className="text-xl font-extrabold text-foreground">{APP_SETTINGS.currency} {formatPrice(cartTotal)}</span>
                    </div>
                    <Button
                      onClick={() => navigate('/cart')}
                      className="w-full rounded-xl py-6 font-extrabold shadow-md flex items-center justify-center gap-2"
                    >
                      Checkout Now <ArrowRight className="w-4 h-4" />
                    </Button>
                    <button
                      onClick={() => clearCart()}
                      className="w-full mt-3 text-xs font-semibold text-destructive hover:text-primary transition-colors py-2 rounded-xl hover:bg-primary/10 flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear Cart
                    </button>
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
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider text-foreground">Service Stats</h2>
              <div className="grid grid-cols-1 gap-4">
                {STATS.map(({ value, label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-lg font-extrabold leading-tight text-foreground">{value}</span>
                      <span className="block text-[10px] text-muted-foreground font-semibold uppercase">{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Sticky Cart (Visible only on small screens when cart has items) */}
        <AnimatePresence>
          {totalCartItems > 0 && (
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
                    {totalCartItems}
                  </div>
                  <span>Checkout</span>
                </div>
                <span>{APP_SETTINGS.currency} {formatPrice(cartTotal)} <ArrowRight className="inline-block ml-1 w-4 h-4" /></span>
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
