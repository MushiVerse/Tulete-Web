import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../../shared/components/layout';
import { Button } from '../../../shared/components/ui/Button';
import { 
  Search, MapPin, Star, Heart, Flame, 
  Utensils, Store as StoreIcon, Tag, ArrowRight, 
  Sparkles, Bell, CheckCircle2, Clock, ShoppingBag, ChevronRight, LayoutGrid, Trash2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { storeService, Store } from '../../stores/services/storeService';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useLocationStore } from '../../location/store/useLocationStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { useCartStore } from '../../cart/store/useCartStore';
import { APP_SETTINGS } from '@/core/config/settings';
import { HorizontalCarousel } from '../../../shared/components/ui/HorizontalCarousel';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { productService, Product } from '../../products/services/productService';
import { useFavoritesStore } from '../../favorites/hooks/useFavoritesStore';
import { BrandsView } from '../../brands/components/BrandsView';
import { BrandDetailsView } from '../../brands/components/BrandDetailsView';
import { HomeSearchResultsView } from '../components/HomeSearchResultsView';
import { MobileSearchOverlay } from '../../../shared/components/MobileSearchOverlay';
import { searchTuleteItems } from '../../../core/services/algoliaService';


/*  Shared Configs  */
const CAT_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  Food:       { emoji: '🍔', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
  Laundry:    { emoji: '👔', color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/20' },
  Products:   { emoji: '🛍️', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Electrical: { emoji: '⚡', color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  Beauty:     { emoji: '💅', color: 'text-primary', bg: 'bg-primary/5 border-primary/10' },
  Rides:      { emoji: '🚗', color: 'text-success', bg: 'bg-success/10 border-success/20' },
};

/*  Static Data */
const PROMOS = [
  {
    id: 1,
    badge: ' Limited Offer',
    title: '50% Off First Laundry',
    subtitle: 'Fresh & pressed  use code WASH50',
    image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?q=80&w=800&auto=format&fit=crop',
    cta: 'Order Now',
    href: '/laundry',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'laundry'
  },
  {
    id: 101,
    badge: ' Express Service',
    title: 'Same Day Dry Cleaning',
    subtitle: 'Drop by 10AM, pickup by 5PM',
    image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?q=80&w=800&auto=format&fit=crop',
    cta: 'Book Express',
    href: '/laundry',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'laundry'
  },
  {
    id: 102,
    badge: ' Executive Care',
    title: 'Premium Suit Pressing',
    subtitle: 'Keep your professional wardrobe sharp',
    image: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?q=80&w=800&auto=format&fit=crop',
    cta: 'View Services',
    href: '/laundry',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'laundry'
  },
  {
    id: 103,
    badge: ' Heavy Duty',
    title: 'Duvet & Blanket Wash',
    subtitle: 'Deep cleaning for large bedding items',
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=800&auto=format&fit=crop',
    cta: 'Clean Bedding',
    href: '/laundry',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'laundry'
  },
  {
    id: 104,
    badge: ' Sneaker Care',
    title: 'Professional Shoe Cleaning',
    subtitle: 'Revive your favorite kicks',
    image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=800&auto=format&fit=crop',
    cta: 'Clean Shoes',
    href: '/laundry',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'laundry'
  },
  {
    id: 105,
    badge: ' Curtains & Drapes',
    title: 'Home Fabric Refresh',
    subtitle: 'Dust removal and deep wash for curtains',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop',
    cta: 'Book Curtains',
    href: '/laundry',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'laundry'
  },

  //  FOOD PROMOS 
  {
    id: 2,
    badge: ' Today Only',
    title: 'Free Delivery on Food',
    subtitle: 'From top-rated kitchens near you',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    cta: 'Order Food',
    href: '/food',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'food'
  },
  {
    id: 201,
    badge: ' Local Taste',
    title: 'Authentic Local Dishes',
    subtitle: 'Pilau, Biryani, and fresh stews',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop',
    cta: 'Explore Menu',
    href: '/food',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'food'
  },
  {
    id: 202,
    badge: ' Quick Bite',
    title: 'Fast Food Combos',
    subtitle: 'Burgers, fries, and cold drinks',
    image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?q=80&w=800&auto=format&fit=crop',
    cta: 'Get Combo',
    href: '/food',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'food'
  },
  {
    id: 203,
    badge: ' Healthy Choice',
    title: 'Fresh Salads & Bowls',
    subtitle: 'Nutritious meals delivered fresh',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop',
    cta: 'Eat Healthy',
    href: '/food',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'food'
  },
  {
    id: 204,
    badge: ' Weekend Special',
    title: 'Family Size Pizza',
    subtitle: 'Buy 1 Get 1 Free on all large pizzas',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    cta: 'Order Pizza',
    href: '/food',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'food'
  },
  {
    id: 205,
    badge: ' Sweet Tooth',
    title: 'Desserts & Pastries',
    subtitle: 'Freshly baked cakes and cookies',
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=800&auto=format&fit=crop',
    cta: 'Satisfy Cravings',
    href: '/food',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'food'
  },

  //  PRODUCT PROMOS 
  {
    id: 3,
    badge: ' New Arrivals',
    title: 'Shop Top Products',
    subtitle: 'Electronics, fashion & more  delivered fast',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop',
    cta: 'Shop Now',
    href: '/products',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'product'
  },
  {
    id: 4,
    badge: ' Fast Response',
    title: 'Electricians In 30 min',
    subtitle: 'Certified pros ready near you',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop',
    cta: 'Book Fundi',
    href: '/explore?category=Electrical',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'product'
  },
  {
    id: 301,
    badge: ' Beauty Bar',
    title: 'Top Beauty & Cosmetics',
    subtitle: 'Skincare, makeup, and hair essentials',
    image: 'https://images.unsplash.com/photo-1596462502278-27bf85033e5a?q=80&w=800&auto=format&fit=crop',
    cta: 'Shop Beauty',
    href: '/products',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'product'
  },
  {
    id: 302,
    badge: ' Tech Deals',
    title: 'Latest Mobile Phones',
    subtitle: 'Upgrade your device today',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop',
    cta: 'View Phones',
    href: '/products',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'product'
  },
  {
    id: 303,
    badge: ' Home Essentials',
    title: 'Smart Home Devices',
    subtitle: 'Automate your living space',
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800&auto=format&fit=crop',
    cta: 'Shop Smart Home',
    href: '/products',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'product'
  },
  {
    id: 304,
    badge: ' Fashion Week',
    title: 'Trending Apparel',
    subtitle: 'Upgrade your wardrobe with latest styles',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=800&auto=format&fit=crop',
    cta: 'Shop Fashion',
    href: '/products',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
    category: 'product'
  }
];



const STATS = [
  { value: '200+', label: 'Providers', icon: StoreIcon },
  { value: '4.8⭐', label: 'Avg Rating', icon: Star },
  { value: '30min', label: 'Avg Delivery', icon: Clock },
  { value: '24/7', label: 'Support', icon: Bell },
];

/*  Store Card  */
const FeaturedStoreCard = ({ store, onClick, isFav, onFav }: {
  store: Store & { distance?: number };
  onClick: () => void;
  isFav: boolean;
  onFav: (e: React.MouseEvent) => void;
}) => {
  const getDynamicStoreCat = (s: any) => {
    const text = `${s.store} ${s.name || ''} ${s.description || ''}`.toLowerCase();
    if (text.match(/laundry|cloth|suit|wash|bedding|dryclean|iron|fashion|fits|boutique|wear|shoes|apparel/)) return 'Laundry';
    if (text.match(/food|meal|platter|restaurant|bakery|meat|pizza|burger|kitchen|cafe|dine/)) return 'Food';
    if (s.category === 'Food') return 'Food';
    if (s.category === 'Laundry') return 'Laundry';
    return 'Products';
  };
  const actualCategory = getDynamicStoreCat(store);
  const cfg = CAT_CONFIG[actualCategory] || CAT_CONFIG.Food;
  
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full h-full cursor-pointer group"
    >
      <div className="bg-card rounded-3xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full group-hover:-translate-y-1">
        {/* Cover image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted shrink-0">
          <img
            src={store.imgURL}
            alt={store.store}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-40 group-hover:opacity-50 transition-opacity" />

          {/* Status & Fav Row */}
          <div className="absolute top-3 inset-x-3 flex justify-between items-start">
            <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full shadow-sm backdrop-blur-md ${
              store.availability ? 'bg-success/90 text-primary-foreground' : 'bg-black/50 text-white'
            }`}>
              {store.availability ? 'Open Now' : 'Closed'}
            </span>
            <button
              onClick={onFav}
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm hover:bg-white/40 active:scale-95 transition-all"
            >
              <Heart className={`w-4 h-4 transition-colors ${isFav ? 'fill-primary text-primary' : 'text-white'}`} />
            </button>
          </div>

          {/* Bottom Row on Image */}
          <div className="absolute bottom-3 inset-x-3 flex justify-between items-end">
            <div className={`flex items-center gap-1.5 ${cfg.bg} border px-2.5 py-1.5 rounded-full bg-background/95 backdrop-blur shadow-sm`}>
              <span className="text-sm">{cfg.emoji}</span>
              <span className={`text-[11px] font-extrabold uppercase tracking-widest ${cfg.color}`}>{actualCategory}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm">
              <Star className="w-4 h-4 fill-warning stroke-warning" />
              <span className="text-white text-sm font-extrabold">{store.rating || ''}</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1 bg-card">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-extrabold text-foreground text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors flex-1">
              {store.store}
            </h3>
            {store.isVerified && (
              <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
            )}
          </div>

          <div className="flex flex-col gap-1.5 mt-auto pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground truncate">{store.address || 'Nairobi'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold">20-35 min</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Star className="w-3.5 h-3.5 fill-warning stroke-warning shrink-0" />
                <span className="text-xs font-semibold text-foreground">{store.rating || ''}</span>
                <span className="text-xs text-muted-foreground">({store.reviewCount || 0})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/*  Main HomePage  */
export const HomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { openModal } = useAuthModalStore();
  const { items: cartItems, getTotals, addToCart, removeFromCart, clearCart } = useCartStore();
  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;
  const { currentLocation } = useLocationStore();

  const [filterValue, setFilterValue] = useState<'food' | 'product' | 'laundry' | 'brands' | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<{name: string, category: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileResults, setMobileResults] = useState<any[]>([]);
  const [mobileLoading, setMobileLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Live search for mobile overlay
  useEffect(() => {
    if (!isMobileSearchOpen || !searchQuery.trim()) { setMobileResults([]); return; }
    const controller = new AbortController();
    const run = async () => {
      setMobileLoading(true);
      try {
        const filterStr = filterValue === 'food' ? 'recordType:food'
          : filterValue === 'product' ? 'recordType:product'
          : filterValue === 'laundry' ? 'recordType:cloth'
          : 'NOT recordType:brand';
        const hits = await searchTuleteItems(searchQuery, { filters: filterStr, hitsPerPage: 40 });
        if (!controller.signal.aborted) setMobileResults(hits);
      } finally {
        if (!controller.signal.aborted) setMobileLoading(false);
      }
    };
    const t = setTimeout(run, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [searchQuery, isMobileSearchOpen, filterValue]);


  const [favorites, setFavorites] = useState<string[]>(() => {
    const s = localStorage.getItem('tulete_favorite_stores');
    return s ? JSON.parse(s) : [];
  });
  const promoRef = useRef<HTMLDivElement>(null);
  const openNowRef = useRef<HTMLDivElement>(null);
  const topRatedRef = useRef<HTMLDivElement>(null);

  const { isFavorited, toggleFavorite: toggleProductFavorite, initialize: initFavs } = useFavoritesStore();

  useEffect(() => {
    initFavs(user?.id || 'guest_user');
  }, [user?.id, initFavs]);

  const handleProductFav = (p: Product) => {
    toggleProductFavorite(user?.id || 'guest_user', {
      type: 'product',
      itemId: p.id,
      name: p.name,
      description: p.description || '',
      imageUrl: p.imgUrl || '',
      price: p.price,
      rating: p.rating,
      reviewCount: p.reviewCount,
    });
  };

  const handleAddToCart = (p: Product) => {
    let cat = 'Product';
    const collection = (p as Product & { _collection?: string })._collection;
    if (collection === 'foods' || foods.some(f => f.id === p.id)) cat = 'Food';
    else if (collection === 'cloths' || cloths.some(c => c.id === p.id)) cat = 'Laundry';
    
    addToCart({
      productId: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.imgUrl,
      storeId: p.storeId,
      storeName: p.store,
      cat
    });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning ' : hour < 17 ? 'Good afternoon ' : 'Good evening ';
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  const { data: storesData } = useFirestoreQuery(
    ['stores', 'home'],
    storeService,
    { limit: 12 }
  );

  const stores = storesData?.data || [];
  const topStores = [...stores].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const openStores = topStores.filter(s => s.availability);

  const { data: foodsData } = useFirestoreQuery(['foods', 'home'], productService, { filters: [{ field: '_collection', operator: '==', value: 'foods' }], limit: 8 });
  const { data: productsData } = useFirestoreQuery(['products', 'home'], productService, { filters: [{ field: '_collection', operator: '==', value: 'products' }], limit: 8 });
  const { data: clothsData } = useFirestoreQuery(['cloths', 'home'], productService, { filters: [{ field: '_collection', operator: '==', value: 'cloths' }], limit: 8 });

  const foods = foodsData?.data || [];
  const products = productsData?.data || [];
  const cloths = clothsData?.data || [];
  
  // Create allItems without deduplicating incorrectly
  const allItems = [...foods, ...products, ...cloths];

  let currentItems = allItems;
  if (filterValue === 'food') currentItems = foods;
  if (filterValue === 'product') currentItems = products;
  if (filterValue === 'laundry') currentItems = cloths;

  const recommendedProducts = currentItems.slice(0, 8);
  const mostRatedProducts = [...currentItems].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8);
  const interestedLately = currentItems.slice(0, 6);
  const wishlistProducts = currentItems.slice(0, 5); // Fallback slice from 0 if there are fewer than 3 items
  const productsNearMe = [...currentItems].sort(() => 0.5 - Math.random()).slice(0, 8);

  const dailyMeals = foods;
  const dailyDeals = products.filter(p => p.oldprice && p.oldprice > p.price);
  const laundryClean = cloths;

  const filteredPromos = PROMOS.filter(p => !filterValue || p.category === filterValue);

  // Interval-based snapping for Promo Carousel (Holds for 5 seconds so users can read)
  useEffect(() => {
    const t = setInterval(() => {
      if (promoRef.current && !promoRef.current.matches(':hover')) {
        const { scrollLeft, scrollWidth, clientWidth } = promoRef.current;
        const cardWidth = promoRef.current.firstElementChild?.clientWidth || 300;
        
        if (scrollLeft >= scrollWidth - clientWidth - 10) {
          promoRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          promoRef.current.scrollBy({ left: cardWidth + 16, behavior: 'smooth' });
        }
      }
    }, 5000);
    return () => clearInterval(t);
  }, []);


  // Auto-scroll product carousels (Continuous Smooth Sliding)
  useEffect(() => {
    let req1: number;
    let req2: number;

    const startScrolling = (ref: React.RefObject<HTMLDivElement>, speed: number, reqIdSetter: (id: number) => void) => {
      let accumulator = 0;
      const scroll = () => {
        if (!ref.current) return;
        
        // Pause scrolling if user is hovering over the carousel
        if (!ref.current.matches(':hover')) {
          accumulator += speed;
          if (accumulator >= 1) {
            const pixels = Math.floor(accumulator);
            accumulator -= pixels;
            
            const { scrollLeft, scrollWidth, clientWidth } = ref.current;
            const maxScroll = scrollWidth - clientWidth;

            if (scrollLeft >= maxScroll - 1) {
              ref.current.scrollLeft = 0;
            } else {
              ref.current.scrollLeft += pixels;
            }
          }
        }
        
        reqIdSetter(requestAnimationFrame(scroll));
      };
      reqIdSetter(requestAnimationFrame(scroll));
    };

    startScrolling(openNowRef, 0.6, (id) => req1 = id);
    startScrolling(topRatedRef, 0.4, (id) => req2 = id);
    
    return () => {
      cancelAnimationFrame(req1);
      cancelAnimationFrame(req2);
    };
  }, [openStores.length, topStores.length]);

  const toggleFav = (storeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.includes(storeId)
      ? favorites.filter(id => id !== storeId)
      : [...favorites, storeId];
    setFavorites(updated);
    localStorage.setItem('tulete_favorite_stores', JSON.stringify(updated));
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    navigate('/cart');
  };

  return (
    <PageContainer className="flex-1 flex flex-col min-h-0">
      {/* Mobile full-screen search overlay */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <MobileSearchOverlay
            query={searchQuery}
            onChange={setSearchQuery}
            onClose={() => { setIsMobileSearchOpen(false); setSearchQuery(''); setMobileResults([]); }}
            loading={mobileLoading}
            results={mobileResults}
            placeholder={filterValue === 'brands' ? 'Search brands...' : 'Search stores, food, laundry...'}
          />
        )}
      </AnimatePresence>
      <div className="flex w-full bg-background relative items-start lg:h-[calc(100vh-4rem)] lg:overflow-hidden">

        {/*  LEFT SIDEBAR (FILTERS)  */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full overflow-hidden px-6 pt-6 pb-8">
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Filters</h2>
            
            <button onClick={() => setFilterValue(null)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group border ${filterValue === null ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${filterValue === null ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}><LayoutGrid className="w-4 h-4"/></div>
              <span className="font-bold text-sm">All</span>
            </button>
            
            <button onClick={() => { setFilterValue(filterValue === 'food' ? null : 'food'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group border ${filterValue === 'food' ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted'}`}>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0"><Utensils className="w-4 h-4"/></div>
              <span className="font-bold text-sm">Foods</span>
            </button>
            
            <button onClick={() => { setFilterValue(filterValue === 'product' ? null : 'product'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group border ${filterValue === 'product' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-card text-foreground border-border hover:border-emerald-500/50 hover:bg-muted'}`}>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform shrink-0"><ShoppingBag className="w-4 h-4"/></div>
              <span className="font-bold text-sm">Shopping</span>
            </button>

            <button onClick={() => { setFilterValue(filterValue === 'laundry' ? null : 'laundry'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group border ${filterValue === 'laundry' ? 'bg-secondary text-secondary-foreground border-secondary shadow-md' : 'bg-card text-foreground border-border hover:border-secondary/50 hover:bg-muted'}`}>
              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-105 transition-transform shrink-0"><Sparkles className="w-4 h-4"/></div>
              <span className="font-bold text-sm">Laundry</span>
            </button>

            <button onClick={() => { setFilterValue(filterValue === 'brands' ? null : 'brands'); setSelectedBrand(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group border ${filterValue === 'brands' ? 'bg-muted text-foreground border-border shadow-md scale-105' : 'bg-card text-foreground border-border hover:border-muted-foreground/50 hover:bg-muted'}`}>
              <div className="w-8 h-8 rounded-lg bg-muted-foreground/10 flex items-center justify-center text-muted-foreground group-hover:scale-105 transition-transform shrink-0"><Tag className="w-4 h-4"/></div>
              <span className="font-bold text-sm">Brands</span>
            </button>
          </div>
        </div>

        {/*  CENTER/MAIN COLUMN  */}
        <div className="flex-auto min-w-0 max-w-full h-auto lg:h-full overflow-visible lg:overflow-y-auto scrollbar-none pt-6 pb-28 px-4 lg:px-8 xl:px-10 space-y-8">

          {/*  HEADER SECTION  */}
        <div className="pt-2 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">{greeting}</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Hi, <span className="text-primary">{firstName}</span>!
              </h1>
              <p className="text-base text-muted-foreground mt-1">What can we get for you today?</p>
            </div>
            <button
              onClick={() => navigate('/notifications')}
              className="relative w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
            >
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card" />
            </button>
          </div>

          <div className="relative flex items-center w-full bg-card border border-border rounded-2xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary px-3 h-14">
            <Search 
              className="w-5 h-5 text-muted-foreground shrink-0 ml-2 cursor-pointer hover:text-primary transition-colors" 
            />
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                // On mobile (window width < 1024px) open full-screen overlay
                if (window.innerWidth < 1024) setIsMobileSearchOpen(true);
              }}
              placeholder={selectedBrand ? `Search ${selectedBrand.name}...` : filterValue === 'brands' ? 'Search brands...' : 'Search stores, food, laundry...'}
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium text-foreground px-3 placeholder:text-muted-foreground h-full"
            />

            {/* Tag / Badge */}
            <div 
              onClick={() => {
                const filters: ('food' | 'product' | 'laundry' | 'brands' | null)[] = [null, 'food', 'product', 'laundry', 'brands'];
                const currentIndex = filters.indexOf(filterValue);
                const nextIndex = (currentIndex + 1) % filters.length;
                const nextFilter = filters[nextIndex];
                setFilterValue(nextFilter);
                if (nextFilter !== 'brands') setSelectedBrand(null);
              }}
              className="flex items-center gap-1.5 ml-3 mr-2 px-3 py-1.5 bg-primary/10 text-primary text-xs font-extrabold rounded-full shrink-0 cursor-pointer hover:bg-primary/20 transition-colors select-none"
            >
              {selectedBrand ? selectedBrand.name : filterValue === 'brands' ? 'Brands' : filterValue === 'food' ? 'Food' : filterValue === 'product' ? 'Shopping' : filterValue === 'laundry' ? 'Laundry' : 'All'}
            </div>
          </div>
        </div>

          {/*  FILTER CHIPS (Mobile Only)  */}
          <div className="lg:hidden -mx-4 px-4 flex gap-3 overflow-x-auto scrollbar-none pb-2 pt-1">
            <button
              onClick={() => setFilterValue(null)}
              className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-extrabold transition-all border shadow-sm ${
                filterValue === null
                  ? 'bg-primary text-primary-foreground border-primary scale-105'
                  : 'bg-card text-foreground border-border hover:border-primary/30'
              }`}
            >
              <LayoutGrid className="w-4 h-4 opacity-70" />
              All
            </button>
            <button
              onClick={() => {
                setFilterValue(filterValue === 'food' ? null : 'food');
              }}
              className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-extrabold transition-all border shadow-sm ${
                filterValue === 'food'
                  ? 'bg-primary text-primary-foreground border-primary scale-105'
                  : 'bg-card text-foreground border-border hover:border-primary/30'
              }`}
            >
              <Utensils className="w-4 h-4 opacity-70" />
              Foods
            </button>
            <button
              onClick={() => {
                setFilterValue(filterValue === 'product' ? null : 'product');
              }}
              className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-extrabold transition-all border shadow-sm ${
                filterValue === 'product'
                  ? 'bg-emerald-500 text-white border-emerald-500 scale-105'
                  : 'bg-card text-foreground border-border hover:border-emerald-500/30'
              }`}
            >
              <ShoppingBag className="w-4 h-4 opacity-70" />
              Shopping
            </button>
            <button
              onClick={() => {
                setFilterValue(filterValue === 'laundry' ? null : 'laundry');
              }}
              className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-extrabold transition-all border shadow-sm ${
                filterValue === 'laundry'
                  ? 'bg-secondary text-secondary-foreground border-secondary scale-105'
                  : 'bg-card text-foreground border-border hover:border-secondary/30'
              }`}
            >
              <Sparkles className="w-4 h-4 opacity-70" />
              Laundry
            </button>
            <button
              onClick={() => { setFilterValue(filterValue === 'brands' ? null : 'brands'); setSelectedBrand(null); }}
              className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-extrabold transition-all border shadow-sm ${
                filterValue === 'brands'
                  ? 'bg-muted text-foreground border-border scale-105'
                  : 'bg-card text-foreground border-border hover:border-muted-foreground/30'
              }`}
            >
              <Tag className="w-4 h-4 opacity-70" />
              Brands
            </button>
          </div>

          {filterValue === 'brands' ? (
            selectedBrand ? (
              <BrandDetailsView 
                brandName={selectedBrand.name} 
                categoryParam={selectedBrand.category} 
                searchQuery={searchQuery}
                onBack={() => { setSelectedBrand(null); setSearchQuery(''); }} 
              />
            ) : (
              <BrandsView 
                searchQuery={searchQuery}
                onSelectBrand={(name, category) => { setSelectedBrand({ name, category }); setSearchQuery(''); }} 
              />
            )
          ) : debouncedSearchQuery.trim().length > 0 ? (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-foreground">Search Results</h2>
                <span className="text-sm font-medium text-muted-foreground">For "{debouncedSearchQuery}"</span>
              </div>
              <HomeSearchResultsView query={debouncedSearchQuery} filterValue={filterValue} />
            </div>
          ) : (
            <>
          {/* PROMO CAROUSEL */}
          <div>
              <div
                ref={promoRef}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2"
              >
                <AnimatePresence mode="popLayout">
                  {filteredPromos.map((promo, i) => (
                    <motion.div
                      key={promo.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="snap-center shrink-0 w-[85%] sm:w-[60%] lg:w-[50%] xl:w-[45%]"
                    >
                    <div
                      onClick={() => navigate(promo.href)}
                      className="relative h-72 rounded-3xl overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all border border-border/50"
                    >
                      <img
                        src={promo.image}
                        alt={promo.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-br ${promo.gradient} opacity-45`} />
                      <div className="absolute inset-0 p-6 flex flex-col justify-between">
                        <span className="self-start bg-background/20 backdrop-blur text-primary-foreground text-xs font-extrabold px-3.5 py-1.5 rounded-full">
                          {promo.badge}
                        </span>
                        <div className="text-secondary-foreground">
                          <h3 className="font-extrabold text-2xl leading-tight mb-1.5 drop-shadow-md">{promo.title}</h3>
                          <p className="opacity-90 text-sm font-medium mb-4">{promo.subtitle}</p>
                          <span className="inline-flex items-center gap-2 bg-background text-foreground text-xs font-extrabold px-5 py-2.5 rounded-full hover:scale-105 transition-transform shadow-sm">
                            {promo.cta} <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            </div>




            {/* 1. Recommended for you (Products) */}
            {recommendedProducts.length > 0 && (
              <HorizontalCarousel title="Recommended for you" icon={<Star className="w-5 h-5 fill-primary stroke-primary" />} actionLink="/products" autoScrollSpeed={0.3}>
                {recommendedProducts.slice(0, 8).map(product => (
                  <div key={`rec-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 3. Stores near me (Stores) */}
            {filterValue !== 'food' && openStores
              .filter((store) => {
                const getStoreCategoryGroup = (store: any) => {
                  const text = `${store.store} ${store.name || ''} ${store.description || ''}`.toLowerCase();
                  if (text.match(/laundry|cloth|suit|wash|bedding|dryclean|iron|fashion|fits|boutique|wear|shoes|apparel/)) return 'laundry';
                  if (text.match(/food|meal|platter|restaurant|bakery|meat|pizza|burger|kitchen|cafe|dine/)) return 'food';
                  
                  // If it doesn't match descriptions, fallback to whatever the database says just in case it's actually correct and missing keywords
                  if (store.category === 'Food') return 'food';
                  if (store.category === 'Laundry') return 'laundry';
                  
                  return 'product';
                };

                const actualCategory = getStoreCategoryGroup(store);
                if (!filterValue) return true;
                if (filterValue === 'product') return actualCategory === 'product';
                if (filterValue === 'laundry') return actualCategory === 'laundry';
                return true;
              })
              .length > 0 && (
              <HorizontalCarousel title="Stores near me" icon={<MapPin className="w-5 h-5 text-primary" />} actionLink="/explore">
                {openStores
                  .filter((store) => {
                    const getStoreCategoryGroup = (store: any) => {
                      const text = `${store.store} ${store.name || ''} ${store.description || ''}`.toLowerCase();
                      if (text.match(/laundry|cloth|suit|wash|bedding|dryclean|iron|fashion|fits|boutique|wear|shoes|apparel/)) return 'laundry';
                      if (text.match(/food|meal|platter|restaurant|bakery|meat|pizza|burger|kitchen|cafe|dine/)) return 'food';
                      
                      if (store.category === 'Food') return 'food';
                      if (store.category === 'Laundry') return 'laundry';
                      
                      return 'product';
                    };

                    const actualCategory = getStoreCategoryGroup(store);
                    if (!filterValue) return true;
                    if (filterValue === 'product') return actualCategory === 'product';
                    if (filterValue === 'laundry') return actualCategory === 'laundry';
                    return true;
                  })
                  .slice(0, 6).map((store) => (
                  <div key={`store-${store.id}`} className="w-[280px] sm:w-[320px] shrink-0">
                    <FeaturedStoreCard
                      store={store}
                      onClick={() => navigate(`/store/${store.id}`)}
                      isFav={favorites.includes(store.id)}
                      onFav={(e) => toggleFav(store.id, e)}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 3.5 Products near me */}
            {productsNearMe.length > 0 && (
              <HorizontalCarousel title="Near me" icon={<MapPin className="w-5 h-5 text-primary" />} actionLink="/explore" autoScrollSpeed={0.35}>
                {productsNearMe.map((product, idx) => (
                  <div key={`near-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0 relative group">
                    <div className="absolute top-2 left-2 z-10 bg-background/95 backdrop-blur text-foreground text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 border border-border group-hover:scale-105 transition-transform">
                      <MapPin className="w-3 h-3 text-primary" /> {Math.max(0.2, (1 + (idx * 0.3))).toFixed(1)} km
                    </div>
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 4. Most rated */}
            {mostRatedProducts.length > 0 && (
              <HorizontalCarousel title="Most rated" icon={<Flame className="w-5 h-5 text-orange-500 fill-orange-500" />} actionLink="/explore?sort=popular" autoScrollSpeed={0.4}>
                {mostRatedProducts.slice(0, 8).map(product => (
                  <div key={`rated-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 5. What interested you lately */}
            {interestedLately.length > 0 && (
              <HorizontalCarousel title="What interested you lately" icon={<Clock className="w-5 h-5 text-muted-foreground" />} actionLink="/explore" autoScrollSpeed={0.2}>
                {interestedLately.map(product => (
                  <div key={`int-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 6. What you wish for */}
            {wishlistProducts.length > 0 && (
              <HorizontalCarousel title="What you wish for" icon={<Heart className="w-5 h-5 text-destructive fill-destructive" />} actionLink="/favorites" autoScrollSpeed={0.6}>
                {wishlistProducts.map(product => (
                  <div key={`wish-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 7. Daily meals & drinks (Food Only) */}
            {(!filterValue || filterValue === 'food') && dailyMeals.length > 0 && (
              <HorizontalCarousel title="Daily meals & drinks" icon={<Utensils className="w-5 h-5 text-primary" />} actionLink="/food">
                {dailyMeals.map(product => (
                  <div key={`food-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 8. Daily deals in shopping (Products Only) */}
            {(!filterValue || filterValue === 'product') && dailyDeals.length > 0 && (
              <HorizontalCarousel title="Daily deals in shopping" icon={<Tag className="w-5 h-5 text-warning" />} actionLink="/products?deals=true" autoScrollSpeed={0.3}>
                {dailyDeals.map(product => (
                  <div key={`deal-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 9. What we clean (Laundry Only) */}
            {(!filterValue || filterValue === 'laundry') && laundryClean.length > 0 && (
              <HorizontalCarousel title="What we clean" icon={<Sparkles className="w-5 h-5 text-primary" />} actionLink="/laundry" autoScrollSpeed={0.4}>
                {laundryClean.map(product => (
                  <div key={`laundry-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}
            </>
          )}

        </div>

        {/*  RIGHT SIDEBAR (WIDGETS & CART)  */}
        <div className="hidden xl:block flex-none w-[320px] shrink-0 border-l border-border h-full overflow-hidden px-6 pt-6 pb-8">
          <div className="space-y-6">
              
              {/* LIVE CART WIDGET */}
              {hasItems && (
                <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Your Order</h2>
                    <ShoppingBag className="w-4 h-4 text-primary" />
                  </div>

                  <div className="space-y-3 mb-4 max-h-[250px] overflow-y-auto scrollbar-none">
                    {cartItems.map((cartItem) => (
                      <div key={cartItem.productId} className="group/row flex justify-between items-center text-sm py-1 rounded-lg hover:bg-muted/50 px-1 transition-colors">
                        <span className="font-bold text-muted-foreground line-clamp-1 flex-1">
                          {cartItem.quantity}x {cartItem.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <span className="font-extrabold text-foreground">
                            {APP_SETTINGS.currency} {(cartItem.price * cartItem.quantity).toLocaleString()}
                          </span>
                          <button
                            onClick={() => removeFromCart(cartItem.productId)}
                            title="Remove item"
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
                      <span className="text-xl font-extrabold text-foreground">{APP_SETTINGS.currency} {cartTotal.toLocaleString()}</span>
                    </div>
                    <Button
                      onClick={handleCheckout}
                      className="w-full rounded-xl py-4 font-extrabold shadow-md flex items-center justify-center gap-2"
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
                </div>
              )}

              {/* QUICK ACTION CARDS (Hidden if cart is full to save space, or shown below) */}
              {!hasItems && (
                <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Quick Actions</h2>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      emoji: '',
                      title: 'Book Laundry',
                      sub: 'Express pickup',
                      href: '/laundry',
                      gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
                    },
                    {
                      emoji: '',
                      title: 'My Orders',
                      sub: 'Track deliveries',
                      href: '/orders',
                      gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
                    },
                    {
                      emoji: '',
                      title: 'Favourites',
                      sub: 'Saved items',
                      href: '/favorites',
                      gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
                    },
                    {
                      emoji: '',
                      title: 'All Stores',
                      sub: 'Browse network',
                      href: '/explore',
                      gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
                    },
                  ].map(({ emoji, title, sub, href, gradient }) => (
                    <motion.button
                      key={title}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => navigate(href)}
                      className={`bg-gradient-to-br ${gradient} rounded-xl p-3 flex items-center gap-3 text-left shadow-sm hover:shadow-md transition-all border border-black/5 group`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-background/20 flex items-center justify-center shrink-0 shadow-sm">
                        <span className="text-lg">{emoji}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-extrabold text-xs leading-tight">{title}</p>
                        <p className="opacity-80 text-[10px] mt-0.5">{sub}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  ))}
                </div>
              </div>
              )}

              {/* TRUST STATS BAND */}
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
                <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider text-foreground">Platform Stats</h2>
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

              {/* LAUNDRY PROMO BANNER */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/laundry')}
                className="relative rounded-3xl overflow-hidden h-40 cursor-pointer shadow-sm bg-primary border border-border"
              >
                <img
                  src="https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?q=80&w=800&auto=format&fit=crop"
                  alt="Laundry"
                  className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40"
                />
                <div className="absolute inset-0 flex flex-col justify-between p-5">
                  <div className="text-primary-foreground">
                    <p className="opacity-90 text-[10px] font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Professional Cleaning
                    </p>
                    <h3 className="font-extrabold text-xl leading-tight">Laundry at Your Door</h3>
                    <p className="opacity-80 text-xs mt-1">Pick up in 2 hrs  Express available</p>
                  </div>
                  <div className="self-start flex items-center gap-1.5 bg-background text-foreground font-extrabold text-xs px-4 py-2 rounded-full shadow-sm hover:bg-secondary hover:text-secondary-foreground transition-colors">
                    Order Now <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>

          </div>
        </div>

        {/* MOBILE FLOATING CHECKOUT BAR */}
        <AnimatePresence>
          {hasItems && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="xl:hidden fixed bottom-20 left-4 right-4 z-50"
            >
              <div className="flex items-stretch gap-2">
                <Button
                  onClick={handleCheckout}
                  className="flex-1 py-4 md:py-6 text-sm md:text-base font-extrabold shadow-2xl flex items-center justify-between px-4 md:px-6 rounded-3xl bg-primary text-primary-foreground"
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="bg-background/20 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs">
                      {cartItems.length}
                    </div>
                    <span>Checkout</span>
                  </div>
                  <span>{APP_SETTINGS.currency} {cartTotal.toLocaleString()} <ArrowRight className="inline-block ml-1 w-4 h-4" /></span>
                </Button>
                
                <button
                  onClick={() => clearCart()}
                  title="Clear Cart"
                  className="w-14 shrink-0 bg-card border border-border shadow-2xl rounded-3xl flex items-center justify-center text-destructive hover:text-primary transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageContainer>
  );
};
