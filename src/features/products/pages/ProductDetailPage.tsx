import { formatPrice } from '../../../shared/utils/formatPrice';
import { getCategoryEmoji } from '../../../shared/utils/categoryEmoji';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Share2, Heart, Star, MapPin, Store as StoreIcon, ShieldCheck, Tag, ChevronRight, ChevronLeft, ArrowRight, Sparkles, Plus, Minus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '../../../shared/components/layout';
import { ImageGallery } from '../../discovery/components/ImageGallery';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { useFirestoreDocument, useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { productService } from '../../products/services/productService';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { SectionWrapper } from '../../dashboard/components/SectionWrapper';
import { useCartStore, isFoodItem, isLaundryItem } from '../../cart/store/useCartStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { useLocationStore } from '../../location/store/useLocationStore';
import { useDynamicPrice } from '../../location/hooks/useDynamicPrice';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';
import { MiniCartRow } from '../../../shared/components/MiniCartRow';
import { CartWidget } from '../../../shared/components/CartWidget';
import { useThemeStore } from '../../../core/theme/useThemeStore';
import { locationService } from '../../location/services/locationService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buildCompleteProductPayload } from '../../../shared/utils/productPayload';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, getCountFromServer, query, where, limit } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { getNormalizedRating, toFirestoreDouble } from '../../../shared/utils/ratingUtils';
import { useFavoritesStore } from '../../favorites/hooks/useFavoritesStore';

/* 2-Row Horizontal Grid Section with 15-Item Pagination for "Related" items */
const Horizontal2RowRelatedSection = ({ title, items }: { title: string; items: any[] }) => {
  const validItems = items.filter((p) => {
    if (!p) return false;
    const isUnavailable = p.availability === false || p.availability === "false" || String(p.availability).toLowerCase() === "false";
    return !isUnavailable;
  });

  const [visibleCount, setVisibleCount] = useState(15);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadNextBatch = () => {
    if (isLoadingMore || visibleCount >= validItems.length) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 15, validItems.length));
      setIsLoadingMore(false);
    }, 300);
  };

  const updateScrollState = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 15);
  };

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const container = containerRef.current;
    if (!container) return;

    updateScrollState();

    const handleScroll = () => {
      updateScrollState();
      if (isLoadingMore || visibleCount >= validItems.length) return;
      const scrollRight = container.scrollWidth - (container.scrollLeft + container.clientWidth);
      if (scrollRight <= 400) {
        loadNextBatch();
      }
    };

    let observer: IntersectionObserver | null = null;
    if (sentinel) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && visibleCount < validItems.length) {
            loadNextBatch();
          }
        },
        { 
          root: container,
          rootMargin: '0px 400px 0px 0px',
          threshold: 0.01 
        }
      );
      observer.observe(sentinel);
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateScrollState, { passive: true });

    return () => {
      if (observer) observer.disconnect();
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [validItems.length, visibleCount, isLoadingMore]);

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -500, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 500, behavior: 'smooth' });
    }
  };

  const visibleItems = validItems.slice(0, visibleCount);

  if (validItems.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-border/40">
      {/* Header with Title, Swipe Hint Badge & Nav Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {title}
          </h2>

          {/* Sleek Pure Informational Pill (Non-Clickable / No Hover State) */}
          {validItems.length > 2 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted/60 border border-border/60 text-muted-foreground text-xs font-medium select-none pointer-events-none cursor-default">
              <span className="text-primary font-extrabold tracking-tighter text-[11px] ml-0.5">{">>>"}</span>
              <span>Swipe right to view more</span>
              
            </div>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs font-bold text-muted-foreground">
            Showing {visibleItems.length} of {validItems.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                canScrollLeft 
                  ? 'bg-muted hover:bg-card border-border text-foreground shadow-xs' 
                  : 'bg-muted/30 border-border/30 text-muted-foreground/40 cursor-not-allowed'
              }`}
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={scrollRight}
              className={`p-2 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                canScrollRight 
                  ? 'bg-primary text-primary-foreground border-primary shadow-md hover:scale-105 active:scale-95' 
                  : 'bg-muted hover:bg-card border-border text-foreground'
              }`}
              title="Scroll Right for More"
            >
              <span className="text-[11px] font-extrabold px-0.5">More</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2-Row Horizontal Scroll Grid Container with Edge Fade Mask */}
      <div className="relative group/scroll">
        {/* Subtle Right Edge Gradient Fade Overlay */}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-background via-background/70 to-transparent z-10 rounded-l-2xl" />
        )}

        {/* Subtle Left Edge Gradient Fade Overlay */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-4 w-16 bg-gradient-to-r from-background via-background/70 to-transparent z-10 rounded-r-2xl" />
        )}

        <div
          ref={containerRef}
          className="flex items-stretch gap-4 overflow-x-auto scrollbar-none pb-4 pt-1 snap-x scroll-smooth"
        >
          {visibleItems.map((prod) => (
            <div key={prod.id} className="w-[220px] sm:w-[250px] shrink-0 snap-start">
              <ProductCard product={prod} />
            </div>
          ))}

          {/* Right Scroll Sentinel / Interactive Load More Card */}
          {visibleCount < validItems.length ? (
            <button
              ref={loadMoreRef as any}
              onClick={scrollRight}
              className="flex flex-col items-center justify-center gap-3 w-40 shrink-0 min-h-[260px] bg-primary/5 hover:bg-primary/10 rounded-2xl border border-dashed border-primary/40 p-4 snap-start transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                {isLoadingMore ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors text-center leading-tight">
                {isLoadingMore ? 'Loading items...' : `Scroll right for more (${validItems.length - visibleCount} left)`}
              </span>
            </button>
          ) : (
            <div ref={loadMoreRef as any} className="w-1 h-full shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
};

const getScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
  if (!node) return window;
  let current: HTMLElement | null = node.parentElement;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return current;
    }
    current = current.parentElement;
  }
  return window;
};

/* Endless Vertical Grid Section for "More of ..." */
const EndlessMoreOfSection = ({ title, items }: { title: string; items: any[] }) => {
  const validItems = items.filter((p) => {
    if (!p) return false;
    const isUnavailable = p.availability === false || p.availability === "false" || String(p.availability).toLowerCase() === "false";
    return !isUnavailable;
  });

  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadNextBatch = () => {
    if (isLoadingMore || visibleCount >= validItems.length) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 20, validItems.length));
      setIsLoadingMore(false);
    }, 400);
  };

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const scrollParent = getScrollParent(sentinel);

    const handleScroll = () => {
      if (isLoadingMore || visibleCount >= validItems.length) return;
      const rect = sentinel.getBoundingClientRect();
      const parentBottom = scrollParent === window 
        ? window.innerHeight 
        : (scrollParent as HTMLElement).getBoundingClientRect().bottom;
      if (rect.top <= parentBottom + 400) {
        loadNextBatch();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < validItems.length) {
          loadNextBatch();
        }
      },
      { 
        root: scrollParent === window ? null : (scrollParent as Element),
        rootMargin: '400px 0px 400px 0px',
        threshold: 0
      }
    );

    observer.observe(sentinel);
    const scrollTarget = scrollParent === window ? window : (scrollParent as HTMLElement);
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', handleScroll);
    };
  }, [validItems.length, visibleCount, isLoadingMore]);

  const visibleItems = validItems.slice(0, visibleCount);

  if (validItems.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-border/40">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {title}
        </h2>
        <span className="text-xs font-bold text-muted-foreground">
          Showing {visibleItems.length} of {validItems.length}
        </span>
      </div>

      {/* Endless Vertical Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {visibleItems.map((prod) => (
          <div key={prod.id} className="w-full">
            <ProductCard product={prod} />
          </div>
        ))}
      </div>

      {/* Scroll Trigger / Circular Loader Sentinel */}
      {visibleCount < validItems.length && (
        <div ref={loadMoreRef} className="py-8 flex flex-col items-center justify-center gap-3 col-span-full">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin shadow-sm" />
          <span className="text-xs font-extrabold text-muted-foreground tracking-wide">
            Loading next items...
          </span>
        </div>
      )}
    </div>
  );
};

const extractSubSubCat = (p: any): string => {
  if (!p) return '';
  const val = p.subSubCat || p.subsubcat || p.subSubCategory || p.speccat || p.specCat || p.subSubCcat;
  return val && typeof val === 'string' ? val.trim() : (typeof val === 'number' ? String(val).trim() : '');
};

const extractSubCat = (p: any): string => {
  if (!p) return '';
  const val = p.subCat || p.subcat || p.subCategory || p.scat || p.foodSubCategory || p.ecommerceSubCategory;
  return val && typeof val === 'string' ? val.trim() : (typeof val === 'number' ? String(val).trim() : '');
};

const PRODUCT_CATEGORIES = [
  { id: 'all', name: 'All Products', icon: '🛍️' },
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'fashion', name: 'Fashion', icon: '👕' },
  { id: 'home', name: 'Home & Living', icon: '🛋️' },
  { id: 'beauty', name: 'Beauty', icon: '💄' },
  { id: 'groceries', name: 'Groceries', icon: '🛒' },
];

export const ProductDetailPage = () => {
  const { isDark } = useThemeStore();
  const { id } = useParams();
  const decodedId = id ? decodeURIComponent(id) : '';
  const navigate = useNavigate();
  const location = useLocation();
  const stateProduct = (location.state as any)?.product || (location.state as any)?.item || (location.state as any)?.storeData;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { items: cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getTotals } = useCartStore();
  
  // Subscribe to location store so price and cart total update instantly on location change
  const { currentLocation } = useLocationStore();
  
  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;
  
  const { user, isAuthenticated } = useAuthStore();
  const { openModal } = useAuthModalStore();

  // Subscribe to favorites store for real-time heart icon state
  const { favorites, isFavorited, toggleFavorite, initialize: initFavorites } = useFavoritesStore();

  // Initialize favorites store when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initFavorites(user.id);
    }
  }, [isAuthenticated, user?.id, initFavorites]);

  // Fetch specific product using decoded ID
  const { data: product, isLoading, error } = useFirestoreDocument(['product', decodedId || id || ''], productService, decodedId || id || '');

  // Determine target collection based on opened item category & location state
  const rawCat = (product as any)?.cat || product?.category || (stateProduct as any)?.cat || (stateProduct as any)?.category || '';
  const rawColl = (product as any)?._collection || (stateProduct as any)?._collection || '';

  let targetCollection = 'foods';
  if (rawColl === 'products' || rawCat === 'Product' || rawCat === 'Products') {
    targetCollection = 'products';
  } else if (rawColl === 'cloths' || rawCat === 'Nguo' || rawCat === 'Laundry' || ['Suits', 'Bag Wash', 'Bedding'].includes(rawCat)) {
    targetCollection = 'cloths';
  } else {
    targetCollection = 'foods';
  }

  const targetSubSubCat = extractSubSubCat(product) || extractSubSubCat(stateProduct);
  const targetSubCat = extractSubCat(product) || extractSubCat(stateProduct);
  const isLaundryProduct = targetCollection === 'cloths';
  const itemCat = (product as any)?.cat || product?.category || (stateProduct as any)?.cat || (stateProduct as any)?.category || '';
  const isLaundry = isLaundryProduct || itemCat === 'Nguo' || itemCat === 'Laundry' || ['Suits', 'Bag Wash', 'Bedding'].includes(itemCat) || isLaundryItem(product) || isLaundryItem(stateProduct);

  const handleRateProduct = async (stars: number) => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }

    const productIdToRate = String(decodedId || id || displayProduct?.id || '').trim();
    if (!productIdToRate || isSubmittingRating) return;

    setIsSubmittingRating(true);
    setUserRating(stars);

    try {
      const docRef = doc(db, targetCollection, productIdToRate);
      const snap = await getDoc(docRef);

      let currentRates: number[] = [];
      if (snap.exists()) {
        const data = snap.data();
        const rawRates = data.rates;
        if (Array.isArray(rawRates)) {
          currentRates = rawRates.map((val: any) => toFirestoreDouble(val)).filter((n) => !isNaN(n));
        } else if (rawRates && typeof rawRates === 'object') {
          currentRates = Object.values(rawRates).map((val: any) => toFirestoreDouble(val)).filter((n) => !isNaN(n));
        }
      }

      const rateAsDouble = toFirestoreDouble(stars);
      const updatedRates = [...currentRates.map((val: any) => toFirestoreDouble(val)), rateAsDouble];
      await setDoc(docRef, { rates: updatedRates }, { merge: true });

      queryClient.invalidateQueries({ queryKey: ['product', productIdToRate] });

      toast.success('Thanks, Rated');
    } catch (err) {
      console.error('Error rating product:', err);
      toast.error('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Candidate pool query: targeted Firestore queries for targetSubSubCat & targetSubCat across field variations + collection batch
  const { data: candidatePool = [] } = useQuery({
    queryKey: ['relatedCandidatePool', targetCollection, targetSubSubCat, targetSubCat],
    queryFn: async () => {
      try {
        const poolMap = new Map<string, any>();
        const addDocsToMap = (snapDocs: any[]) => {
          snapDocs.forEach((d) => {
            if (!poolMap.has(d.id)) {
              const parsed = (productService as any).parse({ id: d.id, _collection: targetCollection, ...d.data() });
              poolMap.set(d.id, parsed);
            }
          });
        };

        const queriesToRun: Promise<any>[] = [];
        const collRef = collection(db, targetCollection);

        if (targetSubSubCat) {
          ['subSubCat', 'subsubcat', 'speccat', 'subSubCategory'].forEach((field) => {
            queriesToRun.push(getDocs(query(collRef, where(field, '==', targetSubSubCat), limit(100))).catch(() => null));
          });
        }

        if (targetSubCat) {
          ['subCat', 'subcat', 'subCategory', 'scat', 'foodSubCategory'].forEach((field) => {
            queriesToRun.push(getDocs(query(collRef, where(field, '==', targetSubCat), limit(100))).catch(() => null));
          });
        }

        queriesToRun.push(getDocs(query(collRef, limit(250))).catch(() => null));

        const snapshots = await Promise.all(queriesToRun);
        snapshots.forEach((snap) => {
          if (snap && snap.docs) {
            addDocsToMap(snap.docs);
          }
        });

        return Array.from(poolMap.values());
      } catch (err) {
        console.error('Error fetching candidate pool:', err);
        return [];
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch ecommerceCategory (name field) & foodSubCategory (subCat field) from Firestore for Departments filter
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

  // Combine and interleave categories from ecommerceCategory.name & foodSubCategory.subCat
  const departmentCategories = React.useMemo(() => {
    const categoriesMap = new Map<string, { id: string; name: string; icon: string; source: string }>();

    // 1. Extract from ecommerceCategory using the "name" field
    ecommerceCats.forEach((doc: any) => {
      const rawName = doc.name || doc.category || doc.title;
      if (rawName && typeof rawName === 'string') {
        const trimmed = rawName.trim();
        if (trimmed) {
          const key = trimmed.toLowerCase();
          if (!categoriesMap.has(key)) {
            categoriesMap.set(key, {
              id: doc.id || `ecom-${key}`,
              name: trimmed,
              icon: getCategoryEmoji(trimmed, doc.icon || doc.emoji || '🛍️'),
              source: 'ecommerce'
            });
          }
        }
      }
    });

    // 2. Extract from foodSubCategory using the "subCat" field (or name fallback)
    foodSubCats.forEach((doc: any) => {
      const rawName = doc.subCat || doc.subcat || doc.name || doc.category;
      if (rawName && typeof rawName === 'string') {
        const trimmed = rawName.trim();
        if (trimmed) {
          const key = trimmed.toLowerCase();
          if (!categoriesMap.has(key)) {
            categoriesMap.set(key, {
              id: doc.id || `foodsub-${key}`,
              name: trimmed,
              icon: getCategoryEmoji(trimmed, doc.icon || doc.emoji || '🍲'),
              source: 'food'
            });
          }
        }
      }
    });

    const combined = Array.from(categoriesMap.values());

    if (combined.length > 0) {
      // Interleave / mix ecommerce and food subcategories together
      const ecomList = combined.filter(c => c.source === 'ecommerce');
      const foodList = combined.filter(c => c.source === 'food');
      const mixed: typeof combined = [];
      const maxLen = Math.max(ecomList.length, foodList.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < ecomList.length) mixed.push(ecomList[i]);
        if (i < foodList.length) mixed.push(foodList[i]);
      }
      return mixed;
    }

    return PRODUCT_CATEGORIES.map(c => ({ ...c, source: 'ecommerce' }));
  }, [ecommerceCats, foodSubCats]);

  // Fetch real combined Products count from Firestore (foods + cloths + products) for Service Stats
  const { data: realProductsCount } = useQuery({
    queryKey: ['serviceStatsCombinedProductsCount'],
    queryFn: async () => {
      try {
        const [foodsSnap, clothsSnap, productsSnap] = await Promise.all([
          getDocs(collection(db, 'foods')),
          getDocs(collection(db, 'cloths')),
          getDocs(collection(db, 'products')),
        ]);
        return foodsSnap.size + clothsSnap.size + productsSnap.size;
      } catch (err) {
        return 0;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const formattedProductsCount = realProductsCount !== undefined && realProductsCount !== null && realProductsCount > 0
    ? `${realProductsCount}+`
    : '0+';

  // Compute display product (or fallback) unconditionally
  const displayProduct = product || stateProduct || {
    id: decodedId || id || 'dummy-1',
    name: decodedId && decodedId.trim().length > 2 ? decodedId : 'Premium Leather Smart Watch - Series 9',
    description: 'Experience the ultimate quality with fast delivery straight to your door.',
    price: 350000,
    oldprice: 420000,
    imgUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80',
    storeId: 's1',
    store: 'Tulete Partner Store',
    rating: 4.8,
    reviewCount: 124,
    category: 'Products',
    tags: ['Super Saving', 'Most TamTam'],
    availability: true,
  };

  const displayItemCat = (displayProduct as any)?.cat || displayProduct.category || 'Product';
  
  // Execute ALL hooks unconditionally BEFORE any early return
  const magicPrice = useDynamicPrice(displayProduct.price || 0, displayProduct.storeId, false, (displayProduct as any).location, undefined, displayItemCat);
  const calcOldPrice = useDynamicPrice(displayProduct.oldprice || 0, displayProduct.storeId, false, (displayProduct as any).location, undefined, displayItemCat);
  const magicOldPrice = displayProduct.oldprice ? calcOldPrice : undefined;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    navigate('/cart');
  };

  const isFavorite = isFavorited(String(displayProduct?.id || decodedId || id || '').trim());

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    if (isLaundry) return;
    toggleFavorite(user?.id || 'guest_user', displayProduct);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex w-full bg-background h-[calc(100vh-4rem)] overflow-hidden relative">
          {/* Left Sidebar Skeleton (Desktop) */}
          <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full px-6 pt-6 pb-28 space-y-6">
            <Skeleton className="h-6 w-20 rounded-xl" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-4 w-28 rounded-lg mb-4" />
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Skeleton key={n} className="h-11 w-full rounded-2xl" />
              ))}
            </div>
          </div>

          {/* Center / Main Column Skeleton */}
          <div className="flex-auto min-w-0 max-w-full h-full overflow-y-auto scrollbar-none pt-6 pb-32 xl:pb-28 px-4 lg:px-8 xl:px-10 space-y-8">
            {/* Top Bar Breadcrumb & Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-44 rounded-md" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            </div>

            {/* Product Grid */}
            <div className="md:px-0 lg:py-2 lg:grid lg:grid-cols-2 lg:gap-12 space-y-6 lg:space-y-0">
              {/* Image Gallery Skeleton */}
              <div className="space-y-4">
                <Skeleton className="w-full aspect-square rounded-3xl border border-border/40 shadow-sm" />
                <div className="flex gap-3">
                  {[1, 2, 3, 4].map((t) => (
                    <Skeleton key={t} className="w-20 h-20 rounded-2xl shrink-0" />
                  ))}
                </div>
              </div>

              {/* Product Info Side Skeleton */}
              <div className="py-2 md:px-0 flex flex-col gap-6">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-8 w-11/12 rounded-xl" />
                  <Skeleton className="h-8 w-2/3 rounded-xl" />
                </div>

                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-24 rounded-lg" />
                  <Skeleton className="h-5 w-32 rounded-lg" />
                </div>

                <div className="flex items-baseline gap-3 pt-2">
                  <Skeleton className="h-10 w-44 rounded-xl" />
                  <Skeleton className="h-6 w-28 rounded-lg" />
                </div>

                <Skeleton className="h-12 w-full md:w-56 rounded-2xl" />

                <div className="w-full h-px bg-border/40 my-1" />

                {/* Store Card Skeleton */}
                <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 rounded-md" />
                      <Skeleton className="h-3.5 w-24 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
                </div>

                {/* Store Location Map Skeleton */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-36 rounded-md" />
                    <Skeleton className="h-4 w-28 rounded-md" />
                  </div>
                  <Skeleton className="h-44 w-full rounded-2xl border border-border" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Extract actual images array from document (only show multiple preview thumbnails if >1 image in document)
  const documentImages: string[] = (() => {
    const docData = (product as any) || {};
    const rawList = docData.images || docData.imgURL || docData.imgUrl || (displayProduct as any).images || (displayProduct as any).imgURL || displayProduct.imgUrl;
    if (Array.isArray(rawList)) {
      const valid = rawList.filter((src: any) => typeof src === 'string' && src.trim().length > 0);
      if (valid.length > 0) return valid;
    } else if (typeof rawList === 'string' && rawList.trim().length > 0) {
      return [rawList.trim()];
    }
    return [displayProduct.imgUrl || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80'];
  })();

  const selectedImageUrl = documentImages[selectedImageIndex] || documentImages[0] || displayProduct.imgUrl;

  return (
    <PageContainer>
      <div className="flex w-full bg-background h-[calc(100vh-4rem)] overflow-hidden relative">
        
        {/* ── LEFT SIDEBAR (CATEGORIES) ── */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="space-y-2">
            <h2 className="text-xs font-extrabold text-foreground mb-4 uppercase tracking-widest opacity-80">Departments</h2>
            {departmentCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  if (cat.source === 'food') {
                    navigate(`/food?category=${encodeURIComponent(cat.name)}`);
                  } else {
                    navigate(`/products?category=${encodeURIComponent(cat.name)}`);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm text-muted-foreground hover:bg-muted hover:text-foreground text-left"
              >
                <span className="text-xl shrink-0">{cat.icon}</span>
                <span className="truncate flex-1">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── CENTER/MAIN COLUMN ── */}
        <div className="flex-auto min-w-0 max-w-full h-full overflow-y-auto scrollbar-none pt-6 pb-32 xl:pb-28 px-4 lg:px-8 xl:px-10 space-y-8">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{displayProduct.category}</span>
              <span>/</span>
              <span className="font-semibold text-foreground truncate max-w-[200px]">{displayProduct.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: displayProduct.name, url: window.location.href });
                  }
                }}
                className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              >
                <Share2 className="w-5 h-5" />
              </button>
              {!isLaundry && (
                <button 
                  onClick={handleToggleFavorite}
                  className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer"
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
                </button>
              )}
            </div>
          </div>

          <div className="md:px-0 lg:py-2 lg:grid lg:grid-cols-2 lg:gap-12">
            {/* Left: Gallery */}
            <div className="w-full">
              <ImageGallery 
                images={documentImages} 
                altPrefix={displayProduct.name} 
                selectedIndex={selectedImageIndex}
                onSelectImage={(idx) => setSelectedImageIndex(idx)}
              />
            </div>

            {/* Right: Details */}
            <div className="py-6 md:px-0 flex flex-col gap-6">
              {/* Title & Price */}
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {displayProduct.tags?.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                      {tag}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-muted-foreground">{displayProduct.category}</Badge>
                </div>
                
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
                  {displayProduct.name}
                </h1>
                
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-sm font-bold">
                    <Star className="w-4 h-4 fill-primary stroke-primary text-primary" />
                    <span className="text-slate-900 dark:text-white font-extrabold">{(displayProduct.rating ?? 0).toFixed(1)}</span>
                    <span className="text-muted-foreground text-xs ml-1">({displayProduct.reviewCount} reviews)</span>
                  </div>

                  {!isLaundryProduct && (
                    <div className="flex items-center gap-1.5 pl-3 border-l border-border">
                      <span className="text-xs font-bold text-muted-foreground">Rate Me Please:</span>
                      <div className="flex items-center gap-0.5" onMouseLeave={() => setHoverRating(0)}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRateProduct(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            disabled={isSubmittingRating}
                            className="p-0.5 rounded hover:scale-125 transition-transform cursor-pointer disabled:opacity-50"
                            title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          >
                            <Star
                              className={`w-4 h-4 transition-colors ${
                                (hoverRating || userRating) >= star
                                  ? 'fill-primary stroke-primary text-primary'
                                  : 'text-muted-foreground/40'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(() => {
                    const qty = typeof (displayProduct as any).quantity === 'number' 
                      ? (displayProduct as any).quantity 
                      : (typeof (displayProduct as any).idadi === 'number' ? (displayProduct as any).idadi : undefined);

                    const isSoldOut = qty !== undefined && qty <= 0;
                    const isUnavailable = displayProduct.availability === false;
                    const isPurchasable = !isSoldOut && !isUnavailable;

                    let statusBadgeText = '';

                    if (isSoldOut) {
                      statusBadgeText = 'Sold Out';
                    } else if (isUnavailable) {
                      statusBadgeText = 'Unavailable';
                    }

                    return (
                      <>
                        {statusBadgeText && (
                          <Badge variant="destructive" className="font-bold">
                            {statusBadgeText}
                          </Badge>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="flex items-end gap-3 mt-4">
                  <span className="text-3xl font-extrabold text-primary">
                    TZS {formatPrice(magicPrice)}
                  </span>
                  {magicOldPrice && magicOldPrice > magicPrice && (
                    <span className="text-lg font-bold text-muted-foreground line-through mb-1">
                      TZS {formatPrice(magicOldPrice)}
                    </span>
                  )}
                </div>

                {(() => {
                  const qty = typeof (displayProduct as any).quantity === 'number' 
                    ? (displayProduct as any).quantity 
                    : (typeof (displayProduct as any).idadi === 'number' ? (displayProduct as any).idadi : undefined);

                  const stockVal = qty;
                  const isSoldOut = qty !== undefined && qty <= 0;
                  const isUnavailable = displayProduct.availability === false;
                  const isPurchasable = !isSoldOut && !isUnavailable;

                  let buttonText = 'Add to Cart';
                  if (isSoldOut) {
                    buttonText = 'Sold Out';
                  } else if (isUnavailable) {
                    buttonText = 'Unavailable';
                  }

                  const cartItem = cartItems.find((i) => i.productId === displayProduct.id || i.baseProductId === displayProduct.id);

                  return (
                    <div className="mt-6 flex flex-col md:flex-row md:items-center gap-4">
                      {stockVal !== undefined && stockVal > 0 && (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-full inline-flex items-center w-fit shrink-0">
                          {stockVal} left in stock
                        </span>
                      )}

                      {cartItem && cartItem.quantity > 0 ? (
                        <div className="flex items-center gap-3 bg-muted p-1.5 rounded-2xl border border-border w-fit">
                          <button
                            onClick={() => {
                              if (cartItem.quantity > 1) {
                                updateQuantity(cartItem.productId, cartItem.quantity - 1);
                              } else {
                                removeFromCart(cartItem.productId);
                              }
                            }}
                            className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center font-extrabold text-foreground hover:bg-primary/10 hover:text-primary active:scale-95 transition-all shadow-sm cursor-pointer"
                            title="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          
                          <span className="font-extrabold text-base min-w-[28px] text-center text-foreground px-1">
                            {cartItem.quantity}
                          </span>

                          <button
                            onClick={() => {
                              if (stockVal !== undefined && cartItem.quantity >= stockVal) {
                                toast.warning(`Limit reached! Maximum available stock for this item is ${stockVal}.`);
                                return;
                              }
                              updateQuantity(cartItem.productId, cartItem.quantity + 1);
                            }}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold transition-all shadow-md cursor-pointer ${
                              stockVal !== undefined && cartItem.quantity >= stockVal
                                ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
                            }`}
                            title={stockVal !== undefined && cartItem.quantity >= stockVal ? "Stock limit reached" : "Increase quantity"}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Button 
                          className="w-full md:w-auto h-12 px-8 text-base font-extrabold shadow-md rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={!isPurchasable}
                          onClick={() => {
                            if (!isPurchasable) return;
                            addToCart({
                              productId: displayProduct.id,
                              name: displayProduct.name,
                              price: displayProduct.price,
                              basePrice: displayProduct.price,
                              imageUrl: selectedImageUrl,
                              storeId: displayProduct.storeId,
                              storeName: displayProduct.store,
                              cat: itemCat,
                              location: displayProduct.location,
                              isLaundry: isLaundryItem(displayProduct),
                              isFood: isFoodItem(displayProduct),
                              idadi: qty,
                              maxQuantity: qty,
                            });
                          }}
                        >
                          {buttonText}
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="w-full h-px bg-border/50" />

              {/* Store Info */}
              {(() => {
                const storeName = displayProduct.store;
                const storeBrand = (displayProduct as any).brand || (displayProduct as any).pbrand || (displayProduct as any).FBrand || (displayProduct as any).LBrand;
                const storeId = displayProduct.storeId || (displayProduct as any).store_id || (displayProduct as any).brandId;

                const isGenericId = !storeId || storeId === 's1' || storeId === 'unknown' || storeId === 'Tulete Duka' || storeId === 'Tulete Dobi';

                const storeTargetId = (!isGenericId && storeId) 
                  ? storeId 
                  : (storeName || storeBrand || storeId || 's1');

                let rawLat = (displayProduct as any)?.location?.lat ?? (displayProduct as any)?.lat ?? (displayProduct as any)?.latitude;
                let rawLng = (displayProduct as any)?.location?.lng ?? (displayProduct as any)?.lng ?? (displayProduct as any)?.longitude;

                if (typeof rawLat === 'string') rawLat = parseFloat(rawLat);
                if (typeof rawLng === 'string') rawLng = parseFloat(rawLng);

                const prodLat = typeof rawLat === 'number' && !isNaN(rawLat) ? rawLat : -6.1630;
                const prodLng = typeof rawLng === 'number' && !isNaN(rawLng) ? rawLng : 35.7516;

                const computedDistance = (() => {
                  if (currentLocation && typeof rawLat === 'number' && typeof rawLng === 'number' && !isNaN(rawLat) && !isNaN(rawLng)) {
                    const dist = locationService.calculateDistance(
                      { lat: currentLocation.lat, lng: currentLocation.lng },
                      { lat: rawLat, lng: rawLng }
                    );
                    return `${dist} km`;
                  }
                  return '2.4 km';
                })();

                const handleVisitStore = () => {
                  const targetId = storeTargetId;
                  const storeData = {
                    id: targetId,
                    store: displayProduct.store || targetId,
                    category: displayProduct.category || 'Food',
                    imgURL: displayProduct.imgUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
                    address: 'Dodoma, Tanzania',
                    location: { lat: prodLat, lng: prodLng },
                    rating: displayProduct.rating || 4.8,
                    reviewCount: displayProduct.reviewCount || 120,
                    availability: true,
                    isVerified: true
                  };
                  navigate(`/store/${encodeURIComponent(targetId)}`, { state: { storeData, fromProduct: displayProduct } });
                };

                return (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <StoreIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="notranslate font-extrabold text-sm" translate="no">{displayProduct.store}</h3>
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-500" /> {computedDistance}</span>
                            <span className="flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3 h-3" /> Verified</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl font-bold cursor-pointer hover:bg-primary hover:text-white transition-all"
                        onClick={handleVisitStore}
                      >
                        Visit Store
                      </Button>
                    </div>

                    {/* Theme-Aware Store Location Map */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-sm flex items-center gap-1.5 text-foreground">
                          <MapPin className="w-4 h-4 text-emerald-500" />
                          Store Location Map
                        </h3>
                        <button
                          onClick={handleVisitStore}
                          className="text-xs font-bold text-primary hover:underline cursor-pointer"
                        >
                          View Store Details
                        </button>
                      </div>

                      <div className="h-44 relative overflow-hidden border border-border bg-card shadow-sm rounded-2xl">
                        <iframe
                          title={`Map - ${displayProduct.store}`}
                          width="100%"
                          height="100%"
                          style={{ 
                            border: 0,
                            filter: isDark ? 'invert(90%) hue-rotate(180deg) contrast(120%)' : 'none'
                          }}
                          loading="lazy"
                          allowFullScreen
                          src={`https://maps.google.com/maps?q=${prodLat},${prodLng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                          className="w-full h-full border-0 rounded-2xl transition-all duration-300"
                        />
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="w-full h-px bg-border/50" />

              {/* Description */}
              <div>
                <h3 className="font-extrabold text-base mb-2">Description</h3>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed whitespace-pre-line">
                  {displayProduct.description}
                </p>
              </div>
            </div>
          </div>

          {/* ── DYNAMIC RELATED PRODUCTS (Exact subSubCat for "Related", Exact subCat for "More of ...") ── */}
          {(() => {
            if (isLaundry) {
              const laundryItems = candidatePool.filter((p) => {
                if (!p || p.id === displayProduct.id) return false;
                const isUnavailable = p.availability === false || p.availability === "false" || String(p.availability).toLowerCase() === "false";
                return !isUnavailable;
              });

              return (
                <div className="mt-8 mb-24 lg:mb-12 space-y-10">
                  <EndlessMoreOfSection title="Laundries" items={laundryItems} />
                </div>
              );
            }

            const currentSubSubClean = targetSubSubCat.trim().toLowerCase();
            const currentSubCatClean = targetSubCat.trim().toLowerCase();

            // 1. Related section: STRICT EXACT MATCH on subSubCat from candidatePool
            const finalSubSubList = currentSubSubClean
              ? candidatePool.filter((p) => {
                  if (!p || p.id === displayProduct.id) return false;
                  const isUnavailable = p.availability === false || p.availability === "false" || String(p.availability).toLowerCase() === "false";
                  if (isUnavailable) return false;
                  const itemSubSub = extractSubSubCat(p).trim().toLowerCase();
                  return itemSubSub === currentSubSubClean;
                })
              : [];

            const relatedIds = new Set(finalSubSubList.map((p) => p.id));

            // 2. More of [subCat] section: STRICT EXACT MATCH on subCat from candidatePool (excluding relatedIds)
            const finalSubCatList = currentSubCatClean
              ? candidatePool.filter((p) => {
                  if (!p || p.id === displayProduct.id || relatedIds.has(p.id)) return false;
                  const isUnavailable = p.availability === false || p.availability === "false" || String(p.availability).toLowerCase() === "false";
                  if (isUnavailable) return false;
                  const itemSub = extractSubCat(p).trim().toLowerCase();
                  return itemSub === currentSubCatClean;
                })
              : [];

            const sectionTitle = targetSubCat 
              ? `More of ${targetSubCat}` 
              : `More of ${displayProduct.category || (targetCollection === 'products' ? 'Products' : 'Foods')}`;

            if (finalSubSubList.length === 0 && finalSubCatList.length === 0) {
              return null;
            }

            return (
              <div className="mt-8 mb-24 lg:mb-12 space-y-10">
                {/* i. Related Section (Horizontal Scroll, exact subSubCat matches ONLY) */}
                {finalSubSubList.length > 0 && (
                  <Horizontal2RowRelatedSection title="Related" items={finalSubSubList} />
                )}

                {/* ii. More of [subCat] Section (Endless Vertical Grid, exact subCat matches ONLY) */}
                {finalSubCatList.length > 0 && (
                  <EndlessMoreOfSection title={sectionTitle} items={finalSubCatList} />
                )}
              </div>
            );
          })()}
        </div>

        {/* ── RIGHT SIDEBAR (LIVE CART) ── */}
        <div className="hidden xl:block flex-none w-[320px] shrink-0 border-l border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-6">
            
            {/* CART WIDGET */}
            <CartWidget onCheckout={handleCheckout} />
            
            {/* SERVICE STATS BAND */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider text-foreground">Service Stats</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { value: formattedProductsCount, label: 'Products', icon: Tag },
                  { value: '4.8★', label: 'Avg Rating', icon: Star },
                  { value: 'Verified', label: 'Merchants', icon: ShieldCheck },
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
