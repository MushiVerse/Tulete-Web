import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, SlidersHorizontal, Tag, ShoppingBag } from 'lucide-react';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { searchTuleteItems } from '../../../core/services/algoliaService';
import { Product } from '../../products/services/productService';
import { useCartStore } from '../../cart/store/useCartStore';
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

export const BrandDetailsView: React.FC<BrandDetailsViewProps> = ({ brandName, categoryParam, searchQuery, onBack }) => {
  
  // Filter states
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(categoryParam === 'product' ? 4000000 : 40000);
  const [showAvailable, setShowAvailable] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      // We can use the searchQuery, and optionally a filter if faceting is enabled
      const results = await searchTuleteItems(searchQuery, `brand:"${brandName}"`);
      
      // Local filtering for price and availability
      const filtered = results.filter((item: any) => {
        if (item.price < minPrice || item.price > maxPrice) return false;
        if (item.availability === false || item.availability === 'false' || item.available === false || item.isAvailable === false) return false;
        // Verify brand locally just in case faceting isn't configured in Algolia yet
        const bVal = String(item.brand || item.pbrand || item.FBrand || item.LBrand || item.store || '').toLowerCase().trim();
        const tVal = brandName.toLowerCase().trim();
        if (bVal && tVal && !bVal.includes(tVal) && !tVal.includes(bVal)) return false;
        return true;
      }).map((item: any) => {
        const { rating, reviewCount } = getNormalizedRating(item);
        const resolvedImg = item.imgUrl || item.imgURL || item.image || item.imageUrl || (Array.isArray(item.images) ? item.images[0] : '') || (Array.isArray(item.imgURL) ? item.imgURL[0] : '') || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
        return {
          ...item,
          id: item.objectID || item.id,
          name: item.name || item.title || 'Brand Item',
          imgUrl: typeof resolvedImg === 'string' ? resolvedImg : (Array.isArray(resolvedImg) ? resolvedImg[0] : ''),
          rating,
          reviewCount
        };
      });

      setProducts(filtered);
      setIsLoading(false);
    };

    fetchProducts();
  }, [brandName, searchQuery, minPrice, maxPrice, showAvailable]);

  const { addToCart } = useCartStore();
  const { user } = useAuthStore();
  const { isFavorited, toggleFavorite: toggleProductFavorite } = useFavoritesStore();

  const handleProductFav = (p: Product) => {
    toggleProductFavorite(user?.id || 'guest_user', {
      type: 'product',
      itemId: p.id,
      name: p.name,
      description: p.description || '',
      imageUrl: p.imgUrl || '',
      price: p.price,
      rating: p.rating,
      reviewCount: p.reviewCount,
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
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight line-clamp-1">
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
            <Tag className="w-5 h-5 text-primary" /> Brand Items ({products.length})
          </h2>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch">
            <AnimatePresence>
              {products.map((product: any) => (
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
        )}
      </div>

    </div>
  );
};
