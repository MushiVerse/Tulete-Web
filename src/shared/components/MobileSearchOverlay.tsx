import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, SearchX, Loader2 } from 'lucide-react';
import { ProductCard } from './cards/ProductCard';
import { Skeleton } from './ui/Skeleton';
import { useCartStore } from '../../features/cart/store/useCartStore';
import { useLocationStore } from '../../features/location/store/useLocationStore';
import { getItemPriceWithDelivery } from '../../features/location/hooks/useDynamicPrice';
import { getNormalizedRating } from '../utils/ratingUtils';

interface MobileSearchOverlayProps {
  query: string;
  onClose: () => void;
  loading: boolean;
  results: any[];
  placeholder?: string;
  onChange: (val: string) => void;
}

export const MobileSearchOverlay: React.FC<MobileSearchOverlayProps> = ({
  query,
  onClose,
  loading,
  results,
  placeholder = 'Search...',
  onChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToCart } = useCartStore();

  // Auto-focus the input when overlay opens
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const handleAddToCart = (product: any) => {
    const cat = product.cat || product.category || (product.recordType === 'cloth' ? 'Nguo' : 'Product');
    const isLaundry = cat === 'Nguo';
    const baseItemPrice = product.price ?? 0;
    addToCart({
      productId: product.id || product.objectID,
      baseProductId: product.id || product.objectID,
      name: product.name,
      price: baseItemPrice,
      basePrice: baseItemPrice,
      imageUrl: product.imgUrl || product.imgURL || product.image || '',
      storeId: product.storeId || 'unknown',
      storeName: product.store || 'Unknown Store',
      cat,
      location: product.location,
      idadi: product.idadi,
      isLaundry
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed inset-0 z-[200] bg-background flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Search Bar Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-xl shadow-sm shrink-0">
        <div className="flex-1 min-w-0 relative flex items-center h-14 px-2.5 gap-2 bg-card border-2 border-border/80 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 rounded-full shadow-md transition-all overflow-hidden">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 min-w-0 w-full h-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0 mr-1" />
          ) : query ? (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Clear search"
              className="w-7 h-7 rounded-full bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-muted border border-border text-foreground hover:bg-muted/80 active:scale-90 transition-all shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Count badge */}
      {!loading && results.length > 0 && (
        <div className="px-4 py-2 shrink-0">
          <span className="text-xs font-extrabold text-muted-foreground">
            {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
          </span>
        </div>
      )}

      {/* Scrollable Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-2">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-[220px] w-full rounded-3xl" />
            ))}
          </div>
        ) : results.length === 0 && query.trim() ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <SearchX className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-extrabold text-foreground mb-1">No results found</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Nothing matched "{query}". Try a different keyword.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {results
              .filter((item: any) => item.availability !== false && item.availability !== 'false' && item.available !== false && item.isAvailable !== false)
              .map((item: any) => {
              const { rating, reviewCount } = getNormalizedRating(item);

              const product = {
                ...item,
                id: item.objectID || item.id,
                name: item.name || '',
                price: item.price !== undefined ? Number(item.price) : 0,
                imgUrl: item.imgUrl || item.imgURL || item.image || '',
                storeId: item.storeId || '',
                store: item.store || item.storeName || '',
                rating,
                reviewCount,
                category: item.category || item.cat || '',
                tags: item.tags || [],
                availability: item.availability !== undefined ? !!item.availability : true,
              };

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <ProductCard
                    product={product}
                    onAddToCart={() => handleAddToCart(product)}
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};
