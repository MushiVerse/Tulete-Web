import { useQueryClient } from '@tanstack/react-query';
import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { storeService, Store } from '../services/storeService';
import { productService, Product } from '../../products/services/productService';
import { useLocationStore } from '../../location/store/useLocationStore';
import { useCartStore, isFoodItem, isLaundryItem } from '../../cart/store/useCartStore';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { PageContainer } from '../../../shared/components/layout';
import { Badge } from '../../../shared/components/ui/Badge';
import { 
  ArrowLeft, Star, Clock, MapPin, Phone, 
  MessageSquare, Share2, Heart, Search, Plus, Minus,
  CheckCircle2, Compass, Percent, Image, AlertTriangle,
  ShoppingBag, ArrowRight, Trash2, ExternalLink, Navigation, Loader2,
  ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestoreDocument, useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { useFavoritesStore } from '../../favorites/hooks/useFavoritesStore';
import { APP_SETTINGS } from '@/core/config/settings';
import { MiniCartRow } from '../../../shared/components/MiniCartRow';
import { CartWidget } from '../../../shared/components/CartWidget';
import { locationService } from '../../location/services/locationService';
import { useThemeStore } from '../../../core/theme/useThemeStore';
import { useDynamicPrice, getItemPriceWithDelivery } from '../../location/hooks/useDynamicPrice';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { toast } from 'sonner';
import { searchTuleteItems } from '../../../core/services/algoliaService';
import { getNormalizedRating, toFirestoreDouble } from '../../../shared/utils/ratingUtils';

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

const StoreProductCardItem = ({
  prod,
  store,
  cartItems,
  updateQuantity,
  addToCart,
  onOpenStoreRatings,
}: {
  prod: any;
  store: any;
  cartItems: any[];
  updateQuantity: (id: string, qty: number) => void;
  addToCart: (item: any) => void;
  onOpenStoreRatings?: () => void;
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isFavorited, toggleFavorite } = useFavoritesStore();
  const productId = String(prod.id || prod.foodId || prod.docId || 'unknown_item');
  const itemCat = (prod as any)?.cat || prod.category || 'Product';
  const isLaundry = isLaundryItem(prod) || itemCat === 'Nguo' || itemCat === 'Laundry' || prod._collection === 'cloths' || prod.recordType === 'cloth';
  
  const dynamicPrice = useDynamicPrice(
    prod.price || 0, 
    store.id || prod.storeId || store.store, 
    isLaundry, 
    prod.location || store.location, 
    undefined, 
    itemCat
  );
  const cartItem = cartItems.find((ci: any) => ci.productId === productId);
  const isSoldOut = prod.availability === false;
  const isFav = isFavorited(productId);

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isLaundry) return;
    const { rating: normRating, reviewCount: normReviewCount } = getNormalizedRating(prod);
    toggleFavorite(user?.id || 'guest_user', {
      ...prod,
      type: 'product',
      itemId: productId,
      name: prod.name || prod.title || 'Item',
      description: prod.description || '',
      imageUrl: prod.imgUrl || prod.imgURL || (Array.isArray(prod.images) && prod.images[0]) || '',
      price: prod.price || 0,
      rating: prod.rating ?? normRating,
      reviewCount: prod.reviewCount ?? normReviewCount,
      category: itemCat || prod.category || prod.cat || 'Product',
      cat: prod.cat || itemCat || prod.category || 'Product',
      storeId: store.id || prod.storeId || store.store || '',
      storeName: store.name || store.store || prod.store || '',
      store: store.name || store.store || prod.store || '',
      location: prod.location || store.location || '',
      isLaundry,
      isFood: isFoodItem(prod),
    });
  };

  return (
    <Card 
      onClick={() => {
        if (productId && productId !== 'undefined') {
          navigate(`/product/${encodeURIComponent(productId)}`, { state: { product: prod } });
        }
      }}
      className="p-4 border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all flex gap-4 items-center cursor-pointer group"
    >
      <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-slate-50">
        <img 
          src={prod.imgUrl || prod.imgURL || (Array.isArray(prod.images) && prod.images[0]) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120"} 
          alt={prod.name || prod.title || 'Product'} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120";
          }}
        />
        {/* Favorite Button (Bottom Left of Item Image) */}
        {!isLaundry && (
          <button 
            onClick={handleToggleFav}
            className="absolute bottom-1 left-1 z-20 w-6 h-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center shadow-md hover:bg-black/60 hover:scale-110 active:scale-95 transition-all group/fav"
            title={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`w-3 h-3 transition-all duration-200 ${isFav ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white group-hover/fav:text-rose-400'}`} />
          </button>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {prod.tags?.map((tag: any, i: number) => (
            <Badge key={i} className="bg-amber-400/20 text-amber-800 border-0 text-[8px] font-bold py-0 px-1 rounded-sm">
              {tag}
            </Badge>
          ))}
        </div>
        
        <h4 className="font-extrabold text-sm text-foreground truncate mb-1 group-hover:text-primary transition-colors">{prod.name || prod.title || 'Item'}</h4>
        <p className="text-xs text-slate-550 dark:text-slate-400 line-clamp-1 mb-2 leading-relaxed">{prod.description}</p>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm text-foreground">
              {formatPrice(dynamicPrice)} {APP_SETTINGS.currency}
            </span>
            {prod.oldprice && (
              <span className="text-[10px] text-slate-400 line-through">
                {formatPrice(prod.oldprice)} {APP_SETTINGS.currency}
              </span>
            )}
          </div>

          {cartItem && cartItem.quantity > 0 ? (
            <div 
              className="flex items-center gap-1.5 sm:gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 bg-muted px-1.5 sm:px-2 py-1 rounded-xl">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (productId) updateQuantity(productId, cartItem.quantity - 1);
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
                    if (productId) updateQuantity(productId, cartItem.quantity + 1);
                  }} 
                  className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              </div>
            </div>
          ) : (
            <button
              disabled={isSoldOut}
              onClick={(e) => {
                e.stopPropagation();
                if (!productId) return;
                addToCart({
                  productId: productId,
                  name: prod.name || prod.title || 'Item',
                  price: dynamicPrice || prod.price || 0,
                  basePrice: prod.price || 0,
                  imageUrl: prod.imgUrl || prod.imgURL,
                  storeId: store.id,
                  storeName: store.store,
                  cat: itemCat,
                  location: prod.location || store.location,
                  idadi: prod.quantity !== undefined ? prod.quantity : (prod as any).idadi,
                  maxQuantity: prod.quantity !== undefined ? prod.quantity : (prod as any).idadi,
                });
              }}
              className={`px-3 py-1.5 rounded-xl shadow-sm transition-all text-xs font-extrabold flex items-center gap-1 shrink-0 ${
                !isSoldOut
                  ? 'bg-primary text-primary-foreground hover:scale-105 active:scale-95'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};

export const StoreDetailsPage = () => {
  const queryClient = useQueryClient();
  const { isDark } = useThemeStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeStoreData = location.state?.storeData as Store | undefined;
  const fromProduct = location.state?.fromProduct as any | undefined;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [activeTab, setActiveTab] = useState<'menu' | 'hours' | 'reviews' | 'gallery'>('menu');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string | null>(null);
  const [geocodedAddress, setGeocodedAddress] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [algoliaStoreProducts, setAlgoliaStoreProducts] = useState<any[]>([]);
  
  // Image Viewer Modal state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<any[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerZoom, setViewerZoom] = useState<number>(1);

  const openImageViewer = (items: any[], index = 0) => {
    if (!items || items.length === 0) return;
    setViewerItems(items);
    setViewerIndex(index);
    setViewerZoom(1);
    setViewerOpen(true);
  };

  useEffect(() => {
    setViewerZoom(1);
  }, [viewerIndex]);

  // Keyboard event listener for Image Viewer
  useEffect(() => {
    if (!viewerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setViewerIndex((prev) => (prev - 1 + viewerItems.length) % viewerItems.length);
      } else if (e.key === 'ArrowRight') {
        setViewerIndex((prev) => (prev + 1) % viewerItems.length);
      } else if (e.key === 'Escape') {
        setViewerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerOpen, viewerItems.length]);
  
  // Pagination & infinite scroll states (20 items initially, +20 on scroll)
  const [productVisibleCount, setProductVisibleCount] = useState<number>(20);
  const [galleryVisibleCount, setGalleryVisibleCount] = useState<number>(20);
  const menuLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const galleryLoadMoreRef = useRef<HTMLDivElement | null>(null);

  // Reset product pagination when category or search changes
  useEffect(() => {
    setProductVisibleCount(20);
  }, [selectedProductCategory, productSearch]);

  // Store rating states
  const [storeUserRating, setStoreUserRating] = useState<number>(0);
  const [storeHoverRating, setStoreHoverRating] = useState<number>(0);
  const [isSubmittingStoreRating, setIsSubmittingStoreRating] = useState(false);

  // Store user & favorites state
  const { user } = useAuthStore();
  const { favorites: savedFavorites, toggleFavorite } = useFavoritesStore();


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

  const decodedId = id ? decodeURIComponent(id) : '';
  const passedStoreData = location.state?.storeData || location.state?.store;

  const rawStoreName = routeStoreData?.store || fromProduct?.store || passedStoreData?.store || passedStoreData?.name || (
    decodedId && decodedId !== 's1' && decodedId !== 'Tulete Duka' && decodedId !== 'Tulete Dobi' && decodedId !== 'undefined' ? decodedId : ''
  );

  const { data: dbStore, isLoading: isStoreDocLoading } = useFirestoreDocument(
    ['store', id || ''],
    storeService,
    id || ''
  );
  
  const { data: dbStoresByName, isLoading: isStoreQueryLoading } = useFirestoreQuery(
    ['store_by_name', rawStoreName || decodedId],
    storeService,
    {
      filters: rawStoreName 
        ? [{ field: 'store', operator: '==' as const, value: rawStoreName }] 
        : (decodedId && decodedId !== 's1' && decodedId !== 'Tulete Duka' && decodedId !== 'Tulete Dobi' ? [{ field: 'store', operator: '==' as const, value: decodedId }] : [])
    }
  );
  const dbStoreByName = dbStoresByName?.data && dbStoresByName.data.length > 0 ? dbStoresByName.data[0] : null;

  const realDbStore = dbStore || dbStoreByName;
  const isStoreLoading = (isStoreDocLoading || isStoreQueryLoading) && !routeStoreData && !passedStoreData;
  const isCheckingRegistration = Boolean(isStoreLoading);
  const isRegisteredInFoodStores = Boolean(realDbStore);

  const mockMatch = storeService.getMockStores().find((s) => 
    s.id === id || s.id === decodedId || 
    s.store?.toLowerCase() === id?.toLowerCase() || 
    s.store?.toLowerCase() === decodedId.toLowerCase() ||
    (rawStoreName && s.store?.toLowerCase() === rawStoreName.toLowerCase())
  );

  const fallbackStore: Store = {
    id: (decodedId && decodedId !== 's1' && decodedId !== 'Tulete Duka' && decodedId !== 'Tulete Dobi') ? decodedId : (rawStoreName || 's1'),
    store: rawStoreName || 'Tulete Partner Store',
    description: 'Welcome to our store! We provide high quality items with fast delivery.',
    imgURL: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    ownerId: 'owner-1',
    rating: 4.8,
    reviewCount: 156,
    category: fromProduct?.category || 'Food',
    availability: true,
    address: 'Dodoma, Tanzania',
    location: { lat: -6.1630, lng: 35.7516 },
    isVerified: true
  };

  const baseStore = realDbStore || routeStoreData || passedStoreData || mockMatch || fallbackStore;

  const resolvedStoreId = realDbStore?.id || 
    (routeStoreData?.id && routeStoreData.id !== 's1' && routeStoreData.id !== 'Tulete Duka' && routeStoreData.id !== 'Tulete Dobi' ? routeStoreData.id : undefined) ||
    (passedStoreData?.id && passedStoreData.id !== 's1' && passedStoreData.id !== 'Tulete Duka' && passedStoreData.id !== 'Tulete Dobi' ? passedStoreData.id : undefined) ||
    (id && id !== 's1' && id !== 'Tulete Duka' && id !== 'Tulete Dobi' ? decodedId : undefined) ||
    rawStoreName ||
    's1';

  const store: Store = {
    ...baseStore,
    id: resolvedStoreId,
    store: realDbStore?.store || routeStoreData?.store || passedStoreData?.store || passedStoreData?.name || fromProduct?.store || baseStore.store,
    rating: realDbStore ? (realDbStore.rating ?? 0) : (passedStoreData?.rating ?? (mockMatch ? baseStore.rating : 0)),
    reviewCount: realDbStore ? (realDbStore.reviewCount ?? 0) : (passedStoreData?.reviewCount ?? (mockMatch ? baseStore.reviewCount : 0)),
    rates: realDbStore?.rates ?? baseStore.rates,
    imgURL: passedStoreData?.imgURL || passedStoreData?.imgUrl || passedStoreData?.image || realDbStore?.imgURL || baseStore.imgURL || (baseStore as any)?.imgUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    category: passedStoreData?.cat || passedStoreData?.category || baseStore.category || baseStore.cat || 'Food',
    cat: passedStoreData?.cat || passedStoreData?.category || baseStore.cat || baseStore.category || 'Food',
    availability: passedStoreData?.availability !== undefined ? Boolean(passedStoreData.availability) : baseStore.availability,
  };

  // Reset gallery pagination when activeTab or store changes
  useEffect(() => {
    setGalleryVisibleCount(20);
  }, [activeTab, store?.id]);

  const targetStoreName = (rawStoreName || store.store).toLowerCase().trim();
  const targetStoreId = (resolvedStoreId || id || store?.id || fromProduct?.storeId || '').toLowerCase().trim();

  // Live Firestore document listener for store favorite state
  const [liveStoreFav, setLiveStoreFav] = useState<boolean | null>(null);

  const isGenericVal = (val?: string) => !val || val === 's1' || val === 'Tulete Duka' || val === 'Tulete Dobi' || val === 'unknown';
  const effectiveStoreId = realDbStore?.id || (!isGenericVal(store?.id) ? store.id : undefined) || (!isGenericVal(targetStoreId) ? targetStoreId : undefined) || (!isGenericVal(id) ? decodedId : undefined) || rawStoreName;

  useEffect(() => {
    if (!user?.id || user.id === 'guest_user' || !effectiveStoreId) {
      setLiveStoreFav(null);
      return;
    }

    try {
      const favDocRef = doc(db, 'userfavorites', user.id, 'favorites', effectiveStoreId);
      const storeDocRef = doc(db, 'userfavorites', user.id, 'stores', effectiveStoreId);

      let favStatus: boolean | null = null;
      let storeFavStatus: boolean | null = null;

      const updateFavState = () => {
        if (storeFavStatus === true || favStatus === true) {
          setLiveStoreFav(true);
        } else {
          setLiveStoreFav(false);
        }
      };

      const unsubFav = onSnapshot(favDocRef, (docSnap) => {
        favStatus = docSnap.exists() ? docSnap.data().fav !== false : false;
        updateFavState();
      }, (err) => {
        console.warn('Error listening to store favorite document in StoreDetailsPage:', err);
        setLiveStoreFav(false);
      });

      const unsubStoreFav = onSnapshot(storeDocRef, (docSnap) => {
        storeFavStatus = docSnap.exists() ? docSnap.data().fav !== false : false;
        updateFavState();
      }, (err) => {
        console.warn('Error listening to store favorite stores document in StoreDetailsPage:', err);
        setLiveStoreFav(false);
      });

      return () => {
        unsubFav();
        unsubStoreFav();
      };
    } catch (_) {
      setLiveStoreFav(false);
    }
  }, [user?.id, effectiveStoreId]);

  const isFavorite = Boolean(liveStoreFav);

  // Toggle favorite matching Firestore userfavorites
  const handleToggleFavorite = () => {
    const targetName = realDbStore?.store || store.store || rawStoreName;
    const resolvedStoreCat = (store.cat && store.cat !== 'Store') 
      ? store.cat 
      : (((store.category as string) && (store.category as string) !== 'Store') ? store.category : (fromProduct?.category || 'Food'));
    const storePayload = {
      ...realDbStore,
      ...store,
      id: effectiveStoreId,
      itemId: effectiveStoreId,
      foodId: effectiveStoreId,
      type: 'store',
      recordType: 'store',
      category: store.category || realDbStore?.category || store.cat || realDbStore?.cat || store.storeCategory || realDbStore?.storeCategory || resolvedStoreCat,
      cat: store.cat || realDbStore?.cat || store.category || realDbStore?.category || store.storeCategory || realDbStore?.storeCategory || resolvedStoreCat,
      storeCategory: store.storeCategory || realDbStore?.storeCategory || store.cat || realDbStore?.cat || store.category || realDbStore?.category || resolvedStoreCat,
      subCategory: store.subCategory || realDbStore?.subCategory || store.subCat || realDbStore?.subCat || resolvedStoreCat,
      subCat: store.subCat || realDbStore?.subCat || store.subCategory || realDbStore?.subCategory || resolvedStoreCat,
      store: targetName,
      name: targetName,
      description: store.description || realDbStore?.description || '',
      imgURL: store.imgURL || store.image || store.imgUrl || realDbStore?.imgURL || '',
      imageUrl: store.imgURL || store.image || store.imgUrl || realDbStore?.imgURL || '',
      rating: store.rating || realDbStore?.rating || 4.8,
      reviewCount: store.reviewCount || realDbStore?.reviewCount || 0,
      location: store.location || realDbStore?.location || '',
      availability: store.availability !== undefined ? store.availability : true,
    };
    toggleFavorite(user?.id || 'guest_user', storePayload);
  };

  // Fetch Firestore collections for foods, products, and cloths according to specific store offering (matching store.dart logic)
  const { data: foodsData, isLoading: isFoodsLoading } = useFirestoreQuery(
    ['store_foods', rawStoreName || id || ''],
    productService,
    { 
      filters: [
        { field: '_collection', operator: '==' as const, value: 'foods' }
      ] 
    }
  );
  const { data: productsData, isLoading: isProductsDataLoading } = useFirestoreQuery(
    ['store_products', rawStoreName || id || ''],
    productService,
    { 
      filters: [
        { field: '_collection', operator: '==' as const, value: 'products' }
      ] 
    }
  );
  const { data: clothsData, isLoading: isClothsLoading } = useFirestoreQuery(
    ['store_cloths', rawStoreName || id || ''],
    productService,
    { 
      filters: [
        { field: '_collection', operator: '==' as const, value: 'cloths' }
      ] 
    }
  );

  const isProductsLoading = isFoodsLoading || isProductsDataLoading || isClothsLoading;

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

  // Query Algolia for products belonging to this specific store
  useEffect(() => {
    const fetchAlgoliaStoreItems = async () => {
      const q = rawStoreName || targetStoreName || fromProduct?.store || targetStoreId || decodedId;
      if (!q) return;
      try {
        const hits = await searchTuleteItems(q, { hitsPerPage: 100 });
        if (hits && hits.length > 0) {
          setAlgoliaStoreProducts(hits);
        }
      } catch (err) {
        console.error('Failed to fetch Algolia store products:', err);
      }
    };
    fetchAlgoliaStoreItems();
  }, [rawStoreName, targetStoreName, targetStoreId, decodedId, fromProduct?.store]);

  // Combine items from foods, products, cloths collections, Algolia hits, and mock fallbacks (only if store matches built-in mock store)
  const mockProductsForStore = mockMatch ? productService.getMockProducts(mockMatch.id) : [];
  const rawCombinedDocs = [
    ...algoliaStoreProducts,
    ...(foodsData?.data || []),
    ...(productsData?.data || []),
    ...(clothsData?.data || []),
    ...mockProductsForStore
  ];

  // Deduplicate by item ID / objectID and ensure valid product object (strictly excluding store records and store name items)
  const uniqueItemsMap = new Map();
  rawCombinedDocs.forEach(item => {
    if (!item) return;

    // Strictly filter out store records or items named after the store itself
    if (item.recordType === 'store' || item.type === 'store' || item._collection === 'stores' || item.isStore === true) {
      return;
    }

    const itemName = String(item.name || item.title || '').trim().toLowerCase();
    if (!itemName) return;

    const currentStoreName = String(store?.store || store?.name || rawStoreName || '').trim().toLowerCase();
    const currentTargetStoreName = targetStoreName ? targetStoreName.toLowerCase() : '';

    if ((currentStoreName && itemName === currentStoreName) || (currentTargetStoreName && itemName === currentTargetStoreName)) {
      return;
    }

    const itemId = item.id || item.objectID || item._id || item.productId;
    if (itemId && !uniqueItemsMap.has(itemId)) {
      uniqueItemsMap.set(itemId, { ...item, id: itemId });
    }
  });
  const allCollectionDocs = Array.from(uniqueItemsMap.values());

  const matchedStoreProducts = allCollectionDocs.filter(item => {
    if (!item) return false;
    
    const itemStore = String(item.store || (item as any).storeName || '').trim();
    const itemStoreLower = itemStore.toLowerCase();
    const itemStoreId = String(item.storeId || '').toLowerCase().trim();
    const itemBrand = String((item as any).brand || (item as any).pbrand || '').toLowerCase().trim();
    const itemFBrand = String((item as any).FBrand || '').toLowerCase().trim();
    const itemLBrand = String((item as any).LBrand || '').toLowerCase().trim();
    const itemPBrand = String((item as any).pbrand || '').toLowerCase().trim();

    const fromProdStore = String(fromProduct?.store || '').toLowerCase().trim();
    const fromProdStoreId = String(fromProduct?.storeId || '').toLowerCase().trim();
    const rawStoreNameLower = rawStoreName.toLowerCase();

    const matchesName = Boolean(
      itemStore === rawStoreName ||
      (itemStoreLower && itemStoreLower === rawStoreNameLower) ||
      (itemStoreLower && targetStoreName && itemStoreLower === targetStoreName) ||
      (itemStoreLower && rawStoreNameLower.length > 2 && itemStoreLower.includes(rawStoreNameLower)) ||
      (itemStoreLower && rawStoreNameLower.length > 2 && rawStoreNameLower.includes(itemStoreLower)) ||
      (itemFBrand && rawStoreNameLower.includes(itemFBrand)) ||
      (itemLBrand && rawStoreNameLower.includes(itemLBrand)) ||
      (itemPBrand && rawStoreNameLower.includes(itemPBrand))
    );

    const matchesId = Boolean(
      (targetStoreId && itemStoreId === targetStoreId) ||
      (targetStoreId && itemStoreLower === targetStoreId) ||
      (targetStoreId && itemBrand === targetStoreId) ||
      (targetStoreId && itemFBrand === targetStoreId) ||
      (targetStoreId && itemLBrand === targetStoreId)
    );

    const matchesFromProduct = Boolean(
      fromProduct && (
        item.id === fromProduct.id ||
        (fromProdStore && (itemStoreLower === fromProdStore || itemStoreLower.includes(fromProdStore) || fromProdStore.includes(itemStoreLower))) ||
        (fromProdStoreId && (itemStoreId === fromProdStoreId || itemStoreLower === fromProdStoreId))
      )
    );

    return matchesName || matchesId || matchesFromProduct;
  });

  // Strict products list: Show items belonging to this specific store only
  let products = matchedStoreProducts;

  if (products.length === 0 && fromProduct) {
    const fromProdStore = String(fromProduct?.store || '').toLowerCase().trim();
    const fromProdStoreId = String(fromProduct?.storeId || '').toLowerCase().trim();
    if (fromProdStore === targetStoreName || (targetStoreId && fromProdStoreId === targetStoreId)) {
      products = [fromProduct];
    }
  }

  // Strictly return NO items inside if store is not yet registered in foodStores Firestore collection
  if (!isCheckingRegistration && !isRegisteredInFoodStores) {
    products = [];
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

  // Categories of store-specific items
  const productCategories = Array.from(new Set(products.filter(p => p && p.category).map((p) => p.category)));

  // Filter products safely
  const filteredProducts = products.filter((p) => {
    if (!p) return false;
    const categoryMatch = !selectedProductCategory || p.category === selectedProductCategory;
    const pName = String(p.name || '').toLowerCase();
    const pDesc = String(p.description || '').toLowerCase();
    const q = String(productSearch || '').toLowerCase();
    const searchMatch = pName.includes(q) || pDesc.includes(q);
    return categoryMatch && searchMatch;
  });

  // Intersection Observer & Scroll Listener for Menu items infinite scroll
  useEffect(() => {
    if (activeTab !== 'menu' || !menuLoadMoreRef.current) return;
    const sentinel = menuLoadMoreRef.current;
    const scrollParent = getScrollParent(sentinel);

    const checkAndLoadMore = () => {
      if (productVisibleCount >= filteredProducts.length) return;
      const sentinelRect = sentinel.getBoundingClientRect();
      const parentBottom = scrollParent === window 
        ? window.innerHeight 
        : (scrollParent as HTMLElement).getBoundingClientRect().bottom;

      if (sentinelRect.top <= parentBottom + 800) {
        setProductVisibleCount((prev) => Math.min(prev + 20, filteredProducts.length));
      }
    };

    // Immediate check on mount / count update
    checkAndLoadMore();

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          checkAndLoadMore();
        }
      },
      { 
        root: scrollParent === window ? null : (scrollParent as Element),
        rootMargin: '800px 0px 800px 0px',
        threshold: 0
      }
    );

    observer.observe(sentinel);
    const scrollTarget = scrollParent === window ? window : (scrollParent as HTMLElement);
    scrollTarget.addEventListener('scroll', checkAndLoadMore, { passive: true });

    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', checkAndLoadMore);
    };
  }, [activeTab, filteredProducts.length, productVisibleCount]);

  // Intersection Observer & Scroll Listener for Gallery items infinite scroll
  useEffect(() => {
    if (activeTab !== 'gallery' || !galleryLoadMoreRef.current) return;
    const sentinel = galleryLoadMoreRef.current;
    const scrollParent = getScrollParent(sentinel);
    const totalGalleryItems = products.length + (store?.gallery?.length || 0);

    const checkAndLoadMore = () => {
      if (galleryVisibleCount >= totalGalleryItems) return;
      const sentinelRect = sentinel.getBoundingClientRect();
      const parentBottom = scrollParent === window 
        ? window.innerHeight 
        : (scrollParent as HTMLElement).getBoundingClientRect().bottom;

      if (sentinelRect.top <= parentBottom + 800) {
        setGalleryVisibleCount((prev) => Math.min(prev + 20, totalGalleryItems));
      }
    };

    // Immediate check on mount / count update
    checkAndLoadMore();

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          checkAndLoadMore();
        }
      },
      { 
        root: scrollParent === window ? null : (scrollParent as Element),
        rootMargin: '800px 0px 800px 0px',
        threshold: 0
      }
    );

    observer.observe(sentinel);
    const scrollTarget = scrollParent === window ? window : (scrollParent as HTMLElement);
    scrollTarget.addEventListener('scroll', checkAndLoadMore, { passive: true });

    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', checkAndLoadMore);
    };
  }, [activeTab, products.length, store?.gallery?.length, galleryVisibleCount]);

  // Loading state skeleton that closely resembles the page content layout
  if (isStoreLoading || isProductsLoading) {
    return (
      <PageContainer>
        <div className="flex w-full bg-background h-[calc(100vh-4rem)] overflow-hidden relative justify-start items-start">
          <div className="w-full flex h-full overflow-hidden relative justify-start items-start">
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
        </div>
      </PageContainer>
    );
  }

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
      toast.success('Store link copied to clipboard!');
    }
  };

  // Store rating logic matching Flutter addRatesToFoodStore
  const handleRateStore = async (stars: number) => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }

    const isGeneric = (val?: string) => !val || val === 's1' || val === 'Tulete Duka' || val === 'Tulete Dobi' || val === 'unknown';

    const storeIdToRate = realDbStore?.id || 
      (!isGeneric(store?.id) ? store.id : undefined) || 
      (!isGeneric(targetStoreId) ? targetStoreId : undefined) || 
      (!isGeneric(id) ? decodedId : undefined) || 
      rawStoreName;

    if (!storeIdToRate || isSubmittingStoreRating) return;

    setIsSubmittingStoreRating(true);
    setStoreUserRating(stars);

    try {
      const docRef = doc(db, 'foodStores', storeIdToRate);
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

      queryClient.invalidateQueries({ queryKey: ['store'] });
      queryClient.invalidateQueries({ queryKey: ['store_by_name'] });

      toast.success('Thanks, Rated');
    } catch (err) {
      console.error('Error rating store:', err);
      toast.error('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmittingStoreRating(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex w-full bg-background relative lg:h-[calc(100vh-4rem)] items-stretch overflow-visible lg:overflow-hidden justify-start">
        <div className="w-full flex h-full overflow-visible lg:overflow-hidden relative justify-start items-stretch">
        
        {/* ── LEFT SIDEBAR (CATEGORIES) ── */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <button 
            onClick={() => navigate('/explore?map=true', { state: { showMap: true } })} 
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
        <div className="flex-auto min-w-0 max-w-full h-auto lg:h-full overflow-visible lg:overflow-y-auto scrollbar-none pt-6 pb-32 xl:pb-28 px-4 lg:px-8 xl:px-10 space-y-8">
          {/* Mobile Back Header */}
          <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between py-3 mb-6">
            <button onClick={() => navigate('/explore?map=true', { state: { showMap: true } })} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

      {/* Hero Banner details */}
      <div 
        onClick={() => store?.imgURL && openImageViewer([{ imgUrl: store.imgURL, title: store.store, rating: store.rating, reviewCount: store.reviewCount, category: store.cat || store.category, isProduct: false }], 0)}
        className="relative h-60 md:h-72 rounded-3xl overflow-hidden mb-6 shadow-md border border-border bg-slate-100 dark:bg-slate-900 cursor-pointer group"
      >
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
              <h1 className="notranslate text-xl md:text-2xl font-extrabold text-white" translate="no">{store.store}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md border border-white/10">
              <Star className="w-4 h-4 fill-primary stroke-primary text-primary" />
              <span>{store.rating > 0 ? store.rating : 'New'}</span>
              <span className="text-slate-400 font-normal">({store.reviewCount > 0 ? `${store.reviewCount} Reviews` : 'New Store'})</span>
            </div>

            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md border border-white/10">
              <span className="text-slate-300 font-bold mr-0.5">Rate Me Please:</span>
              <div className="flex items-center gap-0.5" onMouseLeave={() => setStoreHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRateStore(star);
                    }}
                    onMouseEnter={() => setStoreHoverRating(star)}
                    disabled={isSubmittingStoreRating}
                    className="p-0.5 rounded hover:scale-125 transition-transform cursor-pointer disabled:opacity-50"
                    title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 transition-colors ${
                        (storeHoverRating || storeUserRating) >= star
                          ? 'fill-primary stroke-primary text-primary'
                          : 'text-slate-400/60'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
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
            {isCheckingRegistration ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 bg-card border border-border rounded-3xl">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs font-extrabold">Verifying store registration on Tulete platform...</p>
              </div>
            ) : !isRegisteredInFoodStores ? (
              <div className="p-8 md:p-12 text-center rounded-3xl bg-amber-500/10 border border-amber-500/30 dark:bg-amber-950/20 shadow-lg space-y-4 my-2">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-xl font-extrabold text-foreground">
                    Store Not Registered on Tulete
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground font-medium leading-relaxed">
                    This store is not yet registered in our official <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono font-bold text-foreground">foodStores</code> directory on the Tulete platform.
                  </p>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Items, services, and online ordering are currently unavailable for this store until the merchant completes registration.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <Badge className="bg-amber-500 text-white border-0 px-4 py-1.5 rounded-full text-xs font-extrabold shadow-sm">
                    Unregistered Merchant
                  </Badge>
                  <Button 
                    onClick={() => navigate('/explore?map=true', { state: { showMap: true } })} 
                    variant="outline" 
                    className="rounded-full text-xs font-bold px-4 hover:bg-muted"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Discovery
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Store search bar & categories horizontal filter */}
                <div className="sticky top-16 lg:top-0 z-40 !mt-0 flex flex-col sm:flex-row gap-3 py-3 -mx-2 px-2 bg-background/85 dark:bg-background/75 backdrop-blur-3xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/80 border-b border-border/30 transition-all">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search items here..."
                      className="pl-10 bg-card/75 dark:bg-card/60 backdrop-blur-xl border-border/80 rounded-2xl shadow-md"
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
                  productSearch ? (
                    <div className="text-center py-12 bg-card border border-border rounded-3xl p-6 space-y-2">
                      <Search className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <h4 className="font-extrabold text-foreground text-sm">No items found matching "{productSearch}"</h4>
                      <p className="text-xs text-muted-foreground">Try adjusting your search filter or clear the search input.</p>
                      <button 
                        onClick={() => setProductSearch('')}
                        className="text-xs text-primary font-bold hover:underline pt-1 cursor-pointer"
                      >
                        Clear search filter
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-14 bg-card border border-border rounded-3xl p-8 space-y-3 shadow-xs">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                        <ShoppingBag className="w-8 h-8 stroke-1.5" />
                      </div>
                      <div className="max-w-md mx-auto space-y-1.5">
                        <h4 className="font-extrabold text-foreground text-base">No Items Registered Yet</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          This store is registered on Tulete, but hasn't added any items or products to its catalog yet.
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground/80 font-medium">Please check back soon for catalog updates!</p>
                    </div>
                  )
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredProducts.slice(0, productVisibleCount).map((prod) => (
                        <StoreProductCardItem 
                          key={prod.id || prod.foodId || prod.docId} 
                          prod={prod} 
                          store={store} 
                          cartItems={cartItems} 
                          updateQuantity={updateQuantity} 
                          addToCart={addToCart} 
                        />
                      ))}
                    </div>

                    {/* Scroll Sentinel & Loading / Completion status for Menu */}
                    <div ref={menuLoadMoreRef} className="py-6 flex flex-col items-center justify-center">
                      {productVisibleCount < filteredProducts.length ? (
                        <button
                          onClick={() => setProductVisibleCount((prev) => prev + 20)}
                          className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-5 py-2.5 rounded-full transition-all shadow-xs cursor-pointer"
                        >
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span>Load More Items ({filteredProducts.length - productVisibleCount} remaining)</span>
                        </button>
                      ) : filteredProducts.length > 20 ? (
                        <p className="text-xs text-muted-foreground font-medium">
                          Showing all {filteredProducts.length} items
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
              </>
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
            <div className="flex flex-col md:flex-row gap-6 items-center bg-muted border border-border p-6 rounded-2xl">
              <div className="text-center md:border-r border-border pr-6">
                <h2 className="text-5xl font-extrabold text-foreground">{store.rating}</h2>
                <div className="flex items-center justify-center gap-0.5 mt-2 mb-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-primary stroke-primary text-primary" />
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
                    <Star className="w-3 h-3 fill-primary stroke-primary text-primary" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: row.pct }} />
                    </div>
                    <span className="w-8 text-right font-medium">{row.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews List */}
            {(store.reviews || []).length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-3xl p-6 space-y-2">
                <Star className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <h4 className="font-extrabold text-sm text-foreground">No Reviews Yet</h4>
                <p className="text-xs text-muted-foreground">Be the first customer to rate and review this store!</p>
              </div>
            ) : (
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
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-primary stroke-primary text-primary' : 'text-slate-350'}`} />
                      ))}
                    </div>

                    <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                      {rev.comment}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gallery & Promotions tab */}
        {activeTab === 'gallery' && (() => {
          // Filter items offered by store with top ratings (>3.8) and valid image
          const topRatedItems = products.filter((prod) => {
            if (!prod) return false;
            const img = prod.imgUrl || prod.imgURL || (Array.isArray(prod.images) && prod.images[0]);
            if (!img) return false;
            const { rating } = getNormalizedRating(prod);
            return rating > 3.8;
          }).sort((a, b) => getNormalizedRating(b).rating - getNormalizedRating(a).rating);

          // Combined gallery objects for rich interactive viewer modal
          const allGalleryObjects = [
            ...topRatedItems.map(p => {
              const subSub = p.subSubCat || p.subSubCategory || p.speccat || p.subsubcat;
              const sub = p.subCat || p.subCategory || p.scat || p.subcat;
              const cat = p.cat || p.category;

              const specificCat = (() => {
                if (subSub && typeof subSub === 'string' && !['product', 'products'].includes(subSub.trim().toLowerCase())) return subSub.trim();
                if (sub && typeof sub === 'string' && !['product', 'products'].includes(sub.trim().toLowerCase())) return sub.trim();
                if (cat && typeof cat === 'string' && !['product', 'products'].includes(cat.trim().toLowerCase())) return cat.trim();
                const sCat = store.subCat || store.cat || store.category;
                if (sCat && typeof sCat === 'string' && !['product', 'products'].includes(sCat.trim().toLowerCase())) return sCat.trim();
                return cat || store.cat || store.category || 'Item';
              })();

              const pCat = (specificCat === 'Nguo' || specificCat === 'nguo') ? 'Laundry' : specificCat;
              const isLaundry = isLaundryItem(p) || pCat === 'Laundry' || p._collection === 'cloths' || p.recordType === 'cloth';
              const priceWithDelivery = getItemPriceWithDelivery(
                p.price || 0,
                currentLocation,
                p.location || store.location,
                store.id || p.storeId || store.store,
                isLaundry,
                true,
                pCat
              );

              return {
                imgUrl: p.imgUrl || p.imgURL || (Array.isArray(p.images) && p.images[0]),
                title: p.name || p.title || 'Top Rated Item',
                rating: getNormalizedRating(p).rating,
                reviewCount: getNormalizedRating(p).reviewCount,
                price: priceWithDelivery,
                basePrice: p.price || 0,
                category: pCat,
                product: {
                  ...p,
                  price: priceWithDelivery,
                  basePrice: p.price || 0,
                },
                isProduct: true,
              };
            }),
            ...(store.gallery || []).map(imgUrl => ({
              imgUrl,
              title: `${store.store} Photo`,
              rating: store.rating,
              reviewCount: store.reviewCount,
              category: store.cat || store.category,
              isProduct: false,
            }))
          ];

          const totalGalleryCount = topRatedItems.length + (store.gallery || []).length;
          const displayedTopRatedItems = topRatedItems.slice(0, galleryVisibleCount);
          const remainingQuota = Math.max(0, galleryVisibleCount - topRatedItems.length);
          const displayedStoreGallery = (store.gallery || []).slice(0, remainingQuota);

          return (
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

              {/* Store Photo Gallery */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-border pb-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-extrabold text-sm text-foreground uppercase tracking-wider">
                      <Image className="w-4 h-4 text-primary" />
                      Store Photo Gallery
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Top-rated items &amp; store highlights
                    </p>
                  </div>
                  {topRatedItems.length > 0 && (
                    <Badge className="bg-primary/10 text-primary border border-primary/30 text-xs font-bold px-3 py-1 self-start sm:self-auto rounded-full flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-primary stroke-primary text-primary" />
                      {topRatedItems.length} Top Rated Items
                    </Badge>
                  )}
                </div>

                {topRatedItems.length === 0 && (store.gallery || []).length === 0 ? (
                  <div className="text-center py-12 bg-muted/50 border border-border rounded-2xl p-6">
                    <Image className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm font-bold text-foreground">No gallery photos yet</p>
                    <p className="text-xs text-muted-foreground">Photos of top-rated items will appear here as ratings are added.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                      {/* Top Rated Items Photo Cards (Paginated) */}
                      {displayedTopRatedItems.map((prod, i) => {
                        const img = prod.imgUrl || prod.imgURL || (Array.isArray(prod.images) && prod.images[0]);
                        const { rating } = getNormalizedRating(prod);
                        const prodName = prod.name || prod.title || 'Top Rated Item';
                        
                        const subSub = prod.subSubCat || prod.subSubCategory || prod.speccat || prod.subsubcat;
                        const sub = prod.subCat || prod.subCategory || prod.scat || prod.subcat;
                        const cat = prod.cat || prod.category;

                        const specificCat = (() => {
                          if (subSub && typeof subSub === 'string' && !['product', 'products'].includes(subSub.trim().toLowerCase())) return subSub.trim();
                          if (sub && typeof sub === 'string' && !['product', 'products'].includes(sub.trim().toLowerCase())) return sub.trim();
                          if (cat && typeof cat === 'string' && !['product', 'products'].includes(cat.trim().toLowerCase())) return cat.trim();
                          const sCat = store.subCat || store.cat || store.category;
                          if (sCat && typeof sCat === 'string' && !['product', 'products'].includes(sCat.trim().toLowerCase())) return sCat.trim();
                          return cat || store.cat || store.category || 'Item';
                        })();
                        
                        const pCat = (specificCat === 'Nguo' || specificCat === 'nguo') ? 'Laundry' : specificCat;
                        const isLaundry = isLaundryItem(prod) || pCat === 'Laundry' || prod._collection === 'cloths' || prod.recordType === 'cloth';
                        const dynamicP = getItemPriceWithDelivery(
                          prod.price || 0,
                          currentLocation,
                          prod.location || store.location,
                          store.id || prod.storeId || store.store,
                          isLaundry,
                          true,
                          pCat
                        );

                        return (
                          <div
                            key={`top_item_${prod.id || i}`}
                            onClick={() => openImageViewer(allGalleryObjects, i)}
                            className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl bg-card border border-border cursor-pointer transition-all duration-300 hover:-translate-y-1"
                          >
                            <img 
                              src={img} 
                              alt={prodName} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400";
                              }}
                            />
                            {/* Bottom Compact Gradient Overlay Tint */}
                            <div className="absolute inset-x-0 -bottom-1 h-1/4 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none transition-opacity duration-300 rounded-b-2xl" />

                            {/* Top Badges */}
                            <div className="absolute top-2.5 inset-x-2.5 flex justify-between items-center gap-1">
                              <span className="bg-background/85 dark:bg-black/60 backdrop-blur-md font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-border/40 flex items-center gap-1 shadow-sm">
                                <Star className="w-3 h-3 fill-primary stroke-primary text-primary" />
                                <span className="text-slate-900 dark:text-white font-extrabold">{rating.toFixed(1)}</span>
                              </span>
                              {pCat && (
                                <span className="bg-black/50 backdrop-blur-md text-white/90 font-bold text-[9px] px-2 py-0.5 rounded-full truncate max-w-[90px]" title={pCat}>
                                  {pCat}
                                </span>
                              )}
                            </div>

                            {/* Bottom Info Overlay */}
                            <div className="absolute bottom-2.5 inset-x-2.5 text-white">
                              <p className="font-extrabold text-xs line-clamp-1 group-hover:text-primary transition-colors drop-shadow">
                                {prodName}
                              </p>
                              {dynamicP > 0 && (
                                <p className="text-[11px] font-bold text-slate-200 mt-0.5 drop-shadow">
                                  {formatPrice(dynamicP)} {APP_SETTINGS.currency}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* General Store Gallery Photos (Paginated) */}
                      {displayedStoreGallery.map((imgUrl, i) => {
                        const viewerIdx = topRatedItems.length + i;
                        return (
                          <div 
                            key={`store_gal_${i}`} 
                            className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl bg-card border border-border cursor-pointer transition-all duration-300 hover:-translate-y-1"
                            onClick={() => openImageViewer(allGalleryObjects, viewerIdx)}
                          >
                            <img 
                              src={imgUrl} 
                              alt={`Gallery ${i}`} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            {/* Bottom Compact Gradient Overlay Tint */}
                            <div className="absolute inset-x-0 -bottom-1 h-1/5 bg-gradient-to-t from-black/55 to-transparent pointer-events-none transition-opacity duration-300 rounded-b-2xl" />
                            <div className="absolute bottom-2.5 left-2.5 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-white font-semibold">
                              Store Photo
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Scroll Sentinel & Loading / Completion status for Gallery */}
                    <div ref={galleryLoadMoreRef} className="py-6 flex flex-col items-center justify-center">
                      {galleryVisibleCount < totalGalleryCount ? (
                        <button
                          onClick={() => setGalleryVisibleCount((prev) => prev + 20)}
                          className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-5 py-2.5 rounded-full transition-all shadow-xs cursor-pointer"
                        >
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span>Load More Photos ({totalGalleryCount - galleryVisibleCount} remaining)</span>
                        </button>
                      ) : totalGalleryCount > 20 ? (
                        <p className="text-xs text-muted-foreground font-medium">
                          Showing all {totalGalleryCount} gallery photos
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
      </div>

      {/* ── RIGHT SIDEBAR (LIVE CART) ── */}
      <div className="hidden xl:block flex-none w-[320px] shrink-0 border-l border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-6">
            
            {/* CART WIDGET */}
            <CartWidget onCheckout={handleCheckout} />

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

        {/* ── INTERACTIVE IMAGE VIEWER MODAL ── */}
        <AnimatePresence>
          {viewerOpen && viewerItems.length > 0 && (() => {
            const currentItem = viewerItems[viewerIndex] || viewerItems[0];
            const currentProd = currentItem?.product;
            const currentImg = currentItem?.imgUrl || currentItem?.imgURL || store.imgURL;
            const isProd = Boolean(currentItem?.isProduct && currentProd);
            const productId = currentProd ? String(currentProd.id || currentProd.foodId || currentProd.docId || '') : '';
            
            const cartItem = isProd && productId ? cartItems.find((ci: any) => ci.productId === productId) : null;
            const itemCat = currentProd ? (currentProd.cat || currentProd.category || 'Product') : (currentItem?.category || store.category);

            const handleViewDetails = () => {
              if (productId && productId !== 'undefined') {
                setViewerOpen(false);
                navigate(`/product/${encodeURIComponent(productId)}`, { state: { product: currentProd } });
              }
            };

            const handleAddToCart = () => {
              if (!isProd || !productId) return;
              const itemPriceWithFee = currentItem?.price || currentProd?.price || 0;
              const baseItemPrice = currentItem?.basePrice || currentProd?.basePrice || currentProd?.price || 0;
              addToCart({
                productId: productId,
                name: currentProd.name || currentProd.title || 'Item',
                price: itemPriceWithFee,
                basePrice: baseItemPrice,
                imageUrl: currentImg,
                storeId: store.id,
                storeName: store.store,
                cat: itemCat,
                location: currentProd.location || store.location,
                idadi: currentProd.quantity !== undefined ? currentProd.quantity : (currentProd as any)?.idadi,
                maxQuantity: currentProd.quantity !== undefined ? currentProd.quantity : (currentProd as any)?.idadi,
              });
              toast.success(`Added ${currentProd.name || 'Item'} to cart`);
            };

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-8"
                onClick={() => setViewerOpen(false)}
              >
                <div 
                  className="relative w-full max-w-5xl h-full max-h-[90vh] flex flex-col justify-between overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between z-20 text-white bg-black/40 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                        {viewerIndex + 1} / {viewerItems.length}
                      </span>
                      <span className="font-extrabold text-sm truncate max-w-[160px] sm:max-w-md">
                        {currentItem?.title || store.store}
                      </span>
                    </div>

                    {/* Zoom & Action Controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewerZoom((prev) => Math.max(1, prev - 0.5))}
                        disabled={viewerZoom <= 1}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white disabled:opacity-40 cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setViewerZoom(1)}
                        className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-extrabold text-white transition-all cursor-pointer min-w-[50px] text-center"
                        title="Reset Zoom"
                      >
                        {Math.round(viewerZoom * 100)}%
                      </button>

                      <button
                        onClick={() => setViewerZoom((prev) => Math.min(3.5, prev + 0.5))}
                        disabled={viewerZoom >= 3.5}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white disabled:opacity-40 cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setViewerOpen(false)}
                        className="p-2 rounded-full bg-white/10 hover:bg-rose-500/80 transition-all text-white ml-2 cursor-pointer"
                        title="Close Viewer (Esc)"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Main Display Area with Prev/Next buttons & Zoom support */}
                  <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden group/main">
                    {/* Previous Button */}
                    {viewerItems.length > 1 && (
                      <button
                        onClick={() => setViewerIndex((prev) => (prev - 1 + viewerItems.length) % viewerItems.length)}
                        className="absolute left-2 md:left-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
                        title="Previous Image"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                    )}

                    {/* Image with Zoom */}
                    <motion.img
                      key={currentImg}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: viewerZoom }}
                      transition={{ duration: 0.2 }}
                      src={currentImg}
                      alt={currentItem?.title || 'Preview'}
                      onWheel={(e) => {
                        if (e.deltaY < 0) {
                          setViewerZoom((prev) => Math.min(prev + 0.25, 3.5));
                        } else {
                          setViewerZoom((prev) => Math.max(prev - 0.25, 1));
                        }
                      }}
                      onClick={() => setViewerZoom((prev) => (prev > 1 ? 1 : 2))}
                      className={`max-h-full max-w-full object-contain rounded-2xl shadow-2xl transition-transform duration-200 ${
                        viewerZoom > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                      }`}
                    />

                    {/* Next Button */}
                    {viewerItems.length > 1 && (
                      <button
                        onClick={() => setViewerIndex((prev) => (prev + 1) % viewerItems.length)}
                        className="absolute right-2 md:right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
                        title="Next Image"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    )}
                  </div>

                  {/* Bottom Action HUD Bar */}
                  <div className="z-20 bg-black/60 backdrop-blur-xl border border-white/15 p-4 rounded-3xl text-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-base md:text-lg text-white truncate">
                          {currentItem?.title || 'Gallery Preview'}
                        </h3>
                        {currentItem?.rating && (
                          <Badge className="bg-background/80 dark:bg-white/10 border-border/40 text-xs font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-primary stroke-primary text-primary" />
                            <span className="text-slate-900 dark:text-white font-extrabold">{currentItem.rating.toFixed(1)}</span>
                          </Badge>
                        )}
                        {currentItem?.category && (
                          <Badge className="bg-white/10 text-white/90 border-white/20 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                            {currentItem.category === 'Nguo' || currentItem.category === 'nguo' ? 'Laundry' : currentItem.category}
                          </Badge>
                        )}
                      </div>
                      {currentItem?.price > 0 && (
                        <p className="text-sm font-extrabold text-emerald-400">
                          {formatPrice(currentItem.price)} {APP_SETTINGS.currency}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 shrink-0">
                      {isProd && productId && (
                        <Button
                          onClick={handleViewDetails}
                          variant="outline"
                          className="rounded-2xl border-white/30 text-white bg-white/10 hover:bg-white/20 font-bold text-xs px-4 py-2.5 flex items-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Details
                        </Button>
                      )}

                      {isProd && productId && (
                        cartItem && cartItem.quantity > 0 ? (
                          <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-2xl border border-white/20">
                            <button
                              onClick={() => updateQuantity(productId, cartItem.quantity - 1)}
                              className="w-7 h-7 rounded-xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-extrabold text-sm px-1">{cartItem.quantity}</span>
                            <button
                              onClick={() => updateQuantity(productId, cartItem.quantity + 1)}
                              className="w-7 h-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            onClick={handleAddToCart}
                            className="rounded-2xl bg-primary text-primary-foreground font-extrabold text-xs px-5 py-2.5 shadow-lg flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            Add to Cart
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </PageContainer>
  );
};
