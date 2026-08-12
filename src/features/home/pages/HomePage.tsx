import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../../shared/components/layout';
import { Button } from '../../../shared/components/ui/Button';
import { 
  Search, MapPin, Star, Heart, Flame, 
  Utensils, Store as StoreIcon, Tag, ArrowRight, 
  Sparkles, Bell, CheckCircle2, Clock, ShoppingBag, ChevronRight, LayoutGrid, Trash2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { storeService, Store } from '../../stores/services/storeService';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useLocationStore } from '../../location/store/useLocationStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { useCartStore, isLaundryItem, isFoodItem } from '../../cart/store/useCartStore';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { locationService } from '../../location/services/locationService';
import { APP_SETTINGS } from '@/core/config/settings';
import { HorizontalCarousel } from '../../../shared/components/ui/HorizontalCarousel';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { productService, Product } from '../../products/services/productService';
import { buildCompleteProductPayload, resolveImageUrl } from '../../../shared/utils/productPayload';
import { getNormalizedRating } from '../../../shared/utils/ratingUtils';
import { useFavoritesStore } from '../../favorites/hooks/useFavoritesStore';
import { BrandsView } from '../../brands/components/BrandsView';
import { StoreCard } from '../../../shared/components/cards/StoreCard';
import { BrandDetailsView } from '../../brands/components/BrandDetailsView';
import { Skeleton, ProductCardSkeleton, StoreCardSkeleton } from '../../../shared/components/ui/Skeleton';
import { useLanguageStore } from '../../../core/i18n/useLanguageStore';
import { HomeSearchResultsView } from '../components/HomeSearchResultsView';
import { MobileSearchOverlay } from '../../../shared/components/MobileSearchOverlay';
import { MiniCartRow } from '../../../shared/components/MiniCartRow';
import { CartWidget } from '../../../shared/components/CartWidget';
import { searchTuleteItems } from '../../../core/services/algoliaService';
import { getDeliveryFee, getItemPriceWithDelivery } from '../../location/hooks/useDynamicPrice';
import { useNotificationsRealtime } from '../../notifications/hooks/useNotificationsRealtime';
import { HelpSafetyWidget } from '@/shared/components/HelpSafetyWidget';
import { SocialLinksWidget } from '@/shared/components/SocialLinksWidget';
import { PlatformStatsWidget } from '@/shared/components/PlatformStatsWidget';


/*  Shared Configs  */
const CAT_CONFIG: Record<string, { emoji: string; color: string; bg: string; activeBg: string }> = {
  Food:       { emoji: '🍔', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20', activeBg: 'bg-orange-500 text-white border-orange-500' },
  Laundry:    { emoji: '👔', color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/20', activeBg: 'bg-sky-500 text-white border-sky-500' },
  Products:   { emoji: '🛍️', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', activeBg: 'bg-emerald-500 text-white border-emerald-500' },
  Electrical: { emoji: '⚡', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', activeBg: 'bg-amber-500 text-white border-amber-500' },
  Beauty:     { emoji: '💅', color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20', activeBg: 'bg-pink-500 text-white border-pink-500' },
  Rides:      { emoji: '🚗', color: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/20', activeBg: 'bg-indigo-500 text-white border-indigo-500' },
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
    gradient: 'from-sky-700/90 via-sky-600/80 to-blue-800/90 text-white',
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
    gradient: 'from-sky-700/90 via-blue-600/80 to-sky-900/90 text-white',
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
    gradient: 'from-sky-700/90 via-indigo-600/80 to-sky-900/90 text-white',
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
    gradient: 'from-sky-700/90 via-sky-600/80 to-blue-900/90 text-white',
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
    gradient: 'from-sky-700/90 via-blue-600/80 to-sky-900/90 text-white',
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
    gradient: 'from-sky-700/90 via-indigo-600/80 to-sky-900/90 text-white',
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
    gradient: 'from-orange-600/90 via-amber-500/80 to-red-700/90 text-white',
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
    gradient: 'from-orange-600/90 via-orange-500/80 to-amber-700/90 text-white',
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
    gradient: 'from-amber-600/90 via-orange-500/80 to-red-700/90 text-white',
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
    gradient: 'from-emerald-600/90 via-teal-500/80 to-emerald-700/90 text-white',
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
    gradient: 'from-orange-600/90 via-amber-500/80 to-red-700/90 text-white',
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
    gradient: 'from-pink-600/90 via-purple-500/80 to-pink-700/90 text-white',
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
    gradient: 'from-emerald-600/90 via-teal-500/80 to-emerald-800/90 text-white',
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
    gradient: 'from-amber-600/90 via-yellow-500/80 to-amber-700/90 text-white',
    category: 'product'
  },
  {
    id: 301,
    badge: ' Beauty Bar',
    title: 'Top Beauty & Cosmetics',
    subtitle: 'Skincare, makeup, and hair essentials',
    image: 'https://static.vecteezy.com/system/resources/thumbnails/033/332/622/small_2x/flat-lay-of-skincare-and-makeup-products-beauty-and-selfcare-concept-with-copy-space-photo.jpg',
    cta: 'Shop Beauty',
    href: '/products',
    gradient: 'from-pink-600/90 via-rose-500/80 to-pink-700/90 text-white',
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
    gradient: 'from-indigo-600/90 via-blue-500/80 to-indigo-700/90 text-white',
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
    gradient: 'from-teal-600/90 via-emerald-500/80 to-teal-700/90 text-white',
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
    gradient: 'from-purple-600/90 via-violet-500/80 to-purple-700/90 text-white',
    category: 'product'
  }
];

const parseStoreCoords = (s: any): { lat: number; lng: number } | null => {
  if (!s) return null;

  const strLoc = typeof s.location === 'string' ? s.location : (typeof s.loc === 'string' ? s.loc : undefined);
  if (strLoc) {
    const parts = strLoc.split(',');
    if (parts.length >= 2) {
      const pLat = parseFloat(parts[0].trim());
      const pLng = parseFloat(parts[1].trim());
      if (!isNaN(pLat) && !isNaN(pLng)) return { lat: pLat, lng: pLng };
    }
  }

  let pLat = s.location?.lat ?? s.location?.latitude ?? s.lat ?? s.latitude;
  let pLng = s.location?.lng ?? s.location?.longitude ?? s.lng ?? s.longitude;

  if (typeof pLat === 'string') pLat = parseFloat(pLat);
  if (typeof pLng === 'string') pLng = parseFloat(pLng);

  if (typeof pLat === 'number' && typeof pLng === 'number' && !isNaN(pLat) && !isNaN(pLng)) {
    return { lat: pLat, lng: pLng };
  }

  return null;
};

/*  Store Card  */
const FeaturedStoreCard = ({ store, onClick, isFav, onFav }: {
  store: Store & { distance?: number };
  onClick: () => void;
  isFav: boolean;
  onFav: (e: React.MouseEvent) => void;
}) => {
  const storeData = {
    ...store,
    category: (store as any).cat || store.category || 'Store',
    rating: typeof store.rating === 'number' ? store.rating : parseFloat(store.rating || '4.8'),
  };

  return (
    <div onClick={onClick} className="w-full h-full cursor-pointer">
      <StoreCard store={storeData as any} distanceKm={store.distance !== undefined && store.distance !== 99.9 ? store.distance : undefined} />
    </div>
  );
};

/* ── 10-Hour Seed & Seeded Shuffle Helpers ── */
const get10HourSeed = (): number => {
  try {
    const TEN_HOURS_MS = 10 * 60 * 60 * 1000;
    const storedSeed = localStorage.getItem('tulete_home_seed');
    const storedTime = localStorage.getItem('tulete_home_seed_time');
    const now = Date.now();

    if (storedSeed && storedTime && (now - Number(storedTime) < TEN_HOURS_MS)) {
      return Number(storedSeed);
    }
    const newSeed = Math.floor(Math.random() * 1000000) + 1;
    localStorage.setItem('tulete_home_seed', String(newSeed));
    localStorage.setItem('tulete_home_seed_time', String(now));
    return newSeed;
  } catch (e) {
    return Math.floor(Date.now() / (10 * 60 * 60 * 1000));
  }
};

const seededRandom = (seed: number) => {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleWithSeed = <T,>(array: T[], seed: number): T[] => {
  const shuffled = [...array];
  const rand = seededRandom(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/*  Main HomePage  */
export const HomePage = () => {
  const navigate = useNavigate();
  const t = useLanguageStore((state) => state.t);
  const { user, isAuthenticated } = useAuthStore();
  const { openModal } = useAuthModalStore();
  const { items: cartItems, getTotals, clearCart, addToCart, removeFromCart } = useCartStore();
  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;
  const { currentLocation } = useLocationStore();
  const { unreadCount } = useNotificationsRealtime();

  // 10-Hour Seed for data-level item randomization across all categories
  const homeSeed = useMemo(() => get10HourSeed(), []);

  // Limit state for "Stores near me" section (initial 20, opens next 20)
  const [storeLimit, setStoreLimit] = useState(20);

  // ── Firestore Subscriptions for userViewed & userfavorites ──
  const [userViewedItems, setUserViewedItems] = useState<Product[]>([]);
  const [userFavoritesItems, setUserFavoritesItems] = useState<Product[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setUserViewedItems([]);
      return;
    }
    try {
      const ref = collection(db, 'userViewed', user.id, 'recentlyViewed');
      const unsubscribe = onSnapshot(ref, (snap) => {
        const list: Product[] = [];
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: data.foodId || data.id || docSnap.id,
            name: data.name || data.nam1 || 'Viewed Item',
            price: Number(data.price || data.price1 || 0),
            oldprice: data.oldprice ? Number(data.oldprice) : undefined,
            imgUrl: resolveImageUrl(data),
            storeId: data.storeId || data.store || data.brand || '',
            store: data.store || data.brand || 'Tulete Store',
            rating: Number(data.rating || 4.8),
            reviewCount: Number(data.reviewCount || 1),
            category: data.category || data.cate || data.cat || 'Product',
            cat: data.cat || data.specCat || data.category || 'Product',
            location: data.location || data.productloc || '',
            description: data.description || data.desc || '',
            availability: data.availability !== false,
            subCat: data.subCat || data.subCategory || data.speccat || '',
            time: data.time || data.updatedAt || data.createdAt || '',
            tags: [],
          } as any);
        });

        // Requirement 2: Sort "What interested you lately" in descending order using "time"
        list.sort((a: any, b: any) => {
          const timeA = a.time ? new Date(a.time).getTime() : 0;
          const timeB = b.time ? new Date(b.time).getTime() : 0;
          return timeB - timeA;
        });

        setUserViewedItems(list);
      }, (err) => {
        console.warn('Error fetching userViewed items:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('userViewed listener failed:', e);
    }
  }, [user?.id, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setUserFavoritesItems([]);
      return;
    }
    try {
      const ref = collection(db, 'userfavorites', user.id, 'favorites');
      const unsubscribe = onSnapshot(ref, (snap) => {
        const list: Product[] = [];
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.fav !== false) {
            list.push({
              id: data.foodId || data.id || docSnap.id,
              name: data.name || data.nam1 || 'Favorite Item',
              price: Number(data.price || data.price1 || 0),
              oldprice: data.oldprice ? Number(data.oldprice) : undefined,
              imgUrl: resolveImageUrl(data),
              storeId: data.storeId || data.store || data.brand || '',
              store: data.store || data.brand || 'Tulete Store',
              rating: Number(data.rating || 4.8),
              reviewCount: Number(data.reviewCount || 1),
              category: data.category || data.cate || data.cat || 'Product',
              cat: data.cat || data.specCat || data.category || 'Product',
              location: data.location || data.productloc || '',
              description: data.description || data.desc || '',
              availability: data.availability !== false,
              time: data.time || data.updatedAt || data.createdAt || '',
              tags: [],
            } as any);
          }
        });

        // Sort "What you wish for" items in descending order using "time"
        list.sort((a: any, b: any) => {
          const timeA = a.time ? new Date(a.time).getTime() : 0;
          const timeB = b.time ? new Date(b.time).getTime() : 0;
          return timeB - timeA;
        });

        setUserFavoritesItems(list);
      }, (err) => {
        console.warn('Error fetching userfavorites items:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('userfavorites listener failed:', e);
    }
  }, [user?.id, isAuthenticated]);

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
        const filterStr = filterValue === 'food' ? '(recordType:food OR category:Food OR cat:Food)'
          : filterValue === 'product' ? '(recordType:product OR category:Product OR cat:Product)'
          : filterValue === 'laundry' ? '(recordType:cloth OR recordType:laundry OR category:Laundry OR category:Nguo OR cat:Nguo)'
          : undefined;
        const hits = await searchTuleteItems(searchQuery, { filters: filterStr, hitsPerPage: 40 });
        if (!controller.signal.aborted) setMobileResults(hits);
      } finally {
        if (!controller.signal.aborted) setMobileLoading(false);
      }
    };
    const t = setTimeout(run, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [searchQuery, isMobileSearchOpen, filterValue]);


  const promoRef = useRef<HTMLDivElement>(null);
  const openNowRef = useRef<HTMLDivElement>(null);
  const topRatedRef = useRef<HTMLDivElement>(null);

  const { isFavorited, toggleFavorite: toggleProductFavorite, initialize: initFavs } = useFavoritesStore();

  useEffect(() => {
    initFavs(user?.id || 'guest_user');
  }, [user?.id, initFavs]);

  const handleProductFav = (p: Product) => {
    const collection = (p as Product & { _collection?: string })._collection;
    const isLnd = isLaundryItem(p) || collection === 'cloths' || cloths.some(c => c.id === p.id);
    const isFd = !isLnd && (isFoodItem(p) || collection === 'foods' || foods.some(f => f.id === p.id));
    const cat = isLnd ? 'Nguo' : (isFd ? ((p as any).cat || p.category || 'Food') : ((p as any).cat || p.category || 'Product'));
    const { rating: normRating, reviewCount: normReviewCount } = getNormalizedRating(p);

    toggleProductFavorite(user?.id || 'guest_user', {
      ...p,
      type: 'product',
      itemId: p.id,
      name: p.name,
      description: p.description || '',
      imageUrl: p.imgUrl || '',
      price: p.price,
      rating: p.rating ?? normRating,
      reviewCount: p.reviewCount ?? normReviewCount,
      category: cat,
      cat: cat,
      isLaundry: isLnd,
      isFood: isFd,
    });
  };

  const saveToUserViewed = (product: any) => {
    if (!isAuthenticated || !user?.id || !product?.id) return;
    const itemCat = (product as any)?.cat || product?.category || '';
    const isLaundry = itemCat === 'Nguo' || itemCat === 'Laundry' || ['Suits', 'Bag Wash', 'Bedding'].includes(itemCat);
    if (isLaundry) return;

    const docRef = doc(db, 'userViewed', user.id, 'recentlyViewed', product.id);
    const userViewedPayload = buildCompleteProductPayload(product, user.id);
    setDoc(docRef, userViewedPayload, { merge: true }).catch(() => {});
  };

  const handleProductClick = (p: Product) => {
    saveToUserViewed(p);
    navigate(`/product/${encodeURIComponent(p.id)}`, { state: { product: p } });
  };

  const handleAddToCart = (p: Product) => {
    saveToUserViewed(p);
    let cat = (p as any).cat || 'Product';
    const collection = (p as Product & { _collection?: string })._collection;
    if (collection === 'foods' || foods.some(f => f.id === p.id)) cat = 'Food';
    else if (collection === 'cloths' || cloths.some(c => c.id === p.id) || cat === 'Nguo') cat = 'Nguo';
    else if (!cat || cat === 'Products') cat = 'Product';

    const isLaundry = cat === 'Nguo' || collection === 'cloths';
    addToCart({
      productId: p.id,
      baseProductId: p.id,
      name: p.name,
      price: p.price,
      basePrice: p.price,
      imageUrl: p.imgUrl,
      storeId: p.storeId,
      storeName: p.store,
      brand: (p as any).brand || (p as any).pbrand || p.storeId || '',
      cat,
      location: p.location,
      idadi: p.idadi,
      isLaundry
    });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning ' : hour < 17 ? 'Good afternoon ' : 'Good evening ';
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  const { data: storesData, isLoading: isStoresLoading } = useFirestoreQuery(
    ['stores', 'home'],
    storeService,
    { limit: 60 }
  );

  const processItems = (items: any[], type: 'food' | 'product', seedOffset: number = 0) => {
    const validItems = items
      .filter(item => {
        if (item.availability === false || item.availability === 'false' || item.available === false || item.isAvailable === false) return false;

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

        if (location && currentLocation) {
          const fee = getDeliveryFee(currentLocation, location, item.storeId || item.id || '', false, true);
          if (type === 'food' && fee > 1600) return false;
          if (type === 'product' && fee > 10000) return false;
        }
        return true;
      });

    // Randomize category items at data level using the 10-hour seed
    return shuffleWithSeed(validItems, homeSeed + seedOffset);
  };

  const stores = storesData?.data || [];
  const validStores = stores
    .filter(s => {
      if (!s || !s.id || s.id === 'undefined' || s.id === 'null') return false;
      const storeName = (s.store || s.name || '').trim();
      if (!storeName || storeName === 'undefined' || storeName === 'null' || storeName === 'Store') return false;
      if (storeName.toLowerCase().includes('dummy') || storeName.toLowerCase().includes('test store')) return false;
      if (s.availability === false) return false;
      return true;
    })
    .map(s => {
      const coords = parseStoreCoords(s);
      const dist = (currentLocation && coords && typeof currentLocation.lat === 'number' && typeof currentLocation.lng === 'number')
        ? locationService.calculateDistance(
            { lat: currentLocation.lat, lng: currentLocation.lng },
            coords
          )
        : undefined;

      return { ...s, distance: dist };
    })
    .filter(s => s.distance !== undefined && !isNaN(s.distance) && s.distance < 1.2)
    .sort((a, b) => (a.distance ?? 99.9) - (b.distance ?? 99.9));

  // Randomize stores at data level using the 10-hour seed
  const processedStores = shuffleWithSeed(validStores, homeSeed + 400);

  const topStores = processedStores;
  const openStores = processedStores;

  const { data: foodsData, isLoading: isFoodsLoading } = useFirestoreQuery(['foods', 'home'], productService, { filters: [{ field: '_collection', operator: '==', value: 'foods' }], limit: 50 });
  const { data: productsData, isLoading: isProductsLoading } = useFirestoreQuery(['products', 'home'], productService, { filters: [{ field: '_collection', operator: '==', value: 'products' }], limit: 50 });
  const { data: clothsData, isLoading: isClothsLoading } = useFirestoreQuery(['cloths', 'home'], productService, { filters: [{ field: '_collection', operator: '==', value: 'cloths' }], limit: 50 });

  const foods = processItems(foodsData?.data || [], 'food', 100);
  const products = processItems(productsData?.data || [], 'product', 200);
  const cloths = processItems(clothsData?.data || [], 'product', 300);
  
  // Create allItems randomized with 10-hour seed
  const allItems = shuffleWithSeed([...foods, ...products, ...cloths], homeSeed + 500);

  let currentItems = allItems;
  if (filterValue === 'food') currentItems = foods;
  if (filterValue === 'product') currentItems = products;
  if (filterValue === 'laundry') currentItems = cloths;

  // Requirement 1: Recommended for you subCat preference logic (from userViewed & localStorage)
  const activeRecommendedSubCat = useMemo(() => {
    if (userViewedItems.length > 0) {
      const latestItem = userViewedItems[0] as any;
      const latestSubCat = latestItem.subCat || latestItem.subCategory || latestItem.speccat;
      if (latestSubCat) {
        try {
          localStorage.setItem('tulete_recommended_subcat', String(latestSubCat));
        } catch (e) {}
        return String(latestSubCat);
      }
    }
    try {
      return localStorage.getItem('tulete_recommended_subcat') || null;
    } catch (e) {
      return null;
    }
  }, [userViewedItems]);

  const recommendedProducts = useMemo(() => {
    if (activeRecommendedSubCat) {
      const targetSub = activeRecommendedSubCat.toLowerCase();
      const matched = currentItems.filter((p: any) => {
        const pSub = p.subCat || p.subCategory || p.speccat || p.cat || p.category;
        return pSub && String(pSub).toLowerCase() === targetSub;
      });
      if (matched.length > 0) {
        return matched.slice(0, 20);
      }
    }
    return currentItems.slice(0, 20);
  }, [currentItems, activeRecommendedSubCat]);
  const mostRatedProducts = [...currentItems].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 20);
  const interestedLately = currentItems.slice(0, 20);
  const wishlistProducts = currentItems.slice(0, 20); // Fallback slice from 0 if there are fewer than 3 items
  const productsNearMe = shuffleWithSeed(currentItems, homeSeed + 600).slice(0, 20);

  const parseTimestamp = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'object') {
      if (typeof val.toMillis === 'function') return val.toMillis();
      if (typeof val.toDate === 'function') return val.toDate().getTime();
      if (typeof val.seconds === 'number') return val.seconds * 1000;
      if (typeof val._seconds === 'number') return val._seconds * 1000;
    }
    if (typeof val === 'number') {
      if (isNaN(val)) return 0;
      return val < 10000000000 ? val * 1000 : val;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return 0;
      if (/^\d+$/.test(trimmed)) {
        const num = Number(trimmed);
        if (!isNaN(num) && num > 0) {
          return num < 10000000000 ? num * 1000 : num;
        }
      }
      const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (ddmmyyyyMatch) {
        const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = ddmmyyyyMatch;
        const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
        if (!isNaN(d.getTime()) && d.getTime() > 0) return d.getTime();
      }

      const parsedDate = new Date(trimmed).getTime();
      if (!isNaN(parsedDate) && parsedDate > 0) return parsedDate;
      const formatted = trimmed.replace(' ', 'T');
      const parsedFormatted = new Date(formatted).getTime();
      if (!isNaN(parsedFormatted) && parsedFormatted > 0) return parsedFormatted;
    }
    return 0;
  };

  const sortItemsByTimeDesc = <T extends Record<string, any>>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      const rawA = a.time ?? a.time1 ?? a.timestamp ?? a.createdAt ?? a.updatedAt ?? a.date;
      const rawB = b.time ?? b.time1 ?? b.timestamp ?? b.createdAt ?? b.updatedAt ?? b.date;

      const timeA = parseTimestamp(rawA);
      const timeB = parseTimestamp(rawB);

      if (timeA > 0 && timeB > 0) {
        if (timeB !== timeA) return timeB - timeA;
      } else if (timeB > 0) {
        return 1;
      } else if (timeA > 0) {
        return -1;
      }

      const strA = String(rawA || '');
      const strB = String(rawB || '');
      return strB.localeCompare(strA);
    });
  };

  const dailyMeals = useMemo(() => {
    const valid = (foodsData?.data || []).filter(item => item.availability !== false && item.available !== false && item.isAvailable !== false);
    return sortItemsByTimeDesc(valid);
  }, [foodsData?.data]);

  const dailyShoppingDeals = useMemo(() => {
    const rawProducts = (productsData?.data || []).filter(item => item.availability !== false && item.available !== false && item.isAvailable !== false);
    const deals = rawProducts.filter(p => (p.oldprice && p.oldprice > p.price) || p.tags?.includes('Super Saver'));
    const listToUse = deals.length >= 2 ? deals : rawProducts;
    return sortItemsByTimeDesc(listToUse);
  }, [productsData?.data]);

  const dailyDeals = useMemo(() => {
    const rawProducts = (productsData?.data || []).filter(item => item.availability !== false && item.available !== false && item.isAvailable !== false);
    const deals = rawProducts.filter(p => p.oldprice && p.oldprice > p.price);
    return sortItemsByTimeDesc(deals);
  }, [productsData?.data]);

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

  const toggleFav = (store: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const storeName = store.store || store.name || '';
    const storeId = store.id || store.objectID || storeName;
    const storePayload = {
      ...store,
      id: storeId,
      itemId: storeId,
      foodId: storeId,
      type: 'store',
      recordType: 'store',
      category: store.category || store.cat || 'Store',
      cat: store.cat || store.category || 'Store',
      store: storeName,
      name: storeName,
    };
    toggleProductFavorite(user?.id || 'guest_user', storePayload);
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    navigate('/cart');
  };

  const searchPlaceholderText = useMemo(() => {
    if (selectedBrand) {
      return `Search ${selectedBrand.name}...`;
    }
    switch (filterValue) {
      case 'food':
        return t('searchPlaceholderFood');
      case 'product':
        return t('searchPlaceholderProduct');
      case 'laundry':
        return t('searchPlaceholderLaundry');
      case 'brands':
        return t('searchPlaceholderBrands');
      default:
        return t('searchPlaceholder');
    }
  }, [selectedBrand, filterValue, t]);

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
            placeholder={searchPlaceholderText}
          />
        )}
      </AnimatePresence>
      <div className="flex w-full bg-background relative items-stretch lg:h-[calc(100vh-4rem)] lg:overflow-hidden">

        {/*  LEFT SIDEBAR (FILTERS)  */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full overflow-hidden px-6 pt-6 pb-8">
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Filters</h2>
            
            <button onClick={() => setFilterValue(null)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group border ${filterValue === null ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${filterValue === null ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}><LayoutGrid className="w-4 h-4"/></div>
              <span className="font-bold text-sm">All</span>
            </button>
            
            <button onClick={() => { setFilterValue(filterValue === 'food' ? null : 'food'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group border ${filterValue === 'food' ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-card text-foreground border-border hover:border-orange-500/50 hover:bg-muted'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${filterValue === 'food' ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-500'}`}><Utensils className="w-4 h-4"/></div>
              <span className="font-bold text-sm">Foods</span>
            </button>
            
            <button onClick={() => { setFilterValue(filterValue === 'product' ? null : 'product'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group border ${filterValue === 'product' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-card text-foreground border-border hover:border-emerald-500/50 hover:bg-muted'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${filterValue === 'product' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}><ShoppingBag className="w-4 h-4"/></div>
              <span className="font-bold text-sm">Shopping</span>
            </button>

            <button onClick={() => { setFilterValue(filterValue === 'laundry' ? null : 'laundry'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group border ${filterValue === 'laundry' ? 'bg-sky-500 text-white border-sky-500 shadow-md' : 'bg-card text-foreground border-border hover:border-sky-500/50 hover:bg-muted'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${filterValue === 'laundry' ? 'bg-white/20 text-white' : 'bg-sky-500/10 text-sky-500'}`}><Sparkles className="w-4 h-4"/></div>
              <span className="font-bold text-sm">Laundry</span>
            </button>

            <button onClick={() => { setFilterValue(filterValue === 'brands' ? null : 'brands'); setSelectedBrand(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group border ${filterValue === 'brands' ? 'bg-purple-500 text-white border-purple-500 shadow-md scale-105' : 'bg-card text-foreground border-border hover:border-purple-500/50 hover:bg-muted'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${filterValue === 'brands' ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-500'}`}><Tag className="w-4 h-4"/></div>
              <span className="font-bold text-sm">Brands</span>
            </button>
          </div>
        </div>

        {/*  CENTER/MAIN COLUMN  */}
        <div className="flex-auto min-w-0 max-w-full h-auto lg:h-full overflow-visible lg:overflow-y-auto scrollbar-none pt-4 pb-28 px-4 lg:px-8 xl:px-10 space-y-4 lg:space-y-5">

          {/*  HEADER SECTION  */}
          <div className="pt-1 pb-0">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{greeting}</p>
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                  Hi, <span className="notranslate text-primary" translate="no">{firstName}</span>!
                </h1>
                <p className="text-base text-muted-foreground mt-0.5">{t('greetingSub')}</p>
              </div>
              <button
                onClick={() => navigate('/notifications')}
                className="relative w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all shadow-sm cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-200 border-2 border-background">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Row */}
          <div className="sticky top-16 lg:top-0 z-40 !mt-0 flex gap-3 py-3 -mx-4 px-4 sm:-mx-8 sm:px-8 bg-background/85 dark:bg-background/75 backdrop-blur-3xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/80 border-b border-border/30 transition-all">
            <div className="relative flex items-center w-full bg-card/75 dark:bg-card/60 backdrop-blur-xl border border-border/80 rounded-2xl shadow-md transition-all focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary px-3 h-14">
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
                placeholder={searchPlaceholderText}
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
                  ? 'bg-orange-500 text-white border-orange-500 scale-105'
                  : 'bg-card text-foreground border-border hover:border-orange-500/30'
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
                  ? 'bg-sky-500 text-white border-sky-500 scale-105'
                  : 'bg-card text-foreground border-border hover:border-sky-500/30'
              }`}
            >
              <Sparkles className="w-4 h-4 opacity-70" />
              Laundry
            </button>
            <button
              onClick={() => { setFilterValue(filterValue === 'brands' ? null : 'brands'); setSelectedBrand(null); }}
              className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-extrabold transition-all border shadow-sm ${
                filterValue === 'brands'
                  ? 'bg-purple-500 text-white border-purple-500 scale-105'
                  : 'bg-card text-foreground border-border hover:border-purple-500/30'
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute inset-0 p-6 flex flex-col justify-between">
                        <span className="self-start bg-black/30 backdrop-blur-md text-white text-xs font-extrabold px-3.5 py-1.5 rounded-full border border-white/20 shadow-sm">
                          {promo.badge}
                        </span>
                        <div className="text-white">
                          <h3 className="font-extrabold text-2xl leading-tight mb-1.5 drop-shadow-md">{promo.title}</h3>
                          <p className="opacity-95 text-sm font-medium mb-4 drop-shadow">{promo.subtitle}</p>
                          <span className="inline-flex items-center gap-2 bg-white text-slate-950 text-xs font-extrabold px-5 py-2.5 rounded-full hover:scale-105 transition-transform shadow-md">
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
            {isProductsLoading || isFoodsLoading ? (
              <HorizontalCarousel title="Recommended for you" icon={<Star className="w-5 h-5 fill-primary stroke-primary" />} actionLink="/products">
                {[1, 2, 3, 4].map(i => (
                  <div key={`rec-skel-${i}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCardSkeleton />
                  </div>
                ))}
              </HorizontalCarousel>
            ) : recommendedProducts.length > 0 && (
              <HorizontalCarousel title="Recommended for you" icon={<Star className="w-5 h-5 fill-primary stroke-primary" />} actionLink="/products" autoScrollSpeed={0.3}>
                {recommendedProducts.slice(0, 20).map(product => (
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
            {isStoresLoading ? (
              <HorizontalCarousel title="Stores near me" icon={<MapPin className="w-5 h-5 text-primary" />} actionLink="/explore">
                {[1, 2, 3, 4].map(i => (
                  <div key={`store-skel-${i}`} className="w-[280px] sm:w-[320px] shrink-0">
                    <StoreCardSkeleton />
                  </div>
                ))}
              </HorizontalCarousel>
            ) : (() => {
              const filteredStoresNearMe = openStores.filter((store) => {
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
                if (filterValue === 'food') return actualCategory === 'food';
                if (filterValue === 'product') return actualCategory === 'product';
                if (filterValue === 'laundry') return actualCategory === 'laundry';
                return true;
              });

              if (filteredStoresNearMe.length === 0) return null;

              const visibleStores = filteredStoresNearMe.slice(0, storeLimit);
              const hasMoreStores = filteredStoresNearMe.length > storeLimit;

              return (
                <HorizontalCarousel title="Stores near me" icon={<MapPin className="w-5 h-5 text-primary" />} actionLink="/stores">
                  {visibleStores.map((store) => (
                    <div key={`store-${store.id}`} className="w-[280px] sm:w-[320px] shrink-0">
                      <FeaturedStoreCard
                        store={store}
                        onClick={() => {
                          const storeName = store.store || store.name;
                          const isGeneric = !store.id || store.id === 's1' || store.id === 'Tulete Duka' || store.id === 'Tulete Dobi' || store.id === 'unknown';
                          const targetId = !isGeneric ? store.id : (storeName || store.id || 's1');
                          navigate(`/store/${encodeURIComponent(targetId)}`, { state: { storeData: { ...store, store: storeName } } });
                        }}
                        isFav={isFavorited(store.id)}
                        onFav={(e) => toggleFav(store, e)}
                      />
                    </div>
                  ))}

                  {hasMoreStores ? (
                    <div className="w-[200px] shrink-0 flex items-center justify-center">
                      <button
                        onClick={() => setStoreLimit((prev) => prev + 20)}
                        className="w-full h-full min-h-[160px] rounded-3xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center p-4 transition-all group cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-2 shadow-md group-hover:scale-110 transition-transform">
                          <ChevronRight className="w-6 h-6" />
                        </div>
                        <span className="font-extrabold text-sm text-foreground text-center">Open Next 20 Stores</span>
                        <span className="text-xs text-muted-foreground mt-1">({filteredStoresNearMe.length - storeLimit} remaining)</span>
                      </button>
                    </div>
                  ) : storeLimit > 20 ? (
                    <div className="w-[180px] shrink-0 flex items-center justify-center">
                      <button
                        onClick={() => setStoreLimit(20)}
                        className="w-full h-full min-h-[160px] rounded-3xl border border-border hover:border-muted-foreground/50 bg-card hover:bg-muted flex flex-col items-center justify-center p-4 transition-all group cursor-pointer"
                      >
                        <span className="font-extrabold text-xs text-muted-foreground text-center">Show First 20</span>
                      </button>
                    </div>
                  ) : null}
                </HorizontalCarousel>
              );
            })()}


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
                      onClick={handleProductClick}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 4. Most rated */}
            {mostRatedProducts.length > 0 && (
              <HorizontalCarousel title="Most rated" icon={<Flame className="w-5 h-5 text-orange-500 fill-orange-500" />} actionLink="/explore?sort=popular" autoScrollSpeed={0.4}>
                {mostRatedProducts.slice(0, 20).map(product => (
                  <div key={`rated-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                      onClick={handleProductClick}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 5. What interested you lately (Only when logged in & has userViewed docs) */}
            {isAuthenticated && userViewedItems.length > 0 && (
              <HorizontalCarousel title="What interested you lately" icon={<Clock className="w-5 h-5 text-muted-foreground" />} actionLink="/explore" autoScrollSpeed={0.2}>
                {userViewedItems.slice(0, 20).map(product => (
                  <div key={`int-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                      onClick={handleProductClick}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 6. What you wish for (From userfavorites document using uids) */}
            {userFavoritesItems.length > 0 ? (
              <HorizontalCarousel title="What you wish for" icon={<Heart className="w-5 h-5 text-destructive fill-destructive" />} actionLink="/favorites" autoScrollSpeed={0.6}>
                {userFavoritesItems.slice(0, 20).map(product => (
                  <div key={`wish-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={true}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                      onClick={handleProductClick}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            ) : (wishlistProducts.length > 0 && (
              <HorizontalCarousel title="What you wish for" icon={<Heart className="w-5 h-5 text-destructive fill-destructive" />} actionLink="/favorites" autoScrollSpeed={0.6}>
                {wishlistProducts.map(product => (
                  <div key={`wish-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                      onClick={handleProductClick}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            ))}

            {/* NEW SECTION: Daily Shopping Deals (from products document collection) */}
            {(!filterValue || filterValue === 'product') && dailyShoppingDeals.length > 0 && (
              <HorizontalCarousel title="Daily Shopping Deals" icon={<ShoppingBag className="w-5 h-5 text-emerald-500" />} actionLink="/products?deals=true" autoScrollSpeed={0.35}>
                {dailyShoppingDeals.slice(0, 20).map(product => (
                  <div key={`daily-shopping-deal-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                      onClick={handleProductClick}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 7. Daily meals & drinks (Food Only) */}
            {(!filterValue || filterValue === 'food') && dailyMeals.length > 0 && (
              <HorizontalCarousel title="Daily meals & drinks" icon={<Utensils className="w-5 h-5 text-primary" />} actionLink="/food">
                {dailyMeals.slice(0, 20).map(product => (
                  <div key={`food-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                      onClick={handleProductClick}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 8. Daily deals in shopping (Products Only) */}
            {(!filterValue || filterValue === 'product') && dailyDeals.length > 0 && (
              <HorizontalCarousel title="Daily deals in shopping" icon={<Tag className="w-5 h-5 text-warning" />} actionLink="/products?deals=true" autoScrollSpeed={0.3}>
                {dailyDeals.slice(0, 20).map(product => (
                  <div key={`deal-${product.id}`} className="w-[200px] sm:w-[240px] shrink-0">
                    <ProductCard 
                      product={product} 
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                      onClick={handleProductClick}
                    />
                  </div>
                ))}
              </HorizontalCarousel>
            )}

            {/* 9. What we clean (Laundry Only) */}
            {(!filterValue || filterValue === 'laundry') && laundryClean.length > 0 && (
              <HorizontalCarousel title="What we clean" icon={<Sparkles className="w-5 h-5 text-primary" />} actionLink="/laundry" autoScrollSpeed={0.4}>
                {laundryClean.slice(0, 20).map(product => (
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
        <div className="hidden xl:block flex-none w-[320px] shrink-0 border-l border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-6 pb-20">
              
              {/* LIVE CART WIDGET */}
              <CartWidget onCheckout={handleCheckout} />

              {/* QUICK ACTION CARDS (Hidden if cart is full to save space, or shown below) */}
              {!hasItems && (
                <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Quick Actions</h2>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      {
                        icon: Sparkles,
                        iconBg: 'bg-sky-500/10 text-sky-500',
                        title: 'Book Laundry',
                        sub: 'Express pickup',
                        href: '/laundry',
                      },
                      {
                        icon: ShoppingBag,
                        iconBg: 'bg-emerald-500/10 text-emerald-500',
                        title: 'My Orders',
                        sub: 'Track deliveries',
                        href: '/orders',
                      },
                      {
                        icon: Heart,
                        iconBg: 'bg-rose-500/10 text-rose-500',
                        title: 'Favourites',
                        sub: 'Saved items',
                        href: '/favorites',
                      },
                      {
                        icon: StoreIcon,
                        iconBg: 'bg-amber-500/10 text-amber-500',
                        title: 'All Stores',
                        sub: 'Browse network',
                        href: '/stores',
                      },
                    ].map(({ icon: Icon, iconBg, title, sub, href }) => (
                      <motion.button
                        key={title}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => navigate(href)}
                        className="bg-card hover:bg-muted text-foreground rounded-2xl p-3 flex items-center gap-3 text-left shadow-sm hover:shadow-md transition-all border border-border group cursor-pointer"
                      >
                        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-extrabold text-xs leading-tight text-foreground">{title}</p>
                          <p className="text-muted-foreground text-[10px] mt-0.5">{sub}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* TRUST STATS BAND */}
              <PlatformStatsWidget />

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

              {/* HELP & SAFETY WIDGET */}
              <HelpSafetyWidget />

              {/* FOLLOW US WIDGET */}
              <SocialLinksWidget />

          </div>
        </div>

        {/* MOBILE FLOATING CHECKOUT BAR */}
        <AnimatePresence>
          {hasItems && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="xl:hidden fixed bottom-20 left-3 right-3 sm:left-4 sm:right-4 z-50 flex items-stretch gap-2"
            >
              <Button
                onClick={handleCheckout}
                className="flex-1 py-4 px-4 sm:px-5 text-sm sm:text-base font-extrabold shadow-2xl flex items-center justify-between rounded-2xl bg-primary text-primary-foreground"
              >
                <div className="flex items-center gap-2.5">
                  <div className="bg-background/20 px-2.5 py-0.5 rounded-full text-xs font-black">
                    {cartItems.length}
                  </div>
                  <span className="font-extrabold">Checkout</span>
                </div>
                <span className="font-extrabold text-sm sm:text-base">{APP_SETTINGS.currency} {formatPrice(cartTotal)} <ArrowRight className="inline-block ml-1.5 w-4 h-4" /></span>
              </Button>
              
              <button
                onClick={() => clearCart()}
                title="Clear all items from cart"
                className="self-stretch px-4 rounded-2xl bg-card text-destructive hover:bg-destructive hover:text-white border border-border shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageContainer>
  );
};
