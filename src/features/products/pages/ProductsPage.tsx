import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ArrowRight, ChevronRight, CheckCircle2, 
  MapPin, Star, Plus, Minus, Phone, ShieldCheck, 
  ShoppingBag, Clock, Sparkles, Tag, Trash2
} from 'lucide-react';
import { PageContainer } from '../../../shared/components/layout';
import { HomeSearchResultsView } from '../../home/components/HomeSearchResultsView';
import { Button } from '../../../shared/components/ui/Button';
import { useCartStore } from '../../cart/store/useCartStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { APP_SETTINGS } from '@/core/config/settings';
import { useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { productService, Product } from '../services/productService';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { useLocationStore } from '../../location/store/useLocationStore';
import { useDynamicPrice, getDeliveryFee } from '../../location/hooks/useDynamicPrice';
import { MobileSearchOverlay } from '../../../shared/components/MobileSearchOverlay';
import { MiniCartRow } from '../../../shared/components/MiniCartRow';
import { searchTuleteItems } from '../../../core/services/algoliaService';

const ProductGridItem = ({ product, cartItem, addToCart, updateQuantity, navigate }: any) => {
  if (product.availability === false) {
    return null;
  }

  const isLaundryCategory = ['Laundry', 'Suits', 'Bag Wash', 'Bedding'].includes(product.category);
  const magicPrice = useDynamicPrice(product.price, product.storeId, isLaundryCategory, product.location);
  const isSoldOut = (product.quantity !== undefined && product.quantity <= 0) || (product.idadi !== undefined && product.idadi <= 0);

  return (
    <div className="flex flex-col h-full">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="h-full rounded-3xl border p-3 sm:p-4 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all group cursor-pointer bg-card border-border"
        onClick={() => navigate(`/product/${product.id}`)}
      >
        <div className="w-full aspect-[4/3] shrink-0 rounded-2xl overflow-hidden relative bg-muted">
          <img src={product.imgUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute top-2 left-2 bg-background/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-warning stroke-warning" />
            <span className="text-xs font-extrabold">{product.rating}</span>
          </div>
          {isSoldOut && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-20">
              <span className="text-foreground font-extrabold text-xs bg-background px-4 py-2 rounded-full shadow-lg">
                Sold Out
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1">
          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1.5">{product.store}</p>
          <h3 className="font-extrabold text-base text-foreground line-clamp-2 leading-snug mb-1.5 group-hover:text-primary transition-colors">{product.name}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 font-medium">
            <Clock className="w-3.5 h-3.5" /> Next Day
          </div>
          
          <div className="flex items-end justify-between gap-2 mt-auto pt-4 border-t border-border" onClick={(e) => e.stopPropagation()}>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">Est. Total</span>
              <span className="text-xl font-extrabold text-foreground">{APP_SETTINGS.currency} {formatPrice(magicPrice)}</span>
            </div>
            
            {cartItem ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 bg-muted px-1.5 sm:px-2 py-1 rounded-xl">
                  <button onClick={() => updateQuantity(product.id, cartItem.quantity - 1)} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-md bg-background text-foreground shadow-sm">
                    <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                  <span className="font-extrabold text-xs sm:text-sm min-w-[1rem] text-center">{cartItem.quantity}</span>
                  <button onClick={() => {
                    const stockLimit = product.quantity !== undefined ? product.quantity : product.idadi;
                    if (stockLimit !== undefined && cartItem.quantity >= stockLimit) {
                      alert(`Cannot add more. Only ${stockLimit} items available in stock.`);
                      return;
                    }
                    updateQuantity(product.id, cartItem.quantity + 1);
                  }} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                disabled={isSoldOut}
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.imgUrl,
                    storeId: product.storeId,
                    storeName: product.store,
                    cat: 'Product',
                    location: product.location,
                    isLaundry: isLaundryCategory,
                    idadi: product.quantity !== undefined ? product.quantity : product.idadi
                  });
                }}
                className={`px-4 py-2 rounded-xl shadow-sm transition-all text-sm font-extrabold flex items-center gap-1.5 ${
                  !isSoldOut 
                    ? 'bg-primary text-primary-foreground hover:scale-105 active:scale-95' 
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Static Data ---
const PRODUCT_CATEGORIES = [
  { id: 'all', name: 'All Products', icon: '🛍️' },
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'fashion', name: 'Fashion', icon: '👕' },
  { id: 'home', name: 'Home & Living', icon: '🛋️' },
  { id: 'beauty', name: 'Beauty', icon: '💄' },
  { id: 'groceries', name: 'Groceries', icon: '🛒' },
];

const PROMOS = [
  {
    id: 1,
    title: 'Tech Fest',
    subtitle: 'Up to 40% off on latest gadgets',
    badge: 'HOT DEAL',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'Fresh Groceries',
    subtitle: 'Delivered in 30 minutes',
    badge: 'ESSENTIALS',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 3,
    title: 'Fashion Week',
    subtitle: 'Step up your style game',
    badge: 'NEW ARRIVALS',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 4,
    title: 'Home & Decor',
    subtitle: 'Transform your space',
    badge: 'LIFESTYLE',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=800&auto=format&fit=crop',
  }
];



export const ProductsPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileResults, setMobileResults] = useState<any[]>([]);
  const [mobileLoading, setMobileLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!isMobileSearchOpen || !searchQuery.trim()) { setMobileResults([]); return; }
    const controller = new AbortController();
    const run = async () => {
      setMobileLoading(true);
      try {
        const hits = await searchTuleteItems(searchQuery, { filters: 'recordType:product', hitsPerPage: 40 });
        if (!controller.signal.aborted) setMobileResults(hits);
      } finally {
        if (!controller.signal.aborted) setMobileLoading(false);
      }
    };
    const t = setTimeout(run, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [searchQuery, isMobileSearchOpen]);

  
  // Cart & Auth
  const { items: cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getTotals } = useCartStore();
  const { openModal } = useAuthModalStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const promoRef = useRef<HTMLDivElement>(null);

  // Snap-scroll Promo Banners
  useEffect(() => {
    if (PROMOS.length <= 1) return;
    
    let interval: NodeJS.Timeout;
    const autoScroll = () => {
      if (promoRef.current && !promoRef.current.matches(':hover')) {
        const { scrollLeft, scrollWidth, clientWidth } = promoRef.current;
        const maxScroll = scrollWidth - clientWidth;
        const cardWidth = promoRef.current.firstElementChild?.clientWidth || clientWidth / 2;
        
        let nextScroll = scrollLeft + cardWidth;
        if (nextScroll >= maxScroll - 10) {
          nextScroll = 0; // Wrap around
        }
        
        promoRef.current.scrollTo({ left: nextScroll, behavior: 'smooth' });
      }
    };
    
    interval = setInterval(autoScroll, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filter logic
  const queryFilters = activeCategory !== 'all' 
    ? [
        { field: '_collection', operator: '==', value: 'products' },
        { field: 'category', operator: '==', value: activeCategory }
      ] 
    : [
        { field: '_collection', operator: '==', value: 'products' }
      ];
  
  const { data: productsData, isLoading } = useFirestoreQuery(
    ['products', 'page', activeCategory],
    productService,
    { filters: queryFilters as any, limit: 100 }
  );

  const rawProducts = productsData?.data || [];
  
  const { currentLocation } = useLocationStore();

  const filteredProducts = rawProducts.filter(item => {
    // Prevent empty slots by filtering unavailable items here before they get wrapped in grid divs
    if (item.availability === false || (item as any).availability === 'false') return false;

    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.store.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by delivery fee <= 10000
    const deliveryFee = getDeliveryFee(currentLocation, item.location, item.storeId, false, true);
    const matchesFee = deliveryFee <= 10000;

    return matchesSearch && matchesFee;
  }).sort((a, b) => {
    // Primary sort: rating (descending)
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    
    // Secondary sort: time (descending - newest first)
    if (a.time && b.time) {
      return b.time.localeCompare(a.time);
    } else if (b.time) {
      return 1;
    } else if (a.time) {
      return -1;
    }
    
    return 0;
  });

  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;
  
  // Subscribe to location store so that the page updates on location change

  const handleCheckout = () => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
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
            placeholder="Search for products, brands..."
          />
        )}
      </AnimatePresence>
      <div className="flex w-full bg-background relative items-start lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
        
        {/* ── LEFT SIDEBAR (CATEGORIES) ── */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border px-6 pt-6 pb-28">
          <div className="sticky top-24 space-y-2 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-none pb-4">
            <h2 className="text-xs font-extrabold text-foreground mb-4 uppercase tracking-widest opacity-80">Departments</h2>
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                  activeCategory === cat.id 
                    ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                {cat.name}
                {activeCategory === cat.id && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* ── CENTER/MAIN COLUMN ── */}
        <div className="flex-auto min-w-0 max-w-full h-auto lg:h-full overflow-visible lg:overflow-y-auto scrollbar-none pt-6 pb-32 xl:pb-28 px-4 lg:px-8 xl:px-10 space-y-8">
          
          {/* Header & Search */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Tulete Store
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Everything you need, delivered straight to you.</p>
            
            <div className="relative flex items-center w-full bg-card border border-border rounded-2xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary px-3 h-14">
              <Search className="w-5 h-5 text-muted-foreground shrink-0 ml-2 cursor-pointer hover:text-primary transition-colors" />
              <div className="flex items-center gap-1.5 ml-3 px-3 py-1.5 bg-primary/10 text-primary text-xs font-extrabold rounded-full shrink-0">
                Shopping
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (window.innerWidth < 1024) setIsMobileSearchOpen(true); }}
                placeholder="Search for products, brands, or categories..."
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium text-foreground px-3 placeholder:text-muted-foreground h-full"
              />
            </div>
          </div>

          {debouncedSearchQuery.trim().length > 0 ? (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-foreground">Search Results</h2>
                <span className="text-sm font-medium text-muted-foreground">For "{debouncedSearchQuery}"</span>
              </div>
              <HomeSearchResultsView query={debouncedSearchQuery} filterValue="product" />
            </div>
          ) : (
            <>
          {/* Promo Banners */}
          <div ref={promoRef} className="flex gap-4 overflow-x-auto scrollbar-none pb-2 snap-x snap-mandatory scroll-smooth">
            {PROMOS.map((promo, i) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="snap-center shrink-0 w-[85%] sm:w-[60%] lg:w-[45%]"
              >
                <div className="relative h-64 rounded-3xl overflow-hidden group shadow-sm border border-border">
                  <img src={promo.image} alt={promo.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <span className="self-start bg-white/15 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1 rounded-full mb-2 uppercase tracking-widest border border-white/20">
                      {promo.badge}
                    </span>
                    <h3 className="font-extrabold text-2xl leading-tight mb-1 text-white">{promo.title}</h3>
                    <p className="text-sm font-medium text-white/80">{promo.subtitle}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mobile Categories Pill Bar */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-extrabold transition-all border ${
                  activeCategory === cat.id 
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                    : 'bg-card border-border text-muted-foreground'
                }`}
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-500 fill-orange-500" /> Top Rated Products
              </h2>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-[300px] w-full rounded-3xl" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border border-dashed rounded-3xl">
                <p className="text-muted-foreground font-medium">No product near your area yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-stretch">
                <AnimatePresence>
                  {filteredProducts.map((product) => {
                    const cartItem = cartItems.find(i => i.productId === product.id);
                    return (
                      <ProductGridItem 
                        key={product.id} 
                        product={product} 
                        cartItem={cartItem} 
                        addToCart={addToCart} 
                        updateQuantity={updateQuantity} 
                        navigate={navigate} 
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
          </>
          )}
        </div>

        {/* ── RIGHT SIDEBAR (WIDGETS & CART) ── */}
        <div className="hidden xl:block flex-none w-[320px] shrink-0 border-l border-border px-6 pt-6 pb-28">
          <div className="sticky top-8 space-y-6 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-none pb-4">
            
            {/* CART WIDGET */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Your Order</h2>
                <ShoppingBag className="w-4 h-4 text-primary" />
              </div>

              {hasItems ? (
                <>
                  <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto scrollbar-none">
                    {cartItems.map((cartItem) => (
                      <MiniCartRow
                        key={cartItem.productId}
                        cartItem={cartItem}
                        removeFromCart={removeFromCart}
                      />
                    ))}
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center mb-5">
                      <span className="text-sm font-bold text-muted-foreground">Total</span>
                      <span className="text-xl font-extrabold text-foreground">{APP_SETTINGS.currency} {formatPrice(cartTotal)}</span>
                    </div>
                    <Button
                      onClick={handleCheckout}
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
                  <ShoppingBag className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground mt-1">Add items to get started</p>
                </div>
              )}
            </div>

            {/* TRUST STATS BAND */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider text-foreground">Service Stats</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { value: '50k+', label: 'Products', icon: Tag },
                  { value: '4.9★', label: 'Avg Rating', icon: Star },
                  { value: 'Fast', label: 'Delivery', icon: Clock },
                  { value: '24/7', label: 'Support', icon: Phone },
                ].map(({ value, label, icon: Icon }) => (
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

        {/* Mobile Sticky Cart */}
        <AnimatePresence>
          {hasItems && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="xl:hidden fixed bottom-20 left-4 right-4 z-50"
            >
              <Button
                onClick={handleCheckout}
                className="w-full py-6 text-base font-extrabold shadow-2xl flex items-center justify-between px-6 rounded-3xl bg-primary text-primary-foreground"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-background/20 px-3 py-1 rounded-full text-xs">
                    {cartItems.length}
                  </div>
                  <span>Checkout</span>
                </div>
                <span>{APP_SETTINGS.currency} {formatPrice(cartTotal)} <ArrowRight className="inline-block ml-1 w-4 h-4" /></span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageContainer>
  );
};
