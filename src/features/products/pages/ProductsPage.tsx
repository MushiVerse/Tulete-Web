import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ArrowRight, ChevronRight, ChevronDown, CheckCircle2, 
  MapPin, Star, Plus, Minus, Phone, ShieldCheck, 
  ShoppingBag, Clock, Sparkles, Tag, Trash2, Heart, X
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { PageContainer } from '../../../shared/components/layout';
import { HomeSearchResultsView } from '../../home/components/HomeSearchResultsView';
import { Button } from '../../../shared/components/ui/Button';
import { useCartStore, isLaundryItem, isFoodItem } from '../../cart/store/useCartStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useFavoritesStore } from '../../favorites/hooks/useFavoritesStore';
import { ProductCardSkeleton } from '../../../shared/components/ui/Skeleton';
import { APP_SETTINGS } from '@/core/config/settings';
import { useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { productService, Product } from '../services/productService';
import { useLocationStore } from '../../location/store/useLocationStore';
import { useDynamicPrice, getDeliveryFee } from '../../location/hooks/useDynamicPrice';
import { MobileSearchOverlay } from '../../../shared/components/MobileSearchOverlay';
import { MiniCartRow } from '../../../shared/components/MiniCartRow';
import { searchTuleteItems } from '../../../core/services/algoliaService';
import { getCategoryEmoji } from '../../../shared/utils/categoryEmoji';
import { getNormalizedRating } from '../../../shared/utils/ratingUtils';
import { resolveItemCategory, resolveImageUrl } from '../../../shared/utils/productPayload';
import { isItemFuzzyMatch } from '../../../shared/utils/fuzzyMatch';

const ProductGridItem = ({ product: rawProduct, cartItem, addToCart, updateQuantity, navigate }: any) => {
  const { user } = useAuthStore();
  const { isFavorited, toggleFavorite } = useFavoritesStore();

  if (rawProduct.availability === false || rawProduct.availability === 'false' || rawProduct.available === false || rawProduct.isAvailable === false) {
    return null;
  }

  const { rating: normRating } = getNormalizedRating(rawProduct);
  const product = { ...rawProduct, rating: rawProduct.rating || normRating };

  const itemCat = (product as any)?.cat || product.category || 'Product';
  const magicPrice = useDynamicPrice(product.price, product.storeId, false, product.location, undefined, itemCat);
  const isSoldOut = (product.quantity !== undefined && product.quantity <= 0) || (product.idadi !== undefined && product.idadi <= 0);
  const isFav = isFavorited(product.id);

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const resolvedCat = resolveItemCategory(product);
    const resolvedImg = resolveImageUrl(product);
    toggleFavorite(user?.id || 'guest_user', {
      ...product,
      type: 'product',
      itemId: product.id,
      name: product.name,
      description: product.description || '',
      imageUrl: resolvedImg,
      imgUrl: resolvedImg,
      imgURL: resolvedImg,
      price: product.price,
      rating: product.rating,
      reviewCount: product.reviewCount,
      category: resolvedCat,
      cat: product.cat || resolvedCat,
      subCat: product.subCat || product.subCategory || resolvedCat,
      storeId: product.storeId || product.store || '',
      storeName: product.storeName || product.store || '',
      store: product.store || product.storeName || '',
      isLaundry: isLaundryItem(product),
      isFood: isFoodItem(product),
      washingSelected: product.washingSelected ?? true,
      ironingSelected: product.ironingSelected ?? false,
      packagingSelected: product.packagingSelected ?? false,
      vipSelected: product.vipSelected ?? false,
      deliverySlot: product.deliverySlot || 'ASAP',
    });
  };

  return (
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
          <div className="absolute top-2 left-2 bg-background/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm z-10">
            <Star className="w-3.5 h-3.5 fill-warning stroke-warning" />
            <span className="text-xs font-extrabold">{product.rating}</span>
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
            const stockVal = product.quantity !== undefined ? product.quantity : product.idadi;
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
          <p className="notranslate text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1.5" translate="no">{product.store}</p>
          <h3 className="notranslate font-extrabold text-base text-foreground line-clamp-2 leading-snug mb-1.5 group-hover:text-primary transition-colors" translate="no">{product.name}</h3>
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
                    basePrice: product.price,
                    imageUrl: product.imgUrl,
                    storeId: product.storeId,
                    storeName: product.store,
                    cat: itemCat,
                    location: product.location,
                    idadi: product.quantity !== undefined ? product.quantity : product.idadi,
                    maxQuantity: product.quantity !== undefined ? product.quantity : product.idadi,
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

// --- Static Fallback Data ---
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
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [expandedDepartments, setExpandedDepartments] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileResults, setMobileResults] = useState<any[]>([]);
  const [mobileLoading, setMobileLoading] = useState(false);

  // Sync category and subCategory from URL parameters on page load / URL change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catParam = params.get('category');
    const subCatParam = params.get('subCategory') || params.get('subcat');

    if (subCatParam) {
      setActiveSubCategory(subCatParam);
      setActiveCategory('all');
    } else if (catParam) {
      setActiveCategory(catParam);
      setActiveSubCategory(null);
    }
  }, [location.search]);

  // Pagination state (20 items initially, loads +20 on scroll)
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const toggleDepartmentExpand = (deptName: string) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [deptName]: !prev[deptName]
    }));
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Query ecommerceCategory (main) & ecommerceSubCategory (sub) from Firestore
  const { data: ecommerceCats = [] } = useQuery({
    queryKey: ['ecommerceCategory'],
    queryFn: async () => {
      try {
        const snap = await getDocs(collection(db, 'ecommerceCategory'));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        return [];
      }
    }
  });

  const { data: ecommerceSubCats = [] } = useQuery({
    queryKey: ['ecommerceSubCategory'],
    queryFn: async () => {
      try {
        const snap = await getDocs(collection(db, 'ecommerceSubCategory'));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        return [];
      }
    }
  });

  const hierarchicalDepartments = React.useMemo(() => {
    if (ecommerceCats.length === 0) {
      return PRODUCT_CATEGORIES.map(c => ({
        id: c.id,
        name: c.name,
        icon: getCategoryEmoji(c.name, c.icon),
        subCategories: []
      }));
    }

    return ecommerceCats.map((mainDoc: any) => {
      const mainName = mainDoc.name || mainDoc.category || mainDoc.subCat || mainDoc.id;
      const subItems = ecommerceSubCats.filter((subDoc: any) => {
        const refKey = subDoc.name || subDoc.category || subDoc.mainCategory || subDoc.mainCat;
        return String(refKey).toLowerCase().trim() === String(mainName).toLowerCase().trim();
      });

      return {
        id: mainDoc.id,
        name: mainName,
        icon: getCategoryEmoji(mainName, mainDoc.icon || mainDoc.emoji),
        subCategories: subItems.map((sub: any) => {
          const subName = sub.subCat || sub.subsubCat || sub.subCategory || sub.name || sub.id;
          return {
            id: sub.id,
            name: subName,
            emoji: getCategoryEmoji(subName, '🛍️')
          };
        })
      };
    });
  }, [ecommerceCats, ecommerceSubCats]);

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

  const { data: totalProductsSnap = [] } = useQuery({
    queryKey: ['productsCollectionTotalCount'],
    queryFn: async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        return [];
      }
    }
  });

  // Filter logic
  const { data: productsData, isLoading } = useFirestoreQuery(
    ['products', 'page', activeCategory],
    productService,
    { filters: [{ field: '_collection', operator: '==', value: 'products' }] as any, limit: 100 }
  );

  const rawProducts = productsData?.data || [];
  const totalProductsCount = totalProductsSnap.length > 0 ? totalProductsSnap.length : (rawProducts.length || 0);
  
  const { currentLocation } = useLocationStore();

  const filteredProducts = rawProducts.filter(item => {
    if (item.availability === false || (item as any).availability === 'false' || (item as any).available === false || (item as any).isAvailable === false) return false;

    // Filter by active category / active sub category
    if (activeSubCategory) {
      const itemSub = ((item as any).subCat || (item as any).subCategory || item.category || '').toLowerCase().trim();
      const targetSub = activeSubCategory.toLowerCase().trim();
      if (itemSub !== targetSub && !itemSub.includes(targetSub)) return false;
    } else if (activeCategory && activeCategory !== 'all') {
      const targetCat = activeCategory.toLowerCase().trim();
      const fields = [
        (item as any).subCat,
        (item as any).subcat,
        (item as any).subCategory,
        (item as any).ecommerceSubCategory,
        (item as any).speccat,
        item.category,
        (item as any).mainCategory,
        (item as any).cat,
      ]
        .filter(Boolean)
        .map((v: any) => String(v).toLowerCase().trim());

      const matched = fields.some(f => f === targetCat || f.includes(targetCat) || targetCat.includes(f));
      if (!matched) return false;
    }

    const matchesSearch = isItemFuzzyMatch(searchQuery, item, ['name', 'store', 'brand', 'category', 'description']);
    
    // Filter by delivery fee <= 10000
    const deliveryFee = getDeliveryFee(currentLocation, item.location, item.storeId, false, true);
    const matchesFee = deliveryFee <= 10000;

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
    
    return (b.rating || 0) - (a.rating || 0);
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
  }, [filteredProducts.length, visibleCount]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const { total: cartTotal } = getTotals();
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
      <div className="flex w-full bg-background relative items-stretch lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
        
        {/* ── LEFT SIDEBAR (CATEGORIES) ── */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border px-6 pt-6 pb-28">
          <div className="sticky top-24 space-y-2 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-none pb-4">
            <h2 className="text-xs font-extrabold text-foreground mb-4 uppercase tracking-widest opacity-80">Departments</h2>
            
            {/* All Products button */}
            <button
              onClick={() => { setActiveCategory('all'); setActiveSubCategory(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                activeCategory === 'all' && !activeSubCategory
                  ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="text-xl">🛍️</span>
              All Products
            </button>

            {/* Dynamic main product categories */}
            {hierarchicalDepartments.map((cat) => {
              const isMainActive = activeCategory && cat.name && activeCategory.toLowerCase().trim() === cat.name.toLowerCase().trim();

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
        <div className="flex-auto min-w-0 max-w-full h-auto lg:h-full overflow-visible lg:overflow-y-auto scrollbar-none pt-4 pb-32 xl:pb-28 px-4 lg:px-8 xl:px-10 space-y-4 lg:space-y-5">
          
          {/* Header */}
          <div className="pb-0 mb-1">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Tulete Store
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">Everything you need, delivered straight to you.</p>
          </div>

          {/* Search Row */}
          <div className="sticky top-16 lg:top-0 z-40 !mt-0 flex gap-3 py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 bg-background/85 dark:bg-background/75 backdrop-blur-3xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/80 border-b border-border/30 transition-all">
            <div className="relative flex items-center w-full bg-card/75 dark:bg-card/60 backdrop-blur-xl border border-border/80 rounded-2xl shadow-md transition-all focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary px-3 h-14">
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
            <button
              onClick={() => { setActiveCategory('all'); setActiveSubCategory(null); }}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-extrabold transition-all border ${
                activeCategory === 'all' && !activeSubCategory
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                  : 'bg-card border-border text-muted-foreground'
              }`}
            >
              <span>🛍️</span> All
            </button>
            {hierarchicalDepartments.map((cat) => (
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

          {/* Products Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-500 fill-orange-500" /> Top Rated Products
              </h2>
              <span className="text-sm font-bold text-muted-foreground">
                Showing {Math.min(visibleCount, filteredProducts.length)} of {filteredProducts.length} Items
              </span>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border border-dashed rounded-3xl">
                <p className="text-muted-foreground font-medium">No product near your area yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-stretch">
                <AnimatePresence>
                  {displayedProducts.map((product) => {
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
        <div className="hidden xl:block flex-none w-[320px] shrink-0 border-l border-border px-6 pt-6 pb-28">
          <div className="sticky top-8 space-y-6 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-none pb-4">
            
            {/* CART WIDGET */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Your Cart</h2>
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
                  { value: `${totalProductsCount || 0}+`, label: 'Products', icon: Tag },
                  { value: '4.8★', label: 'Avg Rating', icon: Star },
                  { value: 'Next Day', label: 'Delivery', icon: Clock },
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
