import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Share2, Heart, Star, MapPin, Store as StoreIcon, ShieldCheck, Tag, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { PageContainer } from '../../../shared/components/layout';
import { ImageGallery } from '../../discovery/components/ImageGallery';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { useFirestoreDocument, useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { productService } from '../../products/services/productService';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { SectionWrapper } from '../../dashboard/components/SectionWrapper';
import { useCartStore } from '../../cart/store/useCartStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { useLocationStore } from '../../location/store/useLocationStore';
import { useDynamicPrice } from '../../location/hooks/useDynamicPrice';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';
import { MiniCartRow } from '../../../shared/components/MiniCartRow';
import { useThemeStore } from '../../../core/theme/useThemeStore';
import { locationService } from '../../location/services/locationService';

/* Endless Vertical Grid Section for "More of ..." */
const EndlessMoreOfSection = ({ title, items }: { title: string; items: any[] }) => {
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadNextBatch = () => {
    if (isLoadingMore || visibleCount >= items.length) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 8, items.length));
      setIsLoadingMore(false);
    }, 250);
  };

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    // Find parent scroll container (.overflow-y-auto or window)
    const scrollParent = sentinel.closest('.overflow-y-auto') || window;

    const handleScroll = () => {
      if (isLoadingMore || visibleCount >= items.length) return;
      const rect = sentinel.getBoundingClientRect();
      const parentHeight = scrollParent === window ? window.innerHeight : (scrollParent as HTMLElement).clientHeight;
      if (rect.top <= parentHeight + 400) {
        loadNextBatch();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < items.length) {
          loadNextBatch();
        }
      },
      { 
        root: scrollParent === window ? null : (scrollParent as Element),
        rootMargin: '400px' 
      }
    );

    observer.observe(sentinel);
    if (scrollParent === window) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      (scrollParent as HTMLElement).addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      observer.disconnect();
      if (scrollParent === window) {
        window.removeEventListener('scroll', handleScroll);
      } else {
        (scrollParent as HTMLElement).removeEventListener('scroll', handleScroll);
      }
    };
  }, [items.length, visibleCount, isLoadingMore]);

  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className="space-y-4 pt-4 border-t border-border/40">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {title}
        </h2>
        <span className="text-xs font-bold text-muted-foreground">
          Showing {visibleItems.length} of {items.length}
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

      {/* Scroll Trigger / Sentinel */}
      {visibleCount < items.length && (
        <div ref={loadMoreRef} className="py-6 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-primary animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" />
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
            <span>Loading more items...</span>
          </div>
        </div>
      )}
    </div>
  );
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { items: cartItems, addToCart, removeFromCart, getTotals } = useCartStore();
  
  // Subscribe to location store so price and cart total update instantly on location change
  const { currentLocation } = useLocationStore();
  
  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;
  
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useAuthModalStore();

  // Fetch specific product using decoded ID
  const { data: product, isLoading, error } = useFirestoreDocument(['product', decodedId || id || ''], productService, decodedId || id || '');

  // Determine target collection based on opened item category:
  // "products" when category === "Product"
  // "cloths" when category === "Nguo"
  // "foods" for otherwise documents
  const rawCat = (product as any)?.cat || product?.category || '';
  const rawColl = (product as any)?._collection || '';

  let targetCollection = 'foods';
  if (rawColl === 'products' || rawCat === 'Product' || rawCat === 'Products') {
    targetCollection = 'products';
  } else if (rawColl === 'cloths' || rawCat === 'Nguo' || rawCat === 'Laundry' || ['Suits', 'Bag Wash', 'Bedding'].includes(rawCat)) {
    targetCollection = 'cloths';
  } else {
    targetCollection = 'foods';
  }

  const targetSubSubCat = (product as any)?.subSubCat || (product as any)?.subSubCategory || (product as any)?.speccat;
  const targetSubCat = (product as any)?.subCat || (product as any)?.subCategory || (product as any)?.scat;
  const isLaundryProduct = targetCollection === 'cloths';

  // 1. Fetch subSubCat products from targetCollection (for Related section)
  const { data: subSubCatProducts } = useFirestoreQuery(
    ['products', 'related-subsub', targetCollection, targetSubSubCat],
    productService,
    { 
      limit: 10, 
      filters: targetSubSubCat ? [
        { field: '_collection', operator: '==', value: targetCollection },
        { field: 'subSubCat', operator: '==', value: targetSubSubCat }
      ] : undefined 
    },
    { enabled: !isLaundryProduct && !!targetSubSubCat }
  );

  // 2. Fetch subCat products from targetCollection (for More of [subCat] section)
  const { data: subCatProducts } = useFirestoreQuery(
    ['products', 'related-subcat', targetCollection, targetSubCat],
    productService,
    { 
      limit: 20, 
      filters: targetSubCat ? [
        { field: '_collection', operator: '==', value: targetCollection },
        { field: 'subCat', operator: '==', value: targetSubCat }
      ] : undefined 
    },
    { enabled: !isLaundryProduct && !!targetSubCat }
  );

  // 3. Fetch category products from targetCollection (fallback / Laundries section)
  const { data: catProducts } = useFirestoreQuery(
    ['products', 'related-cat', targetCollection, rawCat],
    productService,
    { 
      limit: 20, 
      filters: [{ field: '_collection', operator: '==', value: targetCollection }]
    },
    { enabled: true }
  );

  // Compute display product (or fallback) unconditionally
  const displayProduct = product || {
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

  const itemCat = (displayProduct as any)?.cat || displayProduct.category || 'Product';
  const isLaundryCategory = itemCat === 'Nguo' || ['Laundry', 'Suits', 'Bag Wash', 'Bedding'].includes(displayProduct.category);
  
  // Execute ALL hooks unconditionally BEFORE any early return
  const magicPrice = useDynamicPrice(displayProduct.price || 0, displayProduct.storeId, isLaundryCategory, (displayProduct as any).location, undefined, itemCat);
  const calcOldPrice = useDynamicPrice(displayProduct.oldprice || 0, displayProduct.storeId, isLaundryCategory, (displayProduct as any).location, undefined, itemCat);
  const magicOldPrice = displayProduct.oldprice ? calcOldPrice : undefined;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    navigate('/cart');
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
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate('/products')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm text-muted-foreground hover:bg-muted hover:text-foreground`}
              >
                <span className="text-xl">{cat.icon}</span>
                {cat.name}
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
              <button 
                onClick={() => setIsFavorite(!isFavorite)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
              </button>
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
                  {displayProduct.tags?.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                      {tag}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-muted-foreground">{displayProduct.category}</Badge>
                </div>
                
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
                  {displayProduct.name}
                </h1>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded text-sm font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{(displayProduct.rating ?? 0).toFixed(1)}</span>
                    <span className="text-muted-foreground text-xs ml-1">({displayProduct.reviewCount} reviews)</span>
                  </div>
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

                  const isSoldOut = qty !== undefined && qty <= 0;
                  const isUnavailable = displayProduct.availability === false;
                  const isPurchasable = !isSoldOut && !isUnavailable;

                  let buttonText = 'Add to Cart';
                  if (isSoldOut) {
                    buttonText = 'Sold Out';
                  } else if (isUnavailable) {
                    buttonText = 'Unavailable';
                  }

                  return (
                    <Button 
                      className="w-full md:w-auto mt-6 h-12 px-8 text-base font-extrabold shadow-md rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
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
                          isLaundry: isLaundryCategory,
                          location: displayProduct.location,
                          idadi: displayProduct.idadi
                        });
                      }}
                    >
                      {buttonText}
                    </Button>
                  );
                })()}
              </div>

              <div className="w-full h-px bg-border/50" />

              {/* Store Info */}
              {(() => {
                const rawStoreId = displayProduct.storeId || (displayProduct as any).brand || (displayProduct as any).pbrand || (displayProduct as any).FBrand || (displayProduct as any).store;
                const storeTargetId = rawStoreId && rawStoreId !== 'unknown' ? rawStoreId : 's1';

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
                          <h3 className="font-extrabold text-sm">{displayProduct.store}</h3>
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

          {/* ── DYNAMIC RELATED PRODUCTS (SubSubCat -> SubCat -> Cat Matching) ── */}
          {/* ── SECTIONS BELOW PRODUCT DISPLAY ── */}
          {(() => {
            const itemCat = (displayProduct as any).cat || displayProduct.category || '';
            const rawColl = (displayProduct as any)._collection || '';

            let activeCollection = 'foods';
            if (rawColl === 'products' || itemCat === 'Product' || itemCat === 'Products') {
              activeCollection = 'products';
            } else if (rawColl === 'cloths' || itemCat === 'Nguo' || itemCat === 'Laundry' || ['Suits', 'Bag Wash', 'Bedding'].includes(itemCat)) {
              activeCollection = 'cloths';
            } else {
              activeCollection = 'foods';
            }

            const isLaundry = activeCollection === 'cloths';
            const subSubVal = (displayProduct as any).subSubCat || (displayProduct as any).subSubCategory || (displayProduct as any).speccat || (displayProduct as any).subsubcat;
            const subCatVal = (displayProduct as any).subCat || (displayProduct as any).subCategory || (displayProduct as any).scat || (displayProduct as any).subcat;

            // Raw items pool from target collection
            const rawPool: any[] = [
              ...((subSubCatProducts as any)?.data || []),
              ...((subCatProducts as any)?.data || []),
              ...((catProducts as any)?.data || [])
            ];

            // Deduplicate items pool by ID and exclude displayProduct.id
            const collectionPoolMap = new Map<string, any>();
            rawPool.forEach((item) => {
              if (item && item.id && item.id !== displayProduct.id) {
                collectionPoolMap.set(item.id, item);
              }
            });
            const collectionPool = Array.from(collectionPoolMap.values());

            // 1. LAUNDRY ITEMS (category === "Nguo" or collection === "cloths"):
            // Return ONLY 1 section "Laundries" (endless vertical scroll, no sub-categorization)
            if (isLaundry) {
              const finalLaundryList = collectionPool.length > 0 ? collectionPool : Array.from({ length: 20 }).map((_, i) => ({
                ...displayProduct,
                id: `laundry-item-${i + 1}`,
                name: `Laundry Service Item ${i + 1}`,
                price: displayProduct.price + (i * 2000),
              }));

              return (
                <div className="mt-8 mb-24 lg:mb-12 space-y-10">
                  <EndlessMoreOfSection title="Laundries" items={finalLaundryList} />
                </div>
              );
            }

            // 2. NON-LAUNDRY & BOTH subSubCat AND subCat EXIST:
            // i. Related (filtered using subSubCat, HORIZONTAL SCROLL) - ONLY shown if >= 1 other real item exists
            // ii. More of [subCat] (filtered using subCat, ENDLESS VERTICAL SCROLL, NO DUPLICATE DATA)
            if (subSubVal || subCatVal) {
              // Section 1: "Related" matches subSubCat (only real items, no dummy fallbacks)
              let subSubMatches = subSubVal ? collectionPool.filter((p) => {
                const pSubSub = p.subSubCat || p.speccat || p.subsubcat || p.subSubCategory;
                return pSubSub && String(pSubSub).trim().toLowerCase() === String(subSubVal).trim().toLowerCase();
              }) : [];

              if (subSubMatches.length === 0 && subSubCatProducts?.data?.length) {
                subSubMatches = subSubCatProducts.data.filter((p: any) => p && p.id !== displayProduct.id);
              }

              // Do NOT duplicate or create dummy items; if 0 other items exist, finalSubSubList is empty
              const finalSubSubList = subSubMatches;

              const relatedIds = new Set(finalSubSubList.map((p) => p.id));

              // Section 2: "More of [subCat]" matches subCat, excluding relatedIds
              let subCatMatches = subCatVal ? collectionPool.filter((p) => {
                if (relatedIds.has(p.id)) return false;
                const pSub = p.subCat || p.subCategory || p.scat || p.subcat;
                return pSub && String(pSub).trim().toLowerCase() === String(subCatVal).trim().toLowerCase();
              }) : [];

              if (subCatMatches.length === 0) {
                subCatMatches = collectionPool.filter((p) => !relatedIds.has(p.id));
              }

              const finalSubCatList = subCatMatches;

              const mainCatLabel = subCatVal || displayProduct.category || (activeCollection === 'products' ? 'Products' : 'Foods');

              return (
                <div className="mt-8 mb-24 lg:mb-12 space-y-10">
                  {/* i. Related Section (Horizontal Scroll Carousel) */}
                  {finalSubSubList.length > 0 && subSubVal && (
                    <div>
                      <SectionWrapper title="Related" actionLink="/explore">
                        {finalSubSubList.map((prod) => (
                          <div key={prod.id} className="shrink-0 w-[170px] md:w-[210px] snap-center">
                            <ProductCard product={prod} />
                          </div>
                        ))}
                      </SectionWrapper>
                    </div>
                  )}

                  {/* ii. More of [subCat] Section (Endless Vertical Grid, Zero Duplicates) */}
                  <EndlessMoreOfSection title={`More of ${mainCatLabel}`} items={finalSubCatList} />
                </div>
              );
            }

            // 3. Fallback single section
            const mainCatLabel = displayProduct.category || (activeCollection === 'products' ? 'Products' : 'Foods');
            const finalCatList = collectionPool.length > 0 ? collectionPool : Array.from({ length: 20 }).map((_, i) => ({
              ...displayProduct,
              id: `cat-item-${i + 1}`,
              name: `${mainCatLabel} Item ${i + 1}`,
              price: Math.max(5000, displayProduct.price + ((i + 1) * 5000)),
            }));

            return (
              <div className="mt-8 mb-24 lg:mb-12 space-y-10">
                <EndlessMoreOfSection title={`More of ${mainCatLabel}`} items={finalCatList} />
              </div>
            );
          })()}
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
                  <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto scrollbar-none">
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
            
            {/* SERVICE STATS BAND */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider text-foreground">Service Stats</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { value: '50k+', label: 'Products', icon: Tag },
                  { value: '4.9★', label: 'Avg Rating', icon: Star },
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
