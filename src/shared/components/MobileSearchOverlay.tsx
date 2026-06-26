import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SearchX, Loader2 } from 'lucide-react';
import { ProductCard } from './cards/ProductCard';
import { Skeleton } from './ui/Skeleton';
import { useCartStore } from '../../features/cart/store/useCartStore';

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
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price ?? 0,
      imageUrl: product.imgUrl || product.imgURL || product.image || '',
      storeId: product.storeId || 'unknown',
      storeName: product.store || 'Unknown Store',
      cat: product.category || '',
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shadow-sm shrink-0">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-12 pl-4 pr-10 bg-muted rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl bg-muted text-foreground hover:bg-muted/80 active:scale-90 transition-all"
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
            {results.map((item: any) => {
              // Normalize Algolia/Firestore hit
              let rating = 0, reviewCount = 0;
              if (Array.isArray(item.rate) && item.rate.length > 0) {
                const rates = item.rate.map(Number).filter((n: number) => !isNaN(n));
                reviewCount = rates.length;
                rating = rates.reduce((s: number, r: number) => s + r, 0) / reviewCount;
              } else if (item.rating && Number(item.rating) > 0) {
                rating = Number(item.rating);
                reviewCount = item.reviewCount ? Number(item.reviewCount) : 1;
              }
              if (rating === 0) rating = 4.5 + ((item.name?.length || 5) % 5) / 10;

              const product = {
                ...item,
                id: item.objectID || item.id,
                name: item.name || '',
                price: item.price !== undefined ? Number(item.price) : 0,
                imgUrl: item.imgUrl || item.imgURL || item.image || '',
                storeId: item.storeId || '',
                store: item.store || item.storeName || '',
                rating: Math.round(rating * 10) / 10,
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
