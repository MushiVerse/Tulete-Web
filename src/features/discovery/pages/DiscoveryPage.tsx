import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Grid, List as ListIcon, Search, Trash2, ArrowRight, Flame, Sparkles, Tag, Zap, ChevronRight, ShoppingCart, X, MapPin, Map, Store, Heart } from 'lucide-react';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { FilterSidebar } from '../components/FilterSidebar';
import { useFilterStore } from '../store/useFilterStore';
import { searchTuleteItems } from '../../../core/services/algoliaService';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { StoreCard } from '../../../shared/components/cards/StoreCard';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { useCartStore } from '../../cart/store/useCartStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { APP_SETTINGS } from '../../../core/config/settings';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../shared/components/ui/Button';
import { useFavoritesStore } from '../../favorites/hooks/useFavoritesStore';
import { useLocationStore } from '../../location/store/useLocationStore';
import { DiscoveryMap } from '../components/DiscoveryMap';

// Trending quick-filter chips
const TRENDING_FILTERS = [
  { id: 'all', label: 'Explore All', icon: <Sparkles className="w-3 h-3" /> },
  { id: 'Food', label: 'Hot Meals 🔥', icon: <Flame className="w-3 h-3" /> },
  { id: 'Product', label: 'Trending Products', icon: <Filter className="w-3 h-3" /> },
  { id: 'Laundry', label: 'Laundry Deals', icon: <Filter className="w-3 h-3" /> },
];

export const DiscoveryPage = () => {
  const navigate = useNavigate();
  const urlCategory = new URLSearchParams(window.location.search).get('category');

  const { 
    category, setCategory, clearAllFilters,
    minPrice, maxPrice, isAvailableOnly 
  } = useFilterStore();
  
  const [localQuery, setLocalQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  // Cart & Auth
  const { items: cartItems, addToCart, clearCart, getTotals } = useCartStore();
  const { openModal } = useAuthModalStore();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { toggleFavorite, isFavorited, initialize: initFavs } = useFavoritesStore();

  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;
  
  const currentLocation = useLocationStore((state) => state.currentLocation);
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'stores'>('products');

  // Initialize favorites when user is logged in
  useEffect(() => {
    if (user?.id) initFavs(user.id);
  }, [user?.id]);

  useEffect(() => {
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab === 'stores') {
      setActiveTab('stores');
    }
  }, []);

  const handleCheckout = () => {
    if (!isAuthenticated) { openModal('login'); return; }
    navigate('/cart');
  };

  const handleAddToCart = (product: any) => {
    // Block out-of-stock items
    if (product.availability === false) return;
    const cat = product.category || product.recordType === 'cloth' ? 'Laundry' : 'Product';
    addToCart({
      productId: product.id,
      baseProductId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imgUrl,
      storeId: product.storeId || 'unknown',
      storeName: product.store || 'Unknown Store',
      cat,
      location: product.location,
      idadi: product.idadi,
      isLaundry: cat === 'Laundry' || product.category === 'Laundry' || product.recordType === 'cloth' || product._collection === 'cloths'
    });
  };

  const handleToggleFavorite = (product: any) => {
    if (!isAuthenticated) { openModal('login'); return; }
    toggleFavorite(user!.id, {
      itemId: product.id,
      type: 'product' as const,
      name: product.name,
      description: product.description || '',
      imageUrl: product.imgUrl || '',
      price: product.price,
    });
  };

  useEffect(() => {
    if (urlCategory && urlCategory !== category) {
      setCategory(urlCategory);
    }
  }, [urlCategory]);

  // Live search: fires directly from localQuery state (not URL) for instant results
  useEffect(() => {
    const controller = new AbortController();

    const fetchResults = async () => {
      setLoading(true);

      let filterStr: string | undefined = undefined;
      
      if (activeTab === 'stores') {
        filterStr = `recordType:store`;
      } else {
        if (category && category !== 'all') {
          filterStr = `category:"${category}" AND NOT recordType:store AND NOT recordType:brand`;
        } else {
          filterStr = `NOT recordType:store AND NOT recordType:brand`;
        }
      }

      if (isAvailableOnly) {
        filterStr += ` AND availability:true`;
      }

      const numericFilters: string[] = [];
      if (minPrice !== null) numericFilters.push(`price >= ${minPrice}`);
      if (maxPrice !== null) numericFilters.push(`price <= ${maxPrice}`);

      try {
        const results = await searchTuleteItems(localQuery, {
          filters: filterStr,
          numericFilters: numericFilters.length > 0 ? numericFilters : undefined,
          hitsPerPage: 60,
        });
        if (!controller.signal.aborted) {
          setProducts(results);
        }
      } catch (_) {
        // ignored on abort
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [localQuery, category, minPrice, maxPrice, isAvailableOnly, activeTab]);

  return (
    <PageWrapper className="min-h-screen bg-background">
      <div className="flex h-full">
        {/* Sidebar Filters */}
        <FilterSidebar isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-1 w-full overflow-hidden flex flex-col items-center">
          
          <div className="w-full max-w-7xl flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-24 px-4 sm:px-6 md:px-8 lg:px-12 pt-4 md:pt-6">
            
            {/* ── Location Header ── */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => navigate('/location')}
                className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors bg-muted/50 px-3 py-1.5 rounded-full"
              >
                <MapPin className="w-4 h-4 text-primary" />
                <span className="truncate max-w-[200px] sm:max-w-[300px]">
                  {currentLocation ? `Exploring near: ${currentLocation.address}` : 'Set your location'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>

            {/* ── Hero Banner ── */}
            <div className="mb-8">
              {/* Main orange gradient banner */}
              <div className="relative w-full rounded-[2rem] overflow-hidden p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl mb-4"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 40%, #fb923c 70%, #f59e0b 100%)' }}>

                {/* Animated floating food/product emojis */}
                {[
                  { emoji: '🍔', x: '78%', delay: 0, duration: 3.2 },
                  { emoji: '🛵', x: '88%', delay: 0.8, duration: 2.8 },
                  { emoji: '🍕', x: '68%', delay: 1.4, duration: 3.6 },
                  { emoji: '🛒', x: '92%', delay: 0.4, duration: 3.0 },
                  { emoji: '🥗', x: '74%', delay: 2.0, duration: 2.6 },
                  { emoji: '📦', x: '83%', delay: 1.0, duration: 3.4 },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-3xl md:text-4xl pointer-events-none select-none hidden md:block"
                    style={{ left: item.x, top: '10%' }}
                    animate={{ y: [0, -18, 0], rotate: [0, 6, -6, 0], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: item.duration, delay: item.delay, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {item.emoji}
                  </motion.div>
                ))}

                {/* Decorative glow blobs */}
                <div className="absolute -top-12 -left-8 w-56 h-56 rounded-full bg-yellow-300/30 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 right-20 w-40 h-40 rounded-full bg-red-500/20 blur-2xl pointer-events-none" />

                {/* Text side */}
                <div className="relative z-10">
                  <motion.span
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 text-white text-xs font-extrabold mb-3 backdrop-blur-sm shadow-sm"
                  >
                    <Zap className="w-3 h-3 fill-white" /> Today's Deals
                  </motion.span>
                  <motion.h2
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-2xl md:text-4xl font-extrabold text-white leading-tight mb-2 drop-shadow-md"
                  >
                    Discover What's<br className="hidden md:block" /> Near You 🎯
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-white/90 font-medium text-sm md:text-base max-w-xs drop-shadow-sm"
                  >
                    Fresh meals, services & products delivered fast from your neighbourhood.
                  </motion.p>
                </div>

                {/* CTA buttons */}
                <div className="relative z-10 flex flex-col gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setCategory('Food')}
                    className="flex items-center justify-between gap-3 px-5 py-3 bg-white/25 hover:bg-white/40 backdrop-blur-sm rounded-2xl text-white font-extrabold text-sm transition-all active:scale-95 w-full md:w-52 shadow-md"
                  >
                    <span className="flex items-center gap-2"><Flame className="w-4 h-4" /> Hot Meals</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCategory('Product')}
                    className="flex items-center justify-between gap-3 px-5 py-3 bg-white/25 hover:bg-white/40 backdrop-blur-sm rounded-2xl text-white font-extrabold text-sm transition-all active:scale-95 w-full md:w-52 shadow-md"
                  >
                    <span className="flex items-center gap-2"><Tag className="w-4 h-4" /> Trending Products</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Stores', value: '50+', icon: '🏪' },
                  { label: 'Items', value: '500+', icon: '📦' },
                  { label: 'Avg. Delivery', value: '25 min', icon: '🛵' },
                ].map(stat => (
                  <div key={stat.label} className="bg-card border border-border/50 rounded-2xl p-3 md:p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-2xl mb-1">{stat.icon}</div>
                    <div className="font-extrabold text-lg text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>


            {/* Sticky Search & Filter Bar */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md py-4 border-b border-border/50 mb-6 flex flex-col gap-4">
              
              {/* Tabs: Products vs Stores */}
              <div className="flex items-center gap-2 p-1 bg-muted rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Products & Services
                </button>
                <button
                  onClick={() => setActiveTab('stores')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'stores' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Stores
                </button>
              </div>

              <div className="relative flex items-center w-full bg-card border border-border rounded-2xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary px-3 h-14 gap-2">
                <Search className="w-5 h-5 text-muted-foreground shrink-0 ml-1" />

                <input
                  type="text"
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  onFocus={() => { if (window.innerWidth < 1024) setIsFilterOpen(false); }}
                  placeholder="Search for anything near you..."
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium text-foreground px-2 placeholder:text-muted-foreground h-full"
                />

                {/* Filter button */}
                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-extrabold bg-muted hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
                </button>

                {/* Map toggle */}
                <button
                  onClick={() => setShowMap(!showMap)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-extrabold transition-colors ${showMap ? 'bg-primary text-white border-primary' : 'bg-muted hover:bg-primary/10 hover:text-primary'}`}
                >
                  <Map className="w-4 h-4" />
                  <span className="hidden sm:inline">Map</span>
                </button>

                {/* Grid / List toggle */}
                <div className="hidden sm:flex items-center p-1 bg-muted rounded-xl border border-border shrink-0">
                  <button
                    onClick={() => { setViewMode('grid'); setShowMap(false); }}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' && !showMap ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setViewMode('list'); setShowMap(false); }}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' && !showMap ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>


              {/* Trending Quick Filters */}
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                {TRENDING_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => {
                      if (filter.id === 'all') clearAllFilters();
                      else setCategory(filter.id);
                    }}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold transition-all border ${
                      category === filter.id || (filter.id === 'all' && !category)
                        ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                        : 'bg-card border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {filter.icon} {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-warning fill-warning" />
                {localQuery ? 'Search Results' : 'Trending Now'}
              </h2>
              <span className="text-sm font-bold text-muted-foreground">{products.length} Items</span>
            </div>

            {/* Results Grid/List / Map */}
            <div>
              {showMap ? (
                <div className="w-full mt-2 animate-in fade-in duration-300">
                  <DiscoveryMap items={products} />
                </div>
              ) : loading ? (
                <div className={`grid gap-4 sm:gap-5 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <Skeleton key={i} className={`rounded-3xl ${viewMode === 'grid' ? 'h-[300px]' : 'h-[140px]'} w-full`} />
                  ))}
                </div>
              ) : (
                <div className={`grid gap-4 sm:gap-5 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                  {products.length === 0 ? (
                    <div className="col-span-full py-24 flex flex-col items-center text-center bg-card border border-border border-dashed rounded-3xl mx-2">
                      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Search className="w-10 h-10 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-xl font-extrabold text-foreground mb-2">No results found</h3>
                      <p className="text-muted-foreground font-medium mb-6 max-w-sm">
                        We couldn't find any {activeTab === 'stores' ? 'stores' : 'items'} matching "{localQuery}". Try exploring our trending categories!
                      </p>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => { setLocalQuery(''); clearAllFilters(); }} 
                          className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          Explore All
                        </button>
                        <button 
                          onClick={() => { setLocalQuery(''); setCategory('Food'); }} 
                          className="px-6 py-2.5 bg-muted text-foreground rounded-xl font-bold hover:bg-muted/80 transition-colors"
                        >
                          Hot Meals 🔥
                        </button>
                      </div>
                    </div>
                  ) : products.map((item: any) => {
                    // Shared normalization
                    let rating = 0;
                    let reviewCount = 0;
                    if (Array.isArray(item.rate) && item.rate.length > 0) {
                      const rates = item.rate.map(Number).filter((n: number) => !isNaN(n));
                      reviewCount = rates.length;
                      rating = rates.reduce((s: number, r: number) => s + r, 0) / reviewCount;
                    } else if (item.rating !== undefined && Number(item.rating) > 0) {
                      rating = Number(item.rating);
                      reviewCount = item.reviewCount ? Number(item.reviewCount) : 1;
                    }
                    if (rating === 0 || reviewCount === 0) {
                      rating = 4.5 + ((item.name?.length || item.store?.length || 5) % 5) / 10;
                    }
                    
                    let location: { lat: number; lng: number } | undefined;
                    if (item.location && typeof item.location === 'string') {
                      const parts = item.location.split(',');
                      if (parts.length === 2) {
                        const lat = parseFloat(parts[0].trim());
                        const lng = parseFloat(parts[1].trim());
                        if (!isNaN(lat) && !isNaN(lng)) location = { lat, lng };
                      }
                    } else if (item.location?.lat) {
                      location = { lat: item.location.lat, lng: item.location.lng };
                    }

                    if (activeTab === 'stores') {
                      const storeData = {
                        ...item,
                        id: item.objectID || item.id,
                        store: item.store || item.name || 'Store',
                        imgURL: item.imgUrl || item.imgURL || item.image || '',
                        rating: Math.round(rating * 10) / 10,
                        reviewCount,
                        availability: item.availability !== undefined ? !!item.availability : true,
                        location
                      };
                      return (
                        <div key={storeData.id} className={viewMode === 'list' ? 'h-[150px]' : ''}>
                          <StoreCard store={storeData as any} />
                        </div>
                      );
                    }

                    // Product path
                    const product = {
                      ...item,
                      id: item.objectID || item.id,
                      name: item.name || '',
                      description: item.description || '',
                      price: item.price !== undefined ? Number(item.price) : 0,
                      oldprice: item.oldprice !== undefined ? Number(item.oldprice) : undefined,
                      imgUrl: item.imgUrl || item.imgURL || item.image || '',
                      storeId: item.storeId || '',
                      store: item.store || item.storeName || '',
                      rating: Math.round(rating * 10) / 10,
                      reviewCount,
                      category: item.category || item.cat || '',
                      tags: item.tags || [],
                      availability: item.availability !== undefined ? !!item.availability : true,
                      location,
                    };
                    
                    return (
                      <div key={product.id} className={viewMode === 'list' ? 'h-[150px]' : ''}>
                        <ProductCard 
                          product={product}
                          onAddToCart={handleAddToCart}
                          onToggleFavorite={handleToggleFavorite}
                          isFavorite={isFavorited(product.id)}
                          onClick={setQuickViewProduct}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Premium Floating Cart Panel ── */}
        <AnimatePresence>
          {hasItems && (
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed bottom-20 xl:bottom-6 left-3 right-3 xl:left-auto xl:right-6 xl:w-[400px] z-50"
            >
              <div
                className="relative overflow-hidden rounded-[2rem] shadow-2xl border border-white/10"
                style={{
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.97) 0%, rgba(234,88,12,0.97) 60%, rgba(251,146,60,0.97) 100%)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                }}
              >
                {/* Decorative top glow */}
                <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-yellow-300/30 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-red-700/30 blur-2xl pointer-events-none" />

                <div className="relative z-10 px-4 pt-4 pb-4">

                  {/* Header row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                          <ShoppingCart className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-primary text-[10px] font-black flex items-center justify-center shadow-lg">
                          {cartItems.reduce((a, i) => a + i.quantity, 0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-extrabold text-sm leading-none">Your Cart</p>
                        <p className="text-white/70 text-[11px] font-medium mt-0.5">
                          {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={clearCart}
                      title="Clear Cart"
                      className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center transition-all active:scale-90"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  {/* Item preview — up to 3 items */}
                  <div className="space-y-1.5 mb-3">
                    {cartItems.slice(0, 3).map((item) => (
                      <div key={item.productId} className="flex items-center gap-2.5 bg-white/10 rounded-xl px-2.5 py-1.5 backdrop-blur-sm">
                        <img
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60'}
                          alt={item.name}
                          className="w-8 h-8 rounded-lg object-cover shrink-0 shadow-sm"
                        />
                        <span className="flex-1 text-white text-xs font-bold truncate">{item.name}</span>
                        <span className="shrink-0 bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                          ×{item.quantity}
                        </span>
                      </div>
                    ))}
                    {cartItems.length > 3 && (
                      <p className="text-white/60 text-[11px] font-semibold text-center">
                        +{cartItems.length - 3} more item{cartItems.length - 3 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-white/20 mb-3" />

                  {/* Total + CTA */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Total</p>
                      <p className="text-white font-black text-lg leading-tight">
                        {APP_SETTINGS.currency} {formatPrice(cartTotal)}
                      </p>
                    </div>
                    <button
                      onClick={handleCheckout}
                      className="flex items-center gap-2 px-5 py-3 bg-white text-primary rounded-2xl font-extrabold text-sm shadow-lg hover:bg-white/90 active:scale-95 transition-all"
                    >
                      Checkout
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Quick View Modal (Bottom Sheet on Mobile) ── */}
        <AnimatePresence>
          {quickViewProduct && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setQuickViewProduct(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
              >
                <div className="relative h-64 sm:h-72 bg-muted shrink-0">
                   <img src={quickViewProduct.imgUrl} alt={quickViewProduct.name} className="w-full h-full object-cover" />
                   <button onClick={() => setQuickViewProduct(null)} className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 transition-colors rounded-full p-2 backdrop-blur-md">
                     <X className="w-5 h-5" />
                   </button>
                   
                   <div className="absolute bottom-4 left-4 flex gap-2">
                     {quickViewProduct.tags?.includes('Most TamTam') && (
                       <span className="text-xs font-extrabold px-3 py-1 rounded-full shadow-sm backdrop-blur-md bg-success/90 text-primary-foreground tracking-wide">
                         HOT 🔥
                       </span>
                     )}
                   </div>
                </div>
                
                <div className="p-6 overflow-y-auto">
                   <div className="flex justify-between items-start gap-4">
                     <div>
                       <h2 className="text-2xl font-extrabold text-foreground">{quickViewProduct.name}</h2>
                       <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1">
                         <Store className="w-4 h-4" /> {quickViewProduct.store}
                       </p>
                     </div>
                     <div className="text-right shrink-0">
                       <p className="text-primary font-extrabold text-2xl">{APP_SETTINGS.currency} {formatPrice(quickViewProduct.price)}</p>
                       {quickViewProduct.oldprice && quickViewProduct.oldprice > quickViewProduct.price && (
                         <p className="text-muted-foreground line-through text-sm">{APP_SETTINGS.currency} {formatPrice(quickViewProduct.oldprice)}</p>
                       )}
                     </div>
                   </div>

                   {quickViewProduct.description && (
                     <div className="mt-6">
                       <h3 className="text-sm font-bold text-foreground mb-2">Description</h3>
                       <p className="text-muted-foreground text-sm leading-relaxed">{quickViewProduct.description}</p>
                     </div>
                   )}
                   
                   <div className="mt-8 flex gap-3">
                     <button 
                       onClick={() => handleToggleFavorite(quickViewProduct)}
                       className="p-4 rounded-2xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center shrink-0"
                     >
                       <Heart className={`w-6 h-6 ${isFavorited(quickViewProduct.id) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                     </button>
                     <Button 
                       onClick={() => { 
                         handleAddToCart(quickViewProduct); 
                         setQuickViewProduct(null); 
                       }} 
                       className="flex-1 py-6 text-lg font-bold rounded-2xl shadow-lg shadow-primary/25"
                     >
                       Add to Cart
                     </Button>
                   </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
};
