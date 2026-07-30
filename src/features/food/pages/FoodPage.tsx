import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ArrowRight, ChevronRight, ChevronDown, CheckCircle2, 
  MapPin, Star, Plus, Minus, Trash2, ShieldCheck, 
  ShoppingBag, Flame, Clock, Navigation, Phone, Heart
} from 'lucide-react';
import { useFavoritesStore } from '../../favorites/hooks/useFavoritesStore';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { PageContainer } from '../../../shared/components/layout';
import { HomeSearchResultsView } from '../../home/components/HomeSearchResultsView';
import { Button } from '../../../shared/components/ui/Button';
import { useCartStore } from '../../cart/store/useCartStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { ProductCardSkeleton } from '../../../shared/components/ui/Skeleton';
import { useLocationStore } from '../../location/store/useLocationStore';
import { APP_SETTINGS } from '@/core/config/settings';
import { useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { productService, Product } from '../../products/services/productService';
import { useDynamicPrice, getDeliveryFee } from '../../location/hooks/useDynamicPrice';
import { MiniCartRow } from '../../../shared/components/MiniCartRow';
import { getCategoryEmoji } from '../../../shared/utils/categoryEmoji';
import { FacebookIcon, InstagramIcon, TikTokIcon, YoutubeIcon } from '../../../shared/components/SocialIcons';

// --- Static Fallback Data ---
const FOOD_CATEGORIES = [
  { id: 'all', name: 'All Food', icon: '🍽️' },
  { id: 'fast_food', name: 'Fast Food', icon: '🍔' },
  { id: 'healthy', name: 'Healthy', icon: '🥗' },
  { id: 'local', name: 'Swahili Dishes', icon: '🥘' },
  { id: 'drinks', name: 'Beverages', icon: '🥤' },
  { id: 'desserts', name: 'Desserts', icon: '🍰' },
];

const PROMOS = [
  {
    id: 1,
    title: 'Free Delivery',
    subtitle: 'On your first 3 food orders',
    badge: 'NEW USER',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'Pizza Night',
    subtitle: 'Buy 1 Get 1 Free on Large Pizzas',
    badge: 'TRENDING',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 3,
    title: 'Nyama Choma Special',
    subtitle: 'Fresh grilled, delivered hot to your door',
    badge: 'LOCAL FAVE',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 4,
    title: 'Smoothie Bowl',
    subtitle: 'Healthy meals from TZS 800',
    badge: 'HEALTHY',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=800&auto=format&fit=crop',
  }
];



const MealCard = ({ meal, cartItem, updateQuantity, addToCart }: any) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isFavorited, toggleFavorite } = useFavoritesStore();
  
  if (meal.availability === false || meal.availability === 'false' || meal.available === false || meal.isAvailable === false) {
    return null;
  }
  
  const mealCat = (meal as any)?.cat || meal.category || 'Food';
  const dynamicPrice = useDynamicPrice(meal.price, meal.storeId, mealCat === 'Nguo', meal.location, undefined, mealCat);
  const isSoldOut = (meal.quantity !== undefined && meal.quantity <= 0) || (meal.idadi !== undefined && meal.idadi <= 0);
  const isFav = isFavorited(meal.id);

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFavorite(user?.id || 'guest_user', {
      type: 'product',
      itemId: meal.id,
      name: meal.name,
      description: meal.description || '',
      imageUrl: meal.imgUrl || '',
      price: meal.price,
      rating: meal.rating,
      reviewCount: meal.reviewCount,
      category: mealCat,
      cat: mealCat,
      store: meal.store || '',
      location: meal.location || '',
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => navigate(`/product/${encodeURIComponent(meal.id)}`)}
      className="h-full rounded-3xl border p-3 sm:p-4 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all group bg-card border-border cursor-pointer"
    >
      <div className="w-full aspect-[4/3] shrink-0 rounded-2xl overflow-hidden relative bg-muted">
        <img src={meal.imgUrl} alt={meal.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm z-10">
          <Star className="w-3.5 h-3.5 fill-warning stroke-warning" />
          <span className="text-xs font-extrabold">{meal.rating}</span>
        </div>

        {/* Favorite Button (Bottom Left of Item Image) */}
        <button 
          onClick={handleToggleFav}
          className="absolute bottom-2 left-2 z-20 w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center shadow-md hover:bg-black/60 hover:scale-110 active:scale-95 transition-all group/fav"
          title={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`w-3.5 h-3.5 transition-all duration-200 ${isFav ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white group-hover/fav:text-rose-400'}`} />
        </button>
        {/* Floating quantity left badge in top right corner of image */}
        {(() => {
          const stockVal = meal.quantity !== undefined ? meal.quantity : meal.idadi;
          if (stockVal !== undefined && stockVal > 0 && !isSoldOut) {
            return (
              <div className="absolute top-2 right-2 bg-background/90 backdrop-blur text-foreground border border-border/50 font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-sm z-10">
                {stockVal} left
              </div>
            );
          }
          return null;
        })()}
        {isSoldOut && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-20">
            <span className="text-foreground font-extrabold text-xs bg-background px-4 py-2 rounded-full shadow-lg">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1">
        <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1.5">{meal.store}</p>
        <h3 className="font-extrabold text-base text-foreground line-clamp-2 leading-snug mb-1.5 group-hover:text-primary transition-colors">{meal.name}</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 font-medium">
          <Clock className="w-3.5 h-3.5" /> 20-30 min
        </div>
        
        <div className="flex items-end justify-between gap-2 mt-auto pt-4 border-t border-border">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">Est. Total</span>
            <span className="text-xl font-extrabold text-foreground">{APP_SETTINGS.currency} {formatPrice(dynamicPrice)}</span>
          </div>
          
          {cartItem ? (
            <div 
              className="flex items-center gap-1.5 sm:gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 bg-muted px-1.5 sm:px-2 py-1 rounded-xl">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQuantity(meal.id, cartItem.quantity - 1);
                  }} 
                  className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-md bg-background text-foreground shadow-sm"
                >
                  <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
                <span className="font-extrabold text-xs sm:text-sm min-w-[1rem] text-center">{cartItem.quantity}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const stockLimit = meal.quantity !== undefined ? meal.quantity : meal.idadi;
                    if (stockLimit !== undefined && cartItem.quantity >= stockLimit) {
                      alert(`Cannot add more. Only ${stockLimit} items available in stock.`);
                      return;
                    }
                    updateQuantity(meal.id, cartItem.quantity + 1);
                  }} 
                  className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm"
                >
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              </div>
            </div>
          ) : (
            <button
              disabled={isSoldOut}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart({
                  productId: meal.id,
                  name: meal.name,
                  price: meal.price,
                  basePrice: meal.price,
                  imageUrl: meal.imgUrl,
                  storeId: meal.storeId,
                  storeName: meal.store,
                  brand: (meal as any).brand || (meal as any).pbrand || meal.storeId || '',
                  cat: mealCat,
                  location: meal.location,
                  idadi: meal.quantity !== undefined ? meal.quantity : meal.idadi,
                  maxQuantity: meal.quantity !== undefined ? meal.quantity : meal.idadi,
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
  );
};


export const FoodPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Pagination state (20 items initially, loads +20 on scroll)
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const toggleCategoryExpand = (catName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Query foodCategory, foodSubCategory, and foodSubSubCategory from Firestore
  const { data: foodCats = [] } = useQuery({
    queryKey: ['foodCategory'],
    queryFn: async () => {
      try {
        const snap = await getDocs(collection(db, 'foodCategory'));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        return [];
      }
    }
  });

  const { data: foodSubCats = [] } = useQuery({
    queryKey: ['foodSubCategory'],
    queryFn: async () => {
      try {
        const snap = await getDocs(collection(db, 'foodSubCategory'));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        return [];
      }
    }
  });

  const { data: foodSubSubCats = [] } = useQuery({
    queryKey: ['foodSubSubCategory'],
    queryFn: async () => {
      try {
        const snap = await getDocs(collection(db, 'foodSubSubCategory'));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        return [];
      }
    }
  });

  const hierarchicalFoodCategories = React.useMemo(() => {
    const categoryMap = new Map<string, { id: string; name: string; icon: string; subCategoriesMap: Map<string, { id: string; name: string; emoji: string }> }>();

    // 1. Process foodCategory documents
    foodCats.forEach((doc: any) => {
      const rawName = doc.name || doc.category || doc.title;
      if (!rawName || typeof rawName !== 'string') return;
      const catName = rawName.trim();
      if (!catName) return;
      const normKey = catName.toLowerCase();

      if (!categoryMap.has(normKey)) {
        categoryMap.set(normKey, {
          id: doc.id || normKey,
          name: catName,
          icon: getCategoryEmoji(catName, doc.icon || doc.emoji),
          subCategoriesMap: new Map(),
        });
      }
    });

    // 2. Process foodSubCategory documents using the "name" field
    foodSubCats.forEach((doc: any) => {
      const rawName = doc.name || doc.subCat || doc.category;
      if (!rawName || typeof rawName !== 'string') return;
      const catName = rawName.trim();
      if (!catName) return;
      const normKey = catName.toLowerCase();

      if (!categoryMap.has(normKey)) {
        categoryMap.set(normKey, {
          id: doc.id || normKey,
          name: catName,
          icon: getCategoryEmoji(catName, doc.icon || doc.emoji),
          subCategoriesMap: new Map(),
        });
      }
    });

    // 3. Attach subcategories from foodSubSubCategory if matched
    foodSubSubCats.forEach((sub: any) => {
      const refKey = String(sub.name || sub.category || sub.subCat || sub.mainCategory || sub.mainCat || '').toLowerCase().trim();
      if (refKey && categoryMap.has(refKey)) {
        const catEntry = categoryMap.get(refKey)!;
        const rawSubName = sub.subSubCat || sub.subCat || sub.subCategory || sub.name || sub.id;
        if (rawSubName && typeof rawSubName === 'string') {
          const subName = rawSubName.trim();
          const subNormKey = subName.toLowerCase();
          if (!catEntry.subCategoriesMap.has(subNormKey)) {
            catEntry.subCategoriesMap.set(subNormKey, {
              id: sub.id,
              name: subName,
              emoji: getCategoryEmoji(subName, '🍲')
            });
          }
        }
      }
    });

    // Fallback if no category documents were retrieved
    if (categoryMap.size === 0) {
      return FOOD_CATEGORIES.map(c => ({
        id: c.id,
        name: c.name,
        icon: getCategoryEmoji(c.name, c.icon),
        subCategories: []
      }));
    }

    return Array.from(categoryMap.values()).map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      subCategories: Array.from(cat.subCategoriesMap.values())
    }));
  }, [foodCats, foodSubCats, foodSubSubCats]);
  
  // Cart & Auth
  const { items: cartItems, addToCart, removeFromCart, clearCart, updateQuantity, getTotals } = useCartStore();
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
  const { data: foodsData, isLoading } = useFirestoreQuery(
    ['foods', 'page', activeCategory],
    productService,
    { filters: [{ field: '_collection', operator: '==', value: 'foods' }] as any, limit: 100 }
  );

  const rawMeals = foodsData?.data || [];

  const { currentLocation } = useLocationStore();

  const filteredMeals = rawMeals.filter(meal => {
    if (meal.availability === false || (meal as any).availability === 'false' || (meal as any).available === false || (meal as any).isAvailable === false) return false;

    // Filter by active category / active sub category
    if (activeSubCategory) {
      const mealSub = ((meal as any).subsubCat || (meal as any).subCat || (meal as any).subCategory || meal.category || '').toLowerCase().trim();
      const targetSub = activeSubCategory.toLowerCase().trim();
      if (mealSub !== targetSub && !mealSub.includes(targetSub)) return false;
    } else if (activeCategory && activeCategory !== 'all') {
      const mealCat = (meal.category || (meal as any).subCat || (meal as any).mainCategory || (meal as any).cat || '').toLowerCase().trim();
      const targetCat = activeCategory.toLowerCase().trim();
      if (mealCat !== targetCat && !mealCat.includes(targetCat) && !targetCat.includes(mealCat)) return false;
    }

    const matchesSearch = meal.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          meal.store.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by delivery fee <= 1600
    const deliveryFee = getDeliveryFee(currentLocation, meal.location, meal.storeId, false, true);
    const matchesFee = deliveryFee <= 1600;

    return matchesSearch && matchesFee;
  }).sort((a, b) => {
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
    
  });

  // Reset pagination when category or search query changes
  useEffect(() => {
    setVisibleCount(20);
  }, [activeCategory, activeSubCategory, searchQuery]);

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
  }, [filteredMeals.length, visibleCount]);

  const displayedMeals = filteredMeals.slice(0, visibleCount);
  const hasMore = visibleCount < filteredMeals.length;

  const { deliveryFee: globalDeliveryFee, total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    navigate('/cart');
  };

  return (
    <PageContainer className="flex-1 flex flex-col min-h-0">
      <div className="flex w-full bg-background relative items-start lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
        
        {/* ── LEFT SIDEBAR (CATEGORIES) ── */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-2">
            <h2 className="text-xs font-extrabold text-foreground mb-4 uppercase tracking-widest opacity-80">Food Categories</h2>
            
            {/* All Food button */}
            <button
              onClick={() => { setActiveCategory('all'); setActiveSubCategory(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                activeCategory === 'all' && !activeSubCategory
                  ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="text-xl">🍽️</span>
              All Food
            </button>

            {/* Dynamic main food categories */}
            {hierarchicalFoodCategories.map((cat) => {
              const isMainActive = activeCategory === cat.name;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(isMainActive ? 'all' : cat.name);
                    setActiveSubCategory(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm cursor-pointer ${
                    isMainActive
                      ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="flex-1 truncate text-left">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CENTER/MAIN COLUMN ── */}
        <div className="flex-auto min-w-0 max-w-full h-auto lg:h-full overflow-visible lg:overflow-y-auto scrollbar-none pt-6 pb-32 xl:pb-28 px-4 lg:px-8 xl:px-10 space-y-8">
          
          {/* Header & Search */}
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight mb-2">
              Craving something? 🍕
            </h1>
            <p className="text-sm text-muted-foreground mb-6">Discover the best food and drinks near you.</p>
            
            <div className="relative flex items-center w-full bg-card border border-border rounded-2xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary px-3 h-14">
              <Search className="w-5 h-5 text-muted-foreground shrink-0 ml-2 cursor-pointer hover:text-primary transition-colors" />
              <div className="flex items-center gap-1.5 ml-3 px-3 py-1.5 bg-primary/10 text-primary text-xs font-extrabold rounded-full shrink-0">
                Food
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for meals, restaurants, or cuisines..."
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
              <HomeSearchResultsView query={debouncedSearchQuery} filterValue="food" />
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
            <button
              onClick={() => { setActiveCategory('all'); setActiveSubCategory(null); }}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-extrabold transition-all border ${
                activeCategory === 'all' && !activeSubCategory
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                  : 'bg-card border-border text-muted-foreground'
              }`}
            >
              <span>🍽️</span> All
            </button>
            {hierarchicalFoodCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(activeCategory === cat.name ? 'all' : cat.name);
                  setActiveSubCategory(null);
                }}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-extrabold transition-all border ${
                  activeCategory === cat.name 
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                    : 'bg-card border-border text-muted-foreground'
                }`}
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>

          {/* Meals Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-500 fill-orange-500" /> Top Rated Meals
              </h2>
              <span className="text-sm font-bold text-muted-foreground">
                Showing {Math.min(visibleCount, filteredMeals.length)} of {filteredMeals.length} Items
              </span>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-stretch">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredMeals.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border border-dashed rounded-3xl">
                <p className="text-muted-foreground font-medium">No meal near your area yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-stretch">
                <AnimatePresence>
                  {displayedMeals.map((meal) => {
                    const cartItem = cartItems.find(i => i.productId === meal.id);
                    return (
                      <MealCard key={meal.id} meal={meal} cartItem={cartItem} updateQuantity={updateQuantity} addToCart={addToCart} />
                    );
                  })}
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
          </>
          )}
        </div>

        {/* ── RIGHT SIDEBAR (WIDGETS & CART) ── */}
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

            {/* TRUST STATS BAND */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider text-foreground">Service Stats</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { value: '100+', label: 'Local Kitchens', icon: ShoppingBag, onClick: undefined },
                  { value: '4.8★', label: 'Avg Rating', icon: Star, onClick: undefined },
                  { value: '30min', label: 'Fast Delivery', icon: Clock, onClick: undefined },
                  { 
                    value: '24/7', 
                    label: 'WhatsApp Support', 
                    icon: Phone, 
                    onClick: () => window.open('https://wa.me/255764587748?text=Hello%20Tulete%20Support', '_blank') 
                  },
                ].map(({ value, label, icon: Icon, onClick }) => (
                  <div 
                    key={label} 
                    onClick={onClick}
                    className={`flex items-center gap-3 ${onClick ? 'cursor-pointer hover:bg-muted/50 p-2 rounded-2xl transition-colors' : ''}`}
                  >
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

            {/* HELP & POLICIES WIDGET */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground mb-3">Help & Safety</h2>
              <button
                onClick={() => navigate('/help')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors text-xs font-bold text-foreground text-left"
              >
                <span>❓ Help Center</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => navigate('/safety')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors text-xs font-bold text-foreground text-left"
              >
                <span>🛡️ Safety Info</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => navigate('/cancellation')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors text-xs font-bold text-foreground text-left"
              >
                <span>❌ Cancellation Policy</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => window.open('https://wa.me/255764587748?text=Hello%20Tulete%20Support', '_blank')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-extrabold text-left"
              >
                <span>💬 WhatsApp Support (+255764587748)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* SOCIAL MEDIA WIDGET WITH ICONS */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground mb-2">Follow Us</h2>
              <div className="flex items-center justify-between gap-2">
                {[
                  { name: 'Instagram', url: APP_SETTINGS.socialLinks.instagram, Icon: InstagramIcon, color: 'hover:bg-pink-600 hover:text-white' },
                  { name: 'TikTok', url: APP_SETTINGS.socialLinks.tiktok, Icon: TikTokIcon, color: 'hover:bg-foreground hover:text-background' },
                  { name: 'YouTube', url: APP_SETTINGS.socialLinks.youtube, Icon: YoutubeIcon, color: 'hover:bg-red-600 hover:text-white' },
                  { name: 'Facebook', url: APP_SETTINGS.socialLinks.facebook, Icon: FacebookIcon, color: 'hover:bg-blue-600 hover:text-white' },
                ].map(({ name, url, Icon, color }) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={name}
                    aria-label={name}
                    className={`w-11 h-11 rounded-2xl bg-muted/50 border border-border flex items-center justify-center text-foreground transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm ${color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
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
