import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchX } from 'lucide-react';
import { searchTuleteItems } from '../../../core/services/algoliaService';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { useCartStore } from '../../cart/store/useCartStore';
import { useLocationStore } from '../../location/store/useLocationStore';
import { getItemPriceWithDelivery } from '../../location/hooks/useDynamicPrice';
import { getNormalizedRating } from '../../../shared/utils/ratingUtils';

interface HomeSearchResultsViewProps {
  query: string;
  filterValue: string | null;
}

export const HomeSearchResultsView: React.FC<HomeSearchResultsViewProps> = ({ query, filterValue }) => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const addToCart = useCartStore((state) => state.addToCart);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) return;
      
      setLoading(true);
      
      let filterStr = undefined;
      // We exclude brands unless filterValue is brands, but BrandsView handles brands.
      // So here we only care about non-brands, or specific categories.
      if (filterValue === 'food') {
        filterStr = `recordType:food`;
      } else if (filterValue === 'product') {
        filterStr = `recordType:product`;
      } else if (filterValue === 'laundry') {
        filterStr = `(recordType:cloth OR recordType:laundry OR category:Laundry OR category:Nguo)`;
      } else {
        filterStr = `NOT recordType:brand`;
      }

      const hits = await searchTuleteItems(query, {
        filters: filterStr,
        hitsPerPage: 20
      });
      
      const validHits = (hits || []).filter((item: any) => 
        item.availability !== false && 
        item.availability !== 'false' && 
        item.available !== false && 
        item.isAvailable !== false
      );

      setResults(validHits);
      setLoading(false);
    };

    fetchResults();
  }, [query, filterValue]);

  const handleAddToCart = (product: any) => {
    const rawCat = product.cat || product.category;
    const cat = rawCat === 'Nguo' || product.recordType === 'cloth' ? 'Nguo' : (rawCat === 'Food' || product.recordType === 'food' ? 'Food' : 'Product');
    const isLaundry = cat === 'Nguo';
    const baseItemPrice = product.price || 0;
    addToCart({
      productId: product.objectID || product.id,
      baseProductId: product.objectID || product.id,
      name: product.name,
      price: baseItemPrice,
      basePrice: baseItemPrice,
      imageUrl: product.image || product.imgURL || '',
      storeId: product.storeId || 'unknown',
      storeName: product.store || 'Unknown Store',
      cat,
      location: product.location,
      idadi: product.idadi,
      isLaundry
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Skeleton key={i} className="h-[250px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500 bg-card rounded-3xl border border-border">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
           <SearchX className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold text-foreground">No results found.</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">We couldn't find anything matching "{query}". Try adjusting your search or category filter.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      <AnimatePresence>
        {results.map((item, i) => {
          const { rating, reviewCount } = getNormalizedRating(item);
          const product = {
            ...item,
            id: item.objectID || item.id,
            imgUrl: item.imgURL || item.image || item.imgUrl || '',
            rating,
            reviewCount
          };
          
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
            >
              <ProductCard 
                product={product}
                onAddToCart={() => handleAddToCart(product)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
