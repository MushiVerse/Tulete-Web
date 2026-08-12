import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';

const getTimeValue = (item: any): number => {
  if (!item || typeof item !== 'object') return 0;

  const val = item.time ?? item.createdAt ?? item.created_at ?? item.updatedAt ?? item.updated_at ?? item.timestamp ?? item.date ?? item._createdAt;
  if (val === undefined || val === null || val === '') return 0;

  if (typeof val === 'number') {
    return val < 1e11 ? val * 1000 : val;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      return num < 1e11 ? num * 1000 : num;
    }
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) return parsed;
  }

  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try { return val.toDate().getTime(); } catch (_) { }
    }
    if (typeof val.seconds === 'number') return val.seconds * 1000;
    if (typeof val._seconds === 'number') return val._seconds * 1000;
  }

  return 0;
};

const getItemSearchableText = (item: any): string => {
  if (!item || typeof item !== 'object') return '';
  const fields = [
    item.name, item.title, item.nam1, item.nameEn, item.nameSw, item.item_name, item.product_name,
    item.description, item.desc, item.details, item.detail,
    item.store, item.storeName, item.store_name, item.vendorName, item.businessName,
    item.category, item.cat, item.mainCategory, item.subCat, item.subCategory, item.subcat, item.scat, item.speccat,
    item.address, item.location,
    Array.isArray(item.tags) ? item.tags.join(' ') : item.tags,
    Array.isArray(item.keywords) ? item.keywords.join(' ') : item.keywords,
  ];
  return fields.filter(Boolean).map(v => String(v).toLowerCase()).join(' ');
};

const matchesSearchQuery = (item: any, query: string): boolean => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const searchableText = getItemSearchableText(item);
  return tokens.every(token => searchableText.includes(token));
};

const getSearchRelevanceScore = (item: any, query: string): number => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return 0;

  const name = String(item.name || item.title || item.nam1 || item.store || item.storeName || '').toLowerCase().trim();
  if (name === trimmed) return 1000;
  if (name.startsWith(trimmed)) return 500;
  if (name.includes(trimmed)) return 200;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  let score = 0;
  for (const token of tokens) {
    if (name.includes(token)) score += 60;
  }

  const desc = String(item.description || item.desc || '').toLowerCase();
  if (desc.includes(trimmed)) score += 30;

  const store = String(item.store || item.storeName || item.store_name || '').toLowerCase();
  if (store.includes(trimmed)) score += 20;

  const cat = String(item.category || item.cat || item.subCat || item.subCategory || '').toLowerCase();
  if (cat.includes(trimmed)) score += 15;

  return score;
};
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Filter, Grid, List, Search, Trash2, ArrowRight, Flame, Sparkles, Tag, Zap, ChevronRight, ShoppingCart, X, MapPin, Map as MapIcon, Store, Heart, ExternalLink } from 'lucide-react';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { FilterSidebar } from '../components/FilterSidebar';
import { useFilterStore } from '../store/useFilterStore';
import { searchTuleteItems } from '../../../core/services/algoliaService';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { StoreCard } from '../../../shared/components/cards/StoreCard';
import { Skeleton, ProductCardSkeleton, StoreCardSkeleton, StoreListCardSkeleton } from '../../../shared/components/ui/Skeleton';
import { useCartStore, isFoodItem, isLaundryItem } from '../../cart/store/useCartStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { APP_SETTINGS } from '../../../core/config/settings';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../shared/components/ui/Button';
import { useFavoritesStore } from '../../favorites/hooks/useFavoritesStore';
import { useLocationStore } from '../../location/store/useLocationStore';
import { locationService } from '../../location/services/locationService';
import { DiscoveryMap } from '../components/DiscoveryMap';
import { getDeliveryFee } from '../../location/hooks/useDynamicPrice';
import { formatPrice } from '../../../shared/utils/formatPrice';
import { getNormalizedRating } from '../../../shared/utils/ratingUtils';
import { toast } from 'sonner';
import { resolveImageUrl, resolveItemCategory } from '../../../shared/utils/productPayload';

// Trending quick-filter chips
const TRENDING_FILTERS = [
  { id: 'all', label: 'Explore All', icon: <Sparkles className="w-3 h-3" /> },
  { id: 'Food', label: 'Hot Meals 🔥', icon: <Flame className="w-3 h-3" /> },
  { id: 'Product', label: 'Trending Products', icon: <Filter className="w-3 h-3" /> },
  { id: 'Laundry', label: 'Laundry Deals', icon: <Filter className="w-3 h-3" /> },
];

export const DiscoveryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const urlCategory = new URLSearchParams(window.location.search).get('category');

  const {
    category, setCategory, clearAllFilters,
    minPrice, maxPrice, isAvailableOnly, sortBy
  } = useFilterStore();

  const [localQuery, setLocalQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  // Real Firestore Statistics count (foodStores for Stores, foods+cloths+products for Items)
  const [statsCount, setStatsCount] = useState<{ stores: number | null; items: number | null }>({
    stores: null,
    items: null,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const [storesSnap, foodsSnap, clothsSnap, productsSnap] = await Promise.all([
          getCountFromServer(collection(db, 'foodStores')),
          getCountFromServer(collection(db, 'foods')),
          getCountFromServer(collection(db, 'cloths')),
          getCountFromServer(collection(db, 'products')),
        ]);

        if (isMounted) {
          setStatsCount({
            stores: storesSnap.data().count,
            items: foodsSnap.data().count + clothsSnap.data().count + productsSnap.data().count,
          });
        }
      } catch (err) {
        try {
          const [storesSnap, foodsSnap, clothsSnap, productsSnap] = await Promise.all([
            getDocs(collection(db, 'foodStores')),
            getDocs(collection(db, 'foods')),
            getDocs(collection(db, 'cloths')),
            getDocs(collection(db, 'products')),
          ]);
          if (isMounted) {
            setStatsCount({
              stores: storesSnap.size,
              items: foodsSnap.size + clothsSnap.size + productsSnap.size,
            });
          }
        } catch (e) {
          // ignore
        }
      }
    };

    fetchCounts();
    return () => { isMounted = false; };
  }, []);

  // Cart & Auth
  const { items: cartItems, addToCart, clearCart, getTotals } = useCartStore();
  const { openModal } = useAuthModalStore();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { favorites, toggleFavorite, isFavorited, initialize: initFavs } = useFavoritesStore();

  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;

  const currentLocation = useLocationStore((state) => state.currentLocation);
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'stores'>('products');

  // Pagination state (20 items initially, loads +20 on scroll)
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Reset pagination when search query, active tab, or filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [localQuery, category, minPrice, maxPrice, isAvailableOnly, activeTab]);

  // Infinite scroll observer to increment visible items by 20 on scroll reach
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
  }, [products.length, visibleCount]);

  // Initialize favorites when user is logged in
  useEffect(() => {
    if (user?.id) initFavs(user.id);
  }, [user?.id]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get('tab');
    const urlQuery = urlParams.get('q') || urlParams.get('search') || urlParams.get('query');
    const isMapParam = urlParams.get('map') === 'true' || urlParams.get('view') === 'map';
    const stateShowMap = (location.state as any)?.showMap;

    if (urlTab === 'stores') {
      setActiveTab('stores');
    }
    if (urlQuery && urlQuery !== localQuery) {
      setLocalQuery(urlQuery);
    }
    if (isMapParam || stateShowMap) {
      setShowMap(true);
    }
  }, [location]);

  const handleCheckout = () => {
    if (!isAuthenticated) { openModal('login'); return; }
    navigate('/cart');
  };

  const handleAddToCart = (product: any) => {
    // Block out-of-stock items
    if (product.availability === false) return;
    const rawCat = product.cat || product.category || 'Product';
    const isLaundry = isLaundryItem(product);
    const isFood = isFoodItem(product);
    const itemCat = isFood ? (rawCat || 'Food') : rawCat;

    const rawStoreId = product.storeId || product.store_id || product.storeID || product.sid || product.vendorId || product.businessId;
    const rawStoreName = product.store || product.storeName || product.store_name || product.vendorName || product.businessName;

    const resolvedStoreName = rawStoreName && rawStoreName !== 'Unknown Store' ? rawStoreName : 'Store Order';
    const resolvedStoreId = rawStoreId && rawStoreId !== 'unknown' ? rawStoreId : (rawStoreName && rawStoreName !== 'Unknown Store' ? rawStoreName : product.id);

    addToCart({
      productId: product.id,
      baseProductId: product.id,
      name: product.name,
      price: product.price,
      basePrice: product.price,
      imageUrl: product.imgUrl || product.imageUrl || '',
      storeId: resolvedStoreId,
      storeName: resolvedStoreName,
      cat: itemCat,
      location: product.location,
      idadi: product.quantity !== undefined ? product.quantity : product.idadi,
      isLaundry,
      isFood
    });
  };

  const handleToggleFavorite = (product: any) => {
    if (!isAuthenticated) { openModal('login'); return; }
    if (isLaundryItem(product)) return;

    const targetId = String(product.id || product.objectID || product.itemId || product.foodId || '').trim();
    if (!targetId) return;

    const { rating: normRating, reviewCount: normReviewCount } = getNormalizedRating(product);
    const resolvedImg = resolveImageUrl(product);
    const resolvedIsLaundry = isLaundryItem(product);
    const resolvedIsFood = isFoodItem(product);
    const resolvedCat = resolveItemCategory(product);

    const activeUid = user?.id || 'guest_user';
    const willFav = !isFavorited(targetId);

    toggleFavorite(activeUid, {
      ...product,
      id: targetId,
      itemId: targetId,
      type: (product.type || (product.recordType === 'store' ? 'store' : 'product')) as any,
      name: product.name || product.title || 'Favorite Item',
      description: product.description || '',
      imageUrl: resolvedImg,
      imgUrl: resolvedImg,
      imgURL: resolvedImg,
      price: product.price ?? 0,
      rating: product.rating ?? normRating,
      reviewCount: product.reviewCount ?? normReviewCount,
      category: resolvedCat,
      cat: product.cat || resolvedCat,
      storeId: product.storeId || product.store || '',
      storeName: product.storeName || product.store || '',
      store: product.store || product.storeName || '',
      isLaundry: resolvedIsLaundry,
      isFood: resolvedIsFood,
    });

    toast.success(willFav ? `Added ${product.name || 'item'} to favorites` : `Removed ${product.name || 'item'} from wishlist`);
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

      const catLower = (category || '').toLowerCase();

      // Retrieve laundry items directly from cloths document/collection ordered descending by time at data retrieval level
      if (activeTab !== 'stores' && (catLower === 'laundry' || catLower === 'nguo')) {
        try {
          const clothsSnap = await getDocs(collection(db, 'cloths'));
          const firestoreCloths = clothsSnap.docs.map(doc => ({
            id: doc.id,
            objectID: doc.id,
            recordType: 'cloth',
            _collection: 'cloths',
            ...doc.data()
          }));

          const algoliaHits = await searchTuleteItems(localQuery, {
            filters: `(recordType:cloth OR recordType:laundry OR category:Laundry OR category:Nguo OR _collection:cloths) AND NOT recordType:store AND NOT recordType:brand`,
            hitsPerPage: 200,
          });

          const combinedMap = new Map<string, any>();
          firestoreCloths.forEach((item: any) => combinedMap.set(item.id, item));
          algoliaHits.forEach((item: any) => {
            const id = item.id || item.objectID;
            if (id && !combinedMap.has(id)) combinedMap.set(id, item);
          });

          let laundryList = Array.from(combinedMap.values());

          if (localQuery.trim()) {
            laundryList = laundryList.filter((item: any) => matchesSearchQuery(item, localQuery));
          }

          // Sort descending by time field directly at retrieval data level
          laundryList.sort((a: any, b: any) => {
            const timeA = getTimeValue(a);
            const timeB = getTimeValue(b);

            if (timeA > 0 && timeB > 0) {
              if (timeA !== timeB) return timeB - timeA;
            } else if (timeB > 0) {
              return 1;
            } else if (timeA > 0) {
              return -1;
            }

            const strA = String(a.time || a.createdAt || a.updatedAt || a.created_at || a.timestamp || a.date || a.id || '');
            const strB = String(b.time || b.createdAt || b.updatedAt || b.created_at || b.timestamp || b.date || b.id || '');
            if (strA && strB) return strB.localeCompare(strA);
            if (strB) return 1;
            if (strA) return -1;
            return 0;
          });

          if (!controller.signal.aborted) {
            setProducts(laundryList);
            setLoading(false);
          }
          return;
        } catch (err) {
          console.warn('Error retrieving cloths directly from Firestore:', err);
        }
      }

      // --- Subcategory: query Firestore directly ---
      // Algolia cannot reliably filter by subcategory fields (subCat, ecommerceSubCategory,
      // foodSubCategory, etc.) because they are not configured as facets in the index.
      // Fetching only 200 items broadly and filtering client-side misses too many results.
      // The correct approach: hit Firestore directly for the foods + products collections,
      // then match subcategory client-side across all known field names.
      const isSubcategoryFilter =
        category && category !== 'all' &&
        catLower !== 'food' && catLower !== 'product' &&
        catLower !== 'laundry' && catLower !== 'nguo';

      if (isSubcategoryFilter) {
        try {
          const [foodsSnap, productsSnap] = await Promise.all([
            getDocs(collection(db, 'foods')),
            getDocs(collection(db, 'products')),
          ]);

          const allItems: any[] = [
            ...foodsSnap.docs.map(d => ({ id: d.id, objectID: d.id, recordType: 'food', _collection: 'foods', ...d.data() })),
            ...productsSnap.docs.map(d => ({ id: d.id, objectID: d.id, recordType: 'product', _collection: 'products', ...d.data() })),
          ];

          // Exact subcategory match across all known field names
          const catTarget = catLower;
          const matched = allItems.filter(item => {
            const fields = [
              item.subCat, item.subCategory, item.subcat, item.subsubCat,
              item.ecommerceSubCategory, item.foodSubCategory, item.scat, item.speccat,
              item.category, item.cat, item.mainCategory,
            ]
              .filter(Boolean)
              .map((v: any) => String(v).toLowerCase().trim());

            return fields.some(f => f === catTarget);
          });

          // Apply text search on top if user is typing
          const textFiltered = localQuery.trim()
            ? matched.filter((item: any) => matchesSearchQuery(item, localQuery))
            : matched;

          if (!controller.signal.aborted) {
            setProducts(textFiltered);
            setLoading(false);
          }
        } catch (err) {
          console.warn('Firestore subcategory query failed:', err);
          if (!controller.signal.aborted) setLoading(false);
        }
        return;
      }

      // --- Stores path: query Firestore foodStores collection directly so ALL stores return ---
      if (activeTab === 'stores') {
        try {
          const storesSnap = await getDocs(collection(db, 'foodStores'));
          const firestoreStores = storesSnap.docs.map(doc => ({
            id: doc.id,
            objectID: doc.id,
            recordType: 'store',
            store: doc.data().store || doc.data().name || '',
            name: doc.data().name || doc.data().store || '',
            ...doc.data()
          }));

          let algoliaStores: any[] = [];
          try {
            algoliaStores = await searchTuleteItems(localQuery, {
              filters: `recordType:store`,
              hitsPerPage: 200,
            });
          } catch (_) {}

          const storeMap = new Map<string, any>();
          firestoreStores.forEach(s => storeMap.set(s.id, s));
          algoliaStores.forEach(s => {
            const sId = s.id || s.objectID;
            if (sId && !storeMap.has(sId)) storeMap.set(sId, s);
          });

          let storesList = Array.from(storeMap.values());

          if (localQuery.trim()) {
            storesList = storesList.filter((s: any) => matchesSearchQuery(s, localQuery));
          }

          // Calculate proximity distance from user's selected location and filter stores near the desired area
          if (currentLocation && typeof currentLocation.lat === 'number' && typeof currentLocation.lng === 'number') {
            const mappedStores = storesList.map((s) => {
              let sLat: number | undefined = undefined;
              let sLng: number | undefined = undefined;

              // Parse string location format "lat, lng" (e.g. "-6.18541, 35.7671293")
              const strLoc = typeof s.location === 'string' ? s.location : (typeof s.loc === 'string' ? s.loc : undefined);
              if (strLoc) {
                const parts = strLoc.split(',');
                if (parts.length >= 2) {
                  const pLat = parseFloat(parts[0].trim());
                  const pLng = parseFloat(parts[1].trim());
                  if (!isNaN(pLat) && !isNaN(pLng)) {
                    sLat = pLat;
                    sLng = pLng;
                  }
                }
              }

              if (sLat === undefined || sLng === undefined) {
                let pLat = s.location?.lat ?? s.location?.latitude ?? s.lat ?? s.latitude;
                let pLng = s.location?.lng ?? s.location?.longitude ?? s.lng ?? s.longitude;
                if (typeof pLat === 'string') pLat = parseFloat(pLat);
                if (typeof pLng === 'string') pLng = parseFloat(pLng);
                if (typeof pLat === 'number' && typeof pLng === 'number' && !isNaN(pLat) && !isNaN(pLng)) {
                  sLat = pLat;
                  sLng = pLng;
                }
              }

              const hasValidCoords = sLat !== undefined && sLng !== undefined;

              const dist = hasValidCoords
                ? locationService.calculateDistance(
                    { lat: currentLocation.lat, lng: currentLocation.lng },
                    { lat: sLat!, lng: sLng! }
                  )
                : undefined;

              return { ...s, distance: dist };
            });

            // Return only stores that are less than 1 km (< 1.0 km) from selected address location
            let nearbyStores = mappedStores.filter((s) => s.distance !== undefined && !isNaN(s.distance) && s.distance < 1.0);

            storesList = nearbyStores.sort((a, b) => ((a.distance !== undefined ? a.distance : 99.9) - (b.distance !== undefined ? b.distance : 99.9)));
          }

          if (!controller.signal.aborted) {
            setProducts(storesList);
            setLoading(false);
          }
          return;
        } catch (err) {
          console.warn('Error fetching foodStores from Firestore for DiscoveryPage:', err);
        }
      }

      // --- Standard path: Algolia for food / product / all ---
      let filterStr: string | undefined = undefined;

      if (category && category !== 'all') {
        if (catLower === 'food') {
          filterStr = `(recordType:food OR category:"Food" OR _collection:foods) AND NOT recordType:store AND NOT recordType:brand`;
        } else if (catLower === 'product') {
          filterStr = `(recordType:product OR category:"Product" OR _collection:products) AND NOT recordType:store AND NOT recordType:brand`;
        }
      } else {
        filterStr = `NOT recordType:store AND NOT recordType:brand`;
      }

      // Only apply price as numeric filter (reliably indexed in Algolia)
      const numericFilters: string[] = [];
      if (minPrice !== null) numericFilters.push(`price >= ${minPrice}`);
      if (maxPrice !== null) numericFilters.push(`price <= ${maxPrice}`);

      try {
        const results = await searchTuleteItems(localQuery, {
          filters: filterStr,
          numericFilters: numericFilters.length > 0 ? numericFilters : undefined,
          hitsPerPage: 200,
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
  }, [localQuery, category, minPrice, maxPrice, isAvailableOnly, activeTab, currentLocation?.lat, currentLocation?.lng]);

  const getRating = (item: any) => {
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
    // No fake fallback — return real data only
    return { rating, reviewCount };
  };

  const isLaundryCategory = category && (category.toLowerCase() === 'laundry' || category.toLowerCase() === 'nguo');
  // Derive catLower at component scope so finalProducts filter can use it
  const catLower = (category || '').toLowerCase().trim();

  const finalProducts = products
    .filter((item: any) => {
      // Discard items with no identity and no name — these are incomplete records
      const hasId = !!(item.objectID || item.id);
      const hasName = !!(item.name || item.title);
      if (!hasId && !hasName) return false;

      // --- Availability ---
      if (item.availability === false || item.availability === 'false' || item.available === false || item.isAvailable === false) return false;

      // --- In-Stock Only (quantity > 0) ---
      // Check all known quantity field names across foods, products, and cloths collections.
      if (isAvailableOnly) {
        const rawQty = item.quantity ?? item.idadi ?? item.count ?? item.quanty ?? item.stock ?? item.inStock;
        if (rawQty !== undefined && rawQty !== null && rawQty !== '') {
          const numQty = Number(rawQty);
          // If quantity is a valid number and it's 0 or below, exclude the item
          if (!isNaN(numQty) && numQty <= 0) return false;
        }
        // If no quantity field found at all, item is assumed to be in stock (don't exclude)
      }

      // --- Price range (client-side safety net on top of Algolia numeric filters) ---
      const price = Number(item.price ?? item.bei ?? item.presi ?? 0);
      if (minPrice !== null && price < minPrice) return false;
      if (maxPrice !== null && price > maxPrice) return false;

      const itemCat = String(item.category || item.cat || item.mainCategory || '').toLowerCase().trim();
      // Gather ALL possible subcategory field values into one searchable string
      const itemSubFields = [
        item.subCat, item.subCategory, item.subcat, item.subsubCat,
        item.ecommerceSubCategory, item.foodSubCategory, item.scat, item.speccat
      ]
        .filter(Boolean)
        .map((v: any) => String(v).toLowerCase().trim());

      const isLaundryItem = itemCat === 'nguo' || itemSubFields.includes('nguo') ||
        itemCat === 'laundry' || item.recordType === 'cloth' ||
        item.recordType === 'laundry' || item._collection === 'cloths';

      if (isLaundryCategory) {
        if (!isLaundryItem) return false;
      } else {
        if (itemCat === 'nguo' || itemSubFields.includes('nguo') || item.recordType === 'cloth' || item._collection === 'cloths') return false;
      }


      // --- Delivery radius check ---
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
        const isFood = item.recordType === 'food' || itemCat === 'food';
        if (isFood && fee > 1600) return false;
        if (!isFood && fee > 10000) return false;
      }

      return true;
    })
    .sort((a: any, b: any) => {
      // Laundry always sorts by time desc regardless of sortBy
      if (isLaundryCategory) {
        const timeA = getTimeValue(a);
        const timeB = getTimeValue(b);
        if (timeA > 0 && timeB > 0 && timeA !== timeB) return timeB - timeA;
        if (timeB > 0) return 1;
        if (timeA > 0) return -1;
        const strA = String(a.time || a.createdAt || a.id || '');
        const strB = String(b.time || b.createdAt || b.id || '');
        if (strA && strB) return strB.localeCompare(strA);
        return 0;
      }

      // Price: Low to High
      if (sortBy === 'price_asc') {
        const pA = Number(a.price ?? 0);
        const pB = Number(b.price ?? 0);
        return pA - pB;
      }

      // Price: High to Low
      if (sortBy === 'price_desc') {
        const pA = Number(a.price ?? 0);
        const pB = Number(b.price ?? 0);
        return pB - pA;
      }

      // Newest Arrivals — sort by time desc
      if (sortBy === 'newest') {
        const timeA = getTimeValue(a);
        const timeB = getTimeValue(b);
        if (timeA !== timeB) return timeB - timeA;
        // String-based fallback for items without numeric timestamps
        const strA = String(a.time || a.createdAt || a.created_at || '');
        const strB = String(b.time || b.createdAt || b.created_at || '');
        if (strA && strB) return strB.localeCompare(strA);
        if (strB) return 1;
        if (strA) return -1;
        return 0;
      }

      // Most Popular / Search Relevance (default) — prioritize search relevance when query is active
      if (localQuery.trim()) {
        const scoreA = getSearchRelevanceScore(a, localQuery);
        const scoreB = getSearchRelevanceScore(b, localQuery);
        if (scoreA !== scoreB) return scoreB - scoreA;
      }

      const ratingInfoA = getRating(a);
      const ratingInfoB = getRating(b);
      const ratingDiff = ratingInfoB.rating - ratingInfoA.rating;
      if (ratingDiff !== 0) return ratingDiff;
      const reviewDiff = ratingInfoB.reviewCount - ratingInfoA.reviewCount;
      if (reviewDiff !== 0) return reviewDiff;
      // Tiebreak: newer items first
      const timeA = getTimeValue(a);
      const timeB = getTimeValue(b);
      return timeB - timeA;
    });

  const displayedProducts = finalProducts.slice(0, visibleCount);
  const hasMore = visibleCount < finalProducts.length;

  return (
    <PageWrapper className="min-h-screen bg-background">
      <div className="flex w-full bg-background relative items-stretch lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
        {/* Sidebar Filters */}
        <FilterSidebar isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-auto min-w-0 max-w-full w-full h-auto lg:h-full overflow-visible lg:overflow-y-auto scrollbar-none flex flex-col">

          <div className="w-full max-w-7xl mx-auto pb-24 px-4 sm:px-6 md:px-8 lg:px-12 pt-4 md:pt-6">

            {/* ── Location Header ── */}
            <div className="flex items-center justify-between mb-1.5">
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

            {/* Sticky Floating Search & Filter Bar */}
            <div className="sticky top-16 lg:top-0 z-40 !mt-0 bg-background/85 dark:bg-background/75 backdrop-blur-3xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/80 py-3 border-b border-border/30 mb-4 flex flex-col gap-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12 transition-all">

              {/* Tabs: Products vs Stores */}
              <div className="flex items-center justify-between gap-2">
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
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search Bar Input */}
              <div className="relative flex items-center w-full bg-card/85 dark:bg-card/70 backdrop-blur-xl border border-border/80 rounded-2xl shadow-md transition-all focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary px-3 h-14 gap-2">
                <Search className="w-5 h-5 text-muted-foreground shrink-0 ml-1" />

                <input
                  type="text"
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  onFocus={() => { if (window.innerWidth < 1024) setIsFilterOpen(false); }}
                  placeholder="Search for anything near you..."
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium text-foreground px-2 placeholder:text-muted-foreground h-full"
                />

                {localQuery && (
                  <button
                    onClick={() => setLocalQuery('')}
                    className="text-muted-foreground hover:text-foreground shrink-0 mr-1 p-1"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}

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
                  <MapIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Map</span>
                </button>
              </div>

              {/* Trending Quick Filters Chips (below search bar, hidden when Stores tab is selected) */}
              {activeTab !== 'stores' && (
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-0.5 pb-1">
                  {TRENDING_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => {
                        if (filter.id === 'all') clearAllFilters();
                        else setCategory(filter.id);
                      }}
                      className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold transition-all border ${category === filter.id || (filter.id === 'all' && !category)
                          ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                          : 'bg-card border-border text-muted-foreground hover:bg-muted'
                        }`}
                    >
                      {filter.icon} {filter.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Hero Banner ── */}
            <AnimatePresence>
              {!localQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="mb-3 overflow-hidden"
                >
                  {/* Main orange gradient banner */}
                  <div className="relative w-full rounded-[2rem] overflow-hidden p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl"
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

                    {/* Embedded Stats Cards inside Hero Banner */}
                    <div className="relative z-10 grid grid-cols-3 gap-2.5 w-full md:w-auto shrink-0">
                      {[
                        { label: 'Stores', value: statsCount.stores !== null ? `${statsCount.stores}+` : '...', icon: '🏪' },
                        { label: 'Items', value: statsCount.items !== null ? `${statsCount.items}+` : '...', icon: '📦' },
                        { label: 'Avg. Delivery', value: '25 min', icon: '🛵' },
                      ].map(stat => (
                        <div key={stat.label} className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/25 rounded-2xl p-3 md:p-4 text-center text-white transition-all shadow-sm">
                          <div className="text-xl md:text-2xl mb-1">{stat.icon}</div>
                          <div className="font-extrabold text-sm md:text-base leading-tight drop-shadow-xs">{stat.value}</div>
                          <div className="text-[10px] md:text-xs font-semibold opacity-90 mt-0.5">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-warning fill-warning" />
                {localQuery ? 'Search Results' : 'Trending Now'}
              </h2>
              <span className="text-sm font-bold text-muted-foreground">
                Showing {Math.min(visibleCount, finalProducts.length)} of {finalProducts.length} Items
              </span>
            </div>

            {/* Results Grid/List / Map */}
            <div>
              {showMap ? (
                <div className="w-full mt-2 animate-in fade-in duration-300">
                  <DiscoveryMap items={finalProducts} />
                </div>
              ) : loading ? (
                <div className={`grid gap-4 sm:gap-5 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    activeTab === 'stores' ? (
                      viewMode === 'grid' ? <StoreCardSkeleton key={i} /> : <StoreListCardSkeleton key={i} />
                    ) : (
                      <ProductCardSkeleton key={i} />
                    )
                  ))}
                </div>
              ) : (
                <div className={`grid gap-4 sm:gap-5 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                  {finalProducts.length === 0 ? (
                    <div className="col-span-full py-24 flex flex-col items-center text-center bg-card border border-border border-dashed rounded-3xl mx-2">
                      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Search className="w-10 h-10 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-xl font-extrabold text-foreground mb-2">No results found</h3>
                      <p className="text-muted-foreground font-medium mb-6 max-w-sm">
                        {activeTab === 'stores'
                          ? "No store near your area yet. Try exploring other categories!"
                          : "No items near your area yet. Try exploring our trending categories!"}
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
                  ) : (
                    <>
                      {displayedProducts.map((item: any) => {
                        // Skip items with no usable identity or content — these show as blank/undefined cards
                        const itemId = item.objectID || item.id;
                        const itemName = item.name || item.title || '';
                        const itemPrice = item.price !== undefined ? Number(item.price) : undefined;
                        if (!itemId || (!itemName && itemPrice === undefined)) return null;

                        // Shared normalization
                        const { rating, reviewCount } = getRating(item);

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
                          const sName = storeData.store || storeData.name;
                          const sTargetId = (storeData.id && storeData.id !== 's1' && storeData.id !== 'Tulete Duka' && storeData.id !== 'Tulete Dobi') 
                            ? storeData.id 
                            : (sName || storeData.id || 's1');

                          return (
                            <StoreCard
                              key={storeData.id}
                              store={storeData as any}
                              distanceKm={item.distance !== undefined && item.distance !== 99.9 ? item.distance : undefined}
                              viewMode={viewMode}
                              onClick={() => navigate(`/store/${encodeURIComponent(sTargetId)}`, { state: { storeData: { ...storeData, store: sName || storeData.store } } })}
                            />
                          );
                        }

                        // Product path
                        const rawSId = item.storeId || item.store_id || item.storeID || item.sid || item.vendorId || item.businessId || '';
                        const rawSName = item.store || item.storeName || item.store_name || item.vendorName || item.businessName || '';

                        const resolvedImg = resolveImageUrl(item);
                        const resolvedIsLaundry = isLaundryItem(item);
                        const resolvedIsFood = isFoodItem(item);
                        const itemCategory = resolveItemCategory(item);

                        const product = {
                          ...item,
                          id: item.objectID || item.id,
                          name: item.name || '',
                          description: item.description || '',
                          price: item.price !== undefined ? Number(item.price) : 0,
                          oldprice: item.oldprice !== undefined ? Number(item.oldprice) : undefined,
                          imgUrl: resolvedImg,
                          imageUrl: resolvedImg,
                          imgURL: resolvedImg,
                          storeId: rawSId || rawSName || '',
                          store: rawSName || rawSId || '',
                          rating: Math.round(rating * 10) / 10,
                          reviewCount,
                          category: itemCategory,
                          cat: item.cat || itemCategory,
                          tags: item.tags || [],
                          availability: item.availability !== undefined ? !!item.availability : true,
                          location,
                        };

                        return (
                          <ProductCard
                            key={product.id}
                            product={product}
                            viewMode={viewMode}
                            onAddToCart={handleAddToCart}
                            onToggleFavorite={handleToggleFavorite}
                            isFavorite={isFavorited(product.id)}
                            onClick={setQuickViewProduct}
                          />
                        );
                      })}

                      {hasMore && (
                        <div ref={loadMoreRef} className="col-span-full py-8 flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-semibold text-muted-foreground">Loading more items...</span>
                        </div>
                      )}
                    </>
                  )}
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
                      <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line bg-muted/40 p-3.5 rounded-2xl border border-border/60 max-h-48 overflow-y-auto">
                        {quickViewProduct.description}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-3">
                    <div className="flex gap-3">
                      {!isLaundryItem(quickViewProduct) && (
                        <button
                          onClick={() => handleToggleFavorite(quickViewProduct)}
                          className="p-4 rounded-2xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center shrink-0"
                        >
                          <Heart className={`w-6 h-6 ${isFavorited(quickViewProduct.id || quickViewProduct.objectID || quickViewProduct.itemId) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                        </button>
                      )}
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

                    <button
                      onClick={() => {
                        const targetId = quickViewProduct.id || quickViewProduct.objectID;
                        setQuickViewProduct(null);
                        navigate(`/product/${encodeURIComponent(targetId)}`, { state: { product: quickViewProduct } });
                      }}
                      className="w-full py-3.5 px-4 rounded-2xl border border-primary/30 bg-primary/10 text-primary font-extrabold text-sm hover:bg-primary/20 transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      <ExternalLink className="w-4 h-4" /> View Full Product Details
                    </button>
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
