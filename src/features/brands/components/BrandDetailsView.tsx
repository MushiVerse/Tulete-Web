import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, SlidersHorizontal, Tag, ShoppingBag, Loader2 } from 'lucide-react';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { searchTuleteItems } from '../../../core/services/algoliaService';
import { Product } from '../../products/services/productService';
import { useCartStore, isLaundryItem, isFoodItem } from '../../cart/store/useCartStore';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { useFavoritesStore } from '../../favorites/hooks/useFavoritesStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { getNormalizedRating } from '../../../shared/utils/ratingUtils';

interface BrandDetailsViewProps {
  brandName: string;
  categoryParam: string;
  searchQuery: string;
  onBack: () => void;
}

export const BrandDetailsView: React.FC<BrandDetailsViewProps> = ({ brandName: rawBrandName, categoryParam, searchQuery, onBack }) => {
  // Sanitize brandName to strip any Google Translate markup or unexpected HTML tags
  const brandName = React.useMemo(() => {
    if (!rawBrandName) return '';
    return String(rawBrandName).replace(/<[^>]*>/g, '').trim();
  }, [rawBrandName]);

  // Filter states
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(40000000);
  const [showAvailable, setShowAvailable] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination & infinite scroll state (20 items initially, loads +20 on scroll)
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Reset visibleCount whenever filters or brand change
  useEffect(() => {
    setVisibleCount(20);
  }, [brandName, searchQuery, minPrice, maxPrice, showAvailable]);

  React.useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      const escapedBrand = brandName.replace(/"/g, '\\"');
      // Fetch up to 200 hits for the brand from Algolia so we can paginate locally in batches of 20
      let results = await searchTuleteItems(searchQuery, {
        filters: `brand:"${escapedBrand}"`,
        hitsPerPage: 200
      });
      
      // Fallback if faceting isn't configured in Algolia yet
      if (!results || results.length === 0) {
        const queryToUse = searchQuery || brandName;
        const fallbackResults = await searchTuleteItems(queryToUse, { hitsPerPage: 200 });
        results = fallbackResults;
      }
      
      // Strict local filtering for valid product data, price, availability, and brand match
      const filtered = results.filter((item: any) => {
        // Exclude dummy or invalid items missing essential fields
        const itemName = String(item.name || item.title || '').trim();
        const itemId = item.objectID || item.id;
        if (!itemId || !itemName) return false;

        // Price range filtering
        const numPrice = Number(item.price);
        if (isNaN(numPrice)) return false;
        if (minPrice > 0 && numPrice < minPrice) return false;
        if (maxPrice > 0 && numPrice > maxPrice) return false;

        // Availability filtering (when toggled on)
        if (showAvailable && (item.availability === false || item.availability === 'false' || item.available === false || item.isAvailable === false)) {
          return false;
        }

        // Strict brand matching: item must explicitly belong to brandName
        const tVal = brandName.toLowerCase().trim();
        if (tVal) {
          const bVal = String(item.brand || item.pbrand || item.FBrand || item.LBrand || item.store || item.brandName || '').toLowerCase().trim();
          if (!bVal || (!bVal.includes(tVal) && !tVal.includes(bVal))) return false;
        }

        return true;
      }).map((item: any) => {
        const { rating, reviewCount } = getNormalizedRating(item);
        const resolvedImg = item.imgUrl || item.imgURL || item.image || item.imageUrl || (Array.isArray(item.images) ? item.images[0] : '') || (Array.isArray(item.imgURL) ? item.imgURL[0] : '') || '';
        return {
          ...item,
          id: item.objectID || item.id,
          name: String(item.name || item.title).trim(),
          imgUrl: typeof resolvedImg === 'string' ? resolvedImg.trim() : (Array.isArray(resolvedImg) ? String(resolvedImg[0] || '').trim() : ''),
          rating,
          reviewCount
        };
      });

      setProducts(filtered);
      setIsLoading(false);
    };

    fetchProducts();
  }, [brandName, searchQuery, minPrice, maxPrice, showAvailable]);

  // Infinite scroll observer to load 20 more items on scroll down
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const sentinel = loadMoreRef.current;
    const scrollParent = sentinel.closest('.overflow-y-auto') || null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < products.length) {
          setVisibleCount((prev) => prev + 20);
        }
      },
      {
        root: scrollParent,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.unobserve(sentinel);
    };
  }, [products.length, visibleCount]);

  const displayedProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  const { addToCart } = useCartStore();
  const { user } = useAuthStore();
  const { isFavorited, toggleFavorite: toggleProductFavorite } = useFavoritesStore();

  const handleProductFav = (p: Product) => {
    const isLnd = isLaundryItem(p);
    const isFd = isFoodItem(p);
    toggleProductFavorite(user?.id || 'guest_user', {
      ...p,
      type: 'product',
      itemId: p.id,
      name: p.name,
      description: p.description || '',
      imageUrl: p.imgUrl || '',
      price: p.price,
      rating: p.rating,
      reviewCount: p.reviewCount,
      category: p.category || (p as any).cat || 'Product',
      cat: (p as any).cat || p.category || 'Product',
      storeId: p.storeId || (p as any).store || '',
      storeName: (p as any).storeName || (p as any).store || '',
      isLaundry: isLnd,
      isFood: isFd,
    });
  };

  const handleAddToCart = (p: Product) => {
    const cat = categoryParam === 'product' ? 'Product' : (categoryParam === 'laundry' ? 'Laundry' : 'Food');
    addToCart({
      productId: p.id,
      baseProductId: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.imgUrl,
      storeId: p.storeId,
      storeName: p.store,
      cat,
      location: p.location,
      idadi: p.idadi,
      isLaundry: cat === 'Laundry' || p.category === 'Laundry' || p.category?.toLowerCase().includes('cloth') || (p as any)._collection === 'cloths'
    });
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="notranslate text-2xl font-extrabold text-foreground tracking-tight line-clamp-1" translate="no">
              {brandName}
            </h1>
            <span className="text-xs font-medium text-muted-foreground uppercase">{categoryParam || 'Brand'}</span>
          </div>
        </div>

        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all shadow-sm ${showFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-2xl p-5 mb-2 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase">Price Range</h3>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={minPrice} 
                    onChange={e => setMinPrice(Number(e.target.value))} 
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                    placeholder="Min"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input 
                    type="number" 
                    value={maxPrice} 
                    onChange={e => setMaxPrice(Number(e.target.value))} 
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase">Status</h3>
                <label className="flex items-center gap-2 cursor-pointer h-10">
                  <input 
                    type="checkbox" 
                    checked={showAvailable} 
                    onChange={e => setShowAvailable(e.target.checked)}
                    className="rounded text-primary focus:ring-primary w-4 h-4 accent-primary" 
                  />
                  <span className="text-sm font-medium">Available Only</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" /> Brand Items{' '}
            <span className="notranslate font-extrabold" translate="no">
              ({products.length})
            </span>
          </h2>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <Skeleton key={i} className="h-[250px] w-full rounded-2xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border border-dashed rounded-3xl">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-foreground">No items found</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              We couldn't find any items matching your filters for this brand.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch">
              <AnimatePresence>
                {displayedProducts.map((product: any) => (
                  <motion.div
                    key={product.objectID || product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="h-full"
                  >
                    <ProductCard 
                      product={product}
                      isFavorite={isFavorited(product.id)}
                      onToggleFavorite={handleProductFav}
                      onAddToCart={handleAddToCart}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Scroll Sentinel & Loading / Completion status */}
            <div ref={loadMoreRef} className="py-8 flex flex-col items-center justify-center">
              {hasMore ? (
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground bg-card border border-border px-4 py-2 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Loading more 20 items...
                </div>
              ) : products.length > 20 ? (
                <p className="text-xs text-muted-foreground font-medium">
                  Showing all {products.length} products for {brandName}
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>

    </div>
  );
};

