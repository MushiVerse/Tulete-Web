import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { storeService, Store } from '../services/storeService';
import { productService, Product } from '../../products/services/productService';
import { useLocationStore } from '../../location/store/useLocationStore';
import { useCartStore } from '../../cart/store/useCartStore';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { PageContainer } from '../../../shared/components/layout';
import { Badge } from '../../../shared/components/ui/Badge';
import { 
  ArrowLeft, Star, Clock, MapPin, Phone, 
  MessageSquare, Share2, Heart, Search, Plus, Minus,
  CheckCircle2, Compass, Percent, Image, AlertTriangle,
  ShoppingBag, ArrowRight, Trash2, ExternalLink, Navigation, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestoreDocument, useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { APP_SETTINGS } from '@/core/config/settings';
import { MiniCartRow } from '../../../shared/components/MiniCartRow';
import { locationService } from '../../location/services/locationService';
import { useThemeStore } from '../../../core/theme/useThemeStore';

export const StoreDetailsPage = () => {
  const { isDark } = useThemeStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeStoreData = location.state?.storeData as Store | undefined;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [activeTab, setActiveTab] = useState<'menu' | 'hours' | 'reviews' | 'gallery'>('menu');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string | null>(null);
  const [geocodedAddress, setGeocodedAddress] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  // Local persistence for favorites
  const [isFavorite, setIsFavorite] = useState(() => {
    const saved = localStorage.getItem('tulete_favorite_stores');
    const list = saved ? JSON.parse(saved) : [];
    return list.includes(id || '');
  });

  const { items: cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getTotals } = useCartStore();
  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;
  const { currentLocation } = useLocationStore();
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useAuthModalStore();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    navigate('/cart');
  };

  const { data: dbStore, isLoading: isStoreLoading } = useFirestoreDocument(
    ['store', id || ''],
    storeService,
    id || ''
  );
  
  // Fetch items from 'foods', 'products', and 'cloths' collections
  const { data: foodsData, isLoading: isFoodsLoading } = useFirestoreQuery(
    ['store_foods', id || ''],
    productService,
    { filters: [{ field: '_collection', operator: '==', value: 'foods' }] }
  );
  const { data: productsData, isLoading: isProductsDataLoading } = useFirestoreQuery(
    ['store_products', id || ''],
    productService,
    { filters: [{ field: '_collection', operator: '==', value: 'products' }] }
  );
  const { data: clothsData, isLoading: isClothsLoading } = useFirestoreQuery(
    ['store_cloths', id || ''],
    productService,
    { filters: [{ field: '_collection', operator: '==', value: 'cloths' }] }
  );

  const isProductsLoading = isFoodsLoading || isProductsDataLoading || isClothsLoading;

  const decodedId = id ? decodeURIComponent(id) : '';

  const mockMatch = storeService.getMockStores().find((s) => 
    s.id === id || s.id === decodedId || 
    s.store?.toLowerCase() === id?.toLowerCase() || 
    s.store?.toLowerCase() === decodedId.toLowerCase()
  );

  const fallbackStore: Store = {
    id: decodedId || 's1',
    store: decodedId && decodedId !== 's1' && decodedId !== 'undefined' ? decodedId : 'Tulete Partner Store',
    description: 'Welcome to our store! We provide high quality items with fast delivery.',
    imgURL: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    ownerId: 'owner-1',
    rating: 4.8,
    reviewCount: 156,
    category: 'Food',
    availability: true,
    address: 'Dodoma, Tanzania',
    location: { lat: -6.1630, lng: 35.7516 },
    isVerified: true
  };

  const store = routeStoreData || dbStore || mockMatch || fallbackStore;
  const targetStoreName = (store?.name || store?.store || '').toLowerCase().trim();
  const targetStoreId = (id || store?.id || '').toLowerCase().trim();

  const storeLat = store?.location?.lat ?? (store as any)?.lat ?? (store as any)?.latitude ?? -6.1630;
  const storeLng = store?.location?.lng ?? (store as any)?.lng ?? (store as any)?.longitude ?? 35.7516;

  // Reverse geocode store coordinates to get official street address from Google / Geocoding provider
  useEffect(() => {
    if (!store || !storeLat || !storeLng) return;
    let isMounted = true;
    setIsGeocoding(true);

    locationService.reverseGeocode(storeLat, storeLng)
      .then((resAddress) => {
        if (isMounted) {
          setGeocodedAddress(resAddress);
          setIsGeocoding(false);
        }
      })
      .catch((err) => {
        console.error('Reverse geocoding error:', err);
        if (isMounted) setIsGeocoding(false);
      });

    return () => {
      isMounted = false;
    };
  }, [storeLat, storeLng, store?.id]);

  // Combine items from foods, products, cloths collections where store === opened store
  const allCollectionDocs = [
    ...(foodsData?.data || []),
    ...(productsData?.data || []),
    ...(clothsData?.data || [])
  ];

  const matchedStoreProducts = allCollectionDocs.filter(item => {
    const itemStore = String(item.store || (item as any).storeName || '').toLowerCase().trim();
    const itemStoreId = String(item.storeId || '').toLowerCase().trim();
    return (
      (targetStoreName && itemStore === targetStoreName) ||
      (targetStoreId && (itemStore === targetStoreId || itemStoreId === targetStoreId)) ||
      (targetStoreName && itemStore.includes(targetStoreName))
    );
  });

  let products = matchedStoreProducts.length > 0 ? matchedStoreProducts : productService.getMockProducts(id);

  if (products.length === 0 && store) {
    const categoryLower = (store.category || '').toLowerCase();
    products = productService.getMockProducts().filter(p => {
      const storeNameLower = (p.store || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      if (categoryLower.includes('food') && (storeNameLower.includes('kibanda') || pCat.includes('plat') || pCat.includes('meal'))) return true;
      if (categoryLower.includes('laund') && (storeNameLower.includes('safi') || pCat.includes('suit') || pCat.includes('wash'))) return true;
      if (categoryLower.includes('elect') && (storeNameLower.includes('fundi') || pCat.includes('repair') || pCat.includes('install'))) return true;
      if (categoryLower.includes('beaut') && (storeNameLower.includes('glam') || pCat.includes('hair') || pCat.includes('nail'))) return true;
      return false;
    });
  }

  // Interactive operational Map
  useEffect(() => {
    if (activeTab !== 'hours' || !store) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let angle = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.getBoundingClientRect().width || 600;
      canvas.height = 240;
    };
    resizeCanvas();

    const drawSingleMap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid System
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Streets vectors
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      // Pulsing Pin Beacon
      angle += 0.05;
      const center = { x: canvas.width / 2, y: canvas.height / 2 };
      const pulseRad = 16 + Math.sin(angle) * 6;

      ctx.beginPath();
      ctx.arc(center.x, center.y, pulseRad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(center.x, center.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Marker Tooltip Box
      const storeName = store.store || 'Store Location';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText(`📍 ${storeName}`, center.x, center.y - 20);

      animationId = requestAnimationFrame(drawSingleMap);
    };

    drawSingleMap();

    window.addEventListener('resize', resizeCanvas);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [activeTab, store]);

  // Loading state skeleton that closely resembles the page content layout
  if (isStoreLoading || isProductsLoading) {
    return (
      <PageContainer>
        <div className="flex w-full bg-background h-[calc(100vh-4rem)] overflow-hidden relative">
          {/* Left Sidebar Skeleton (Desktop) */}
          <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full p-6 space-y-4">
            <div className="h-4 w-32 bg-muted rounded-md animate-pulse mb-6" />
            <div className="h-3 w-24 bg-muted rounded-md animate-pulse uppercase" />
            <div className="space-y-2 pt-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 w-full bg-muted/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>

          {/* Center Column Skeleton */}
          <div className="flex-auto min-w-0 max-w-full h-full overflow-y-auto scrollbar-none pt-6 pb-32 xl:pb-28 px-4 lg:px-8 xl:px-10 space-y-6">
            {/* Hero Banner Skeleton */}
            <div className="relative h-60 md:h-72 rounded-3xl overflow-hidden shadow-md border border-border bg-muted/70 animate-pulse">
              <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-muted-foreground/20 shrink-0" />
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="h-4 w-20 bg-muted-foreground/20 rounded-full" />
                      <div className="h-4 w-14 bg-muted-foreground/20 rounded-full" />
                    </div>
                    <div className="h-6 w-48 bg-muted-foreground/30 rounded-md" />
                    <div className="h-3.5 w-36 bg-muted-foreground/20 rounded-md" />
                  </div>
                </div>
                <div className="h-8 w-28 bg-muted-foreground/20 rounded-full self-start md:self-auto" />
              </div>
            </div>

            {/* HUD Bar Skeleton */}
            <div className="grid grid-cols-2 gap-2 bg-muted border border-border p-2 rounded-2xl">
              <div className="h-12 bg-card rounded-xl animate-pulse" />
              <div className="h-12 bg-card rounded-xl animate-pulse" />
            </div>

            {/* Tab Bar Skeleton */}
            <div className="flex border-b border-border gap-6 pb-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-5 w-24 bg-muted rounded-md animate-pulse" />
              ))}
            </div>

            {/* Search Bar Skeleton */}
            <div className="h-11 w-full bg-muted rounded-2xl animate-pulse" />

            {/* Product Cards Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="p-4 bg-card border border-border rounded-2xl flex gap-4 animate-pulse">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-muted shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2 flex flex-col justify-between py-1">
                    <div className="space-y-1.5">
                      <div className="h-3 w-16 bg-muted rounded" />
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-3 w-full bg-muted rounded" />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-5 w-20 bg-muted rounded" />
                      <div className="h-8 w-16 bg-muted rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Toggle favorite
  const handleToggleFavorite = () => {
    const saved = localStorage.getItem('tulete_favorite_stores');
    let list = saved ? JSON.parse(saved) : [];
    if (isFavorite) {
      list = list.filter((storeId: string) => storeId !== id);
    } else {
      list.push(id || '');
    }
    localStorage.setItem('tulete_favorite_stores', JSON.stringify(list));
    setIsFavorite(!isFavorite);
  };

  // Share helper
  const handleShare = () => {
    if (!store) return;
    if (navigator.share) {
      navigator.share({
        title: store.store,
        text: store.description,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Store link copied to clipboard!');
    }
  };

  if (!store) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
          <AlertTriangle className="w-14 h-14 text-destructive mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold mb-1">Store Not Found</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">We couldn't locate this service provider. It may have been disabled or deleted.</p>
          <Button onClick={() => navigate('/explore')}>Discover Providers</Button>
        </div>
      </PageContainer>
    );
  }

  // Categories of store-specific items
  const productCategories = Array.from(new Set(products.map((p) => p.category)));

  // Filter products
  const filteredProducts = products.filter((p) => {
    const categoryMatch = !selectedProductCategory || p.category === selectedProductCategory;
    const searchMatch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                        p.description.toLowerCase().includes(productSearch.toLowerCase());
    return categoryMatch && searchMatch;
  });

  return (
    <PageContainer>
      <div className="flex w-full bg-background h-[calc(100vh-4rem)] overflow-hidden relative">
        
        {/* ── LEFT SIDEBAR (CATEGORIES) ── */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <button 
            onClick={() => navigate('/explore')} 
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Discovery
          </button>

          {activeTab === 'menu' && productCategories.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-extrabold text-foreground mb-4 uppercase tracking-widest opacity-80">Store Menu</h2>
              <button
                onClick={() => setSelectedProductCategory(null)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                  selectedProductCategory === null 
                    ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                All Items
              </button>
              {productCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedProductCategory(cat)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                    selectedProductCategory === cat 
                      ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── CENTER COLUMN ── */}
        <div className="flex-auto min-w-0 max-w-full h-full overflow-y-auto scrollbar-none pt-6 pb-32 xl:pb-28 px-4 lg:px-8 xl:px-10 space-y-8">
          {/* Mobile Back & Actions */}
          <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between py-3 mb-6">
            <button onClick={() => navigate('/explore')} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={handleToggleFavorite}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
              </button>
            </div>
          </div>

      {/* Hero Banner details */}
      <div className="relative h-60 md:h-72 rounded-3xl overflow-hidden mb-6 shadow-md border border-border bg-slate-100 dark:bg-slate-900">
        <img 
          src={store.imgURL} 
          alt={store.store} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
        
        {/* Detail text on banner */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <img 
              src={store.imgURL} 
              alt={store.store} 
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 border-white object-cover bg-white shadow-lg"
            />
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Badge className="bg-primary/20 text-primary border-0 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">
                  {store.cat || store.category}
                </Badge>
                {store.isVerified && <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400/20" />}
                <Badge className={`${store.availability ? 'bg-emerald-500' : 'bg-rose-500'} text-white border-0 text-[9px] font-bold px-2 rounded-full`}>
                  {store.availability ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white">{store.store}</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start md:self-auto bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md border border-white/10">
            <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
            <span>{store.rating}</span>
            <span className="text-slate-400 font-normal">({store.reviewCount} Reviews)</span>
          </div>
        </div>
      </div>

      {/* Trust contact HUD bar */}
      <div className="grid grid-cols-2 gap-2 mb-8 bg-muted/60 border border-border p-2 rounded-2xl">
        <button 
          onClick={handleShare}
          className="flex flex-col items-center justify-center py-2.5 rounded-xl hover:bg-card text-foreground transition-all cursor-pointer font-bold text-xs shadow-xs"
        >
          <Share2 className="w-5 h-5 mb-1 text-primary" />
          Share Shop
        </button>
        <button 
          onClick={handleToggleFavorite}
          className="flex flex-col items-center justify-center py-2.5 rounded-xl hover:bg-card text-foreground transition-all cursor-pointer font-bold text-xs shadow-xs"
        >
          <Heart className={`w-5 h-5 mb-1 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}`} />
          Favorite
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6 mb-6 overflow-x-auto scrollbar-none">
        {(['menu', 'hours', 'reviews', 'gallery'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-semibold text-sm capitalize whitespace-nowrap relative transition-all ${
              activeTab === tab 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'menu' ? 'Services & items' : tab === 'hours' ? 'About & Map' : tab}
            {activeTab === tab && (
              <motion.div 
                layoutId="storeTabIndicator" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* Store search bar & categories horizontal filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search item, clean package..."
                  className="pl-10 bg-card border-border"
                />
              </div>

              {productCategories.length > 0 && (
                <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 sm:pb-0">
                  <button
                    onClick={() => setSelectedProductCategory(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${
                      selectedProductCategory === null
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card border-border text-muted-foreground'
                    }`}
                  >
                    All Items
                  </button>
                  {productCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedProductCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${
                        selectedProductCategory === cat
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-card border-border text-muted-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Menu Items Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-10 bg-muted border border-slate-150 dark:border-slate-800 rounded-2xl">
                <p className="text-xs text-muted-foreground">No matching services or items found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map((prod) => (
                  <Card 
                    key={prod.id} 
                    onClick={() => navigate(`/product/${encodeURIComponent(prod.id)}`)}
                    className="p-4 border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all flex gap-4 items-center cursor-pointer group"
                  >
                    <img 
                      src={prod.imgUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120"} 
                      alt={prod.name} 
                      className="w-20 h-20 rounded-xl object-cover bg-slate-50 flex-shrink-0 group-hover:scale-105 transition-transform"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {/* <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary">{prod.category}</span> */}
                        {prod.tags.map((tag, i) => (
                          <Badge key={i} className="bg-amber-400/20 text-amber-800 border-0 text-[8px] font-bold py-0 px-1 rounded-sm">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <h4 className="font-extrabold text-sm text-foreground truncate mb-1 group-hover:text-primary transition-colors">{prod.name}</h4>
                      <p className="text-xs text-slate-550 dark:text-slate-400 line-clamp-1 mb-2 leading-relaxed">{prod.description}</p>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-foreground">
                            {formatPrice(prod.price)} {APP_SETTINGS.currency}
                          </span>
                          {prod.oldprice && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {formatPrice(prod.oldprice)} {APP_SETTINGS.currency}
                            </span>
                          )}
                        </div>

                        {(() => {
                          const cartItem = cartItems.find((ci) => ci.productId === prod.id);
                          const isSoldOut = prod.availability === false;

                          if (cartItem && cartItem.quantity > 0) {
                            return (
                              <div 
                                className="flex items-center gap-1.5 sm:gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1 sm:gap-1.5 bg-muted px-1.5 sm:px-2 py-1 rounded-xl">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateQuantity(prod.id, cartItem.quantity - 1);
                                    }} 
                                    className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-md bg-background text-foreground shadow-sm hover:bg-background/80"
                                  >
                                    <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  </button>
                                  <span className="font-extrabold text-xs sm:text-sm min-w-[1rem] text-center">{cartItem.quantity}</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const stockLimit = prod.quantity !== undefined ? prod.quantity : (prod as any).idadi;
                                      if (stockLimit !== undefined && cartItem.quantity >= stockLimit) {
                                        alert(`Cannot add more. Only ${stockLimit} items available in stock.`);
                                        return;
                                      }
                                      updateQuantity(prod.id, cartItem.quantity + 1);
                                    }} 
                                    className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                                  >
                                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <button
                              disabled={isSoldOut}
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart({
                                  productId: prod.id,
                                  name: prod.name,
                                  price: prod.price,
                                  imageUrl: prod.imgUrl,
                                  storeId: store.id,
                                  storeName: store.store,
                                  cat: (prod as any)?.cat || prod.category || store.category || 'Product',
                                  location: prod.location,
                                  idadi: prod.quantity !== undefined ? prod.quantity : (prod as any).idadi
                                });
                              }}
                              className={`px-3 py-1.5 rounded-xl shadow-sm transition-all text-xs font-extrabold flex items-center gap-1 shrink-0 ${
                                !isSoldOut
                                  ? 'bg-primary text-primary-foreground hover:scale-105 active:scale-95'
                                  : 'bg-muted text-muted-foreground cursor-not-allowed'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hours & Operational Map tab */}
        {activeTab === 'hours' && (() => {
          const displayAddress = store.address || (store as any).location || (store as any).locationName || (store as any).loc || (store as any).addressLoc || (store as any).specificaddress || 'Dodoma, Tanzania';

          return (
            <div className="space-y-6">
              {/* Actual Google Map with Theme Matching (Light & Dark modes) */}
              <Card className="h-72 relative overflow-hidden border border-border bg-card shadow-md rounded-2xl flex flex-col justify-between group">
                <iframe
                  title={`Google Map - ${store.store}`}
                  width="100%"
                  height="100%"
                  style={{ 
                    border: 0,
                    filter: isDark ? 'invert(90%) hue-rotate(180deg) contrast(120%)' : 'none'
                  }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${storeLat},${storeLng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full border-0 rounded-2xl transition-all duration-300"
                />

                {/* Google Maps Overlay Header Pill */}
                <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap justify-between items-center gap-2 pointer-events-none">
                  <div className="bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border shadow-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500 shrink-0 animate-bounce" />
                    <span className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
                      {store.store}
                    </span>
                  </div>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${storeLat},${storeLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 text-xs font-extrabold transition-all scale-100 hover:scale-105"
                  >
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Location Card */}
                <Card className="p-5 border border-border shadow-sm bg-card space-y-4">
                  <h3 className="flex items-center gap-2 font-bold text-sm text-foreground uppercase tracking-wider border-b border-border pb-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    Store Location
                  </h3>
                  
                  <div className="space-y-3.5 text-xs">
                    {/* Reverse Geocoded Street Address from Google / Geocoding */}
                    <div>
                      <span className="text-primary block text-[10px] font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        Street Address (Google Geocoded)
                      </span>
                      <div className="font-bold text-foreground text-sm flex items-center gap-2 bg-muted/50 p-3.5 rounded-xl border border-border">
                        {isGeocoding ? (
                          <span className="text-muted-foreground animate-pulse flex items-center gap-2 text-xs font-normal">
                            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                            Fetching street address from Google...
                          </span>
                        ) : (
                          <>
                            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>{geocodedAddress || displayAddress}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Opening Hours Card */}
                <Card className="p-5 border border-border shadow-sm bg-card">
                  <h3 className="flex items-center gap-2 font-bold text-sm text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Opening Hours
                  </h3>
                  <div className="space-y-2 text-xs">
                    {(store.hours && store.hours.length > 0 ? store.hours : [
                      { days: 'Monday - Friday', hours: '8:00 AM - 8:00 PM' },
                      { days: 'Saturday - Sunday', hours: '9:00 AM - 6:00 PM' }
                    ]).map((h, i) => (
                      <div key={i} className="flex justify-between border-b border-border/40 pb-1.5 last:border-0">
                        <span className="text-muted-foreground font-medium">{h.days}</span>
                        <span className="font-bold text-foreground">{h.hours}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Store Description Card */}
              <Card className="p-5 border border-border shadow-sm bg-card">
                <h3 className="flex items-center gap-2 font-bold text-sm text-foreground uppercase tracking-wider mb-3 border-b border-border pb-2">
                  <Compass className="w-4 h-4 text-primary" />
                  Store Description
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {store.description || 'Welcome to our store. We offer top quality products and fast delivery services.'}
                </p>
              </Card>
            </div>
          );
        })()}

        {/* Reviews tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-center bg-muted border border-slate-200 dark:border-slate-805 p-6 rounded-2xl">
              <div className="text-center md:border-r border-border pr-6">
                <h2 className="text-5xl font-extrabold text-slate-950 dark:text-white">{store.rating}</h2>
                <div className="flex items-center justify-center gap-0.5 mt-2 mb-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">Based on {store.reviewCount} reviews</span>
              </div>

              {/* Rating score segments */}
              <div className="flex-1 space-y-2 w-full text-xs text-muted-foreground">
                {[
                  { stars: 5, pct: '85%' },
                  { stars: 4, pct: '10%' },
                  { stars: 3, pct: '3%' },
                  { stars: 2, pct: '1%' },
                  { stars: 1, pct: '1%' }
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-3 text-right">{row.stars}</span>
                    <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: row.pct }} />
                    </div>
                    <span className="w-8 text-right font-medium">{row.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              {(store.reviews || []).map((rev) => (
                <Card key={rev.id} className="p-4 border border-border bg-card shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {rev.userName.charAt(0)}
                      </div>
                      <h4 className="font-bold text-sm text-foreground">{rev.userName}</h4>
                    </div>
                    <span className="text-[10px] text-slate-400">{rev.date}</span>
                  </div>

                  <div className="flex items-center gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400 stroke-amber-400' : 'text-slate-350'}`} />
                    ))}
                  </div>

                  <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                    {rev.comment}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Gallery & Promotions tab */}
        {activeTab === 'gallery' && (
          <div className="space-y-6">
            {/* Coupon promotion cards */}
            {(store.promotions || []).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(store.promotions || []).map((promo, idx) => (
                  <Card key={idx} className="p-4 border border-dashed border-primary bg-primary/5 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
                      <Percent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-white border-0 text-[10px] font-bold">
                          {promo.code}
                        </Badge>
                        <span className="text-xs font-extrabold text-foreground">Save {promo.discountValue}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{promo.description}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Gallery Image cards */}
            <div>
              <h3 className="flex items-center gap-2 font-bold text-sm text-foreground uppercase tracking-wider mb-4 border-b border-slate-50 dark:border-slate-800 pb-2">
                <Image className="w-4 h-4 text-primary" />
                Store Photo Gallery
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(store.gallery || []).map((imgUrl, i) => (
                  <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm bg-slate-100">
                    <img 
                      src={imgUrl} 
                      alt={`Gallery ${i}`} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                      onClick={() => window.open(imgUrl, '_blank')}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* ── RIGHT SIDEBAR (LIVE CART) ── */}
      <div className="hidden xl:block flex-none w-[320px] shrink-0 border-l border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-6">
            
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
