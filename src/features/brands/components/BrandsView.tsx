import React, { useState } from 'react';
import { Tag, Utensils, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GridSkeleton } from '../../../shared/components/skeletons/GridSkeleton';
import { searchTuleteItems } from '../../../core/services/algoliaService';

type BrandCategoryFilter = 'food' | 'product' | null;

interface BrandsViewProps {
  onSelectBrand: (brandName: string, category: string) => void;
  searchQuery: string;
}

export const BrandsView: React.FC<BrandsViewProps> = ({ onSelectBrand, searchQuery }) => {
  const [categoryFilter, setCategoryFilter] = useState<BrandCategoryFilter>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const fetchBrands = async () => {
      setLoading(true);
      // We filter by recordType:brand, and if a category filter is active, we append it.
      let filterStr = "recordType:brand";
      if (categoryFilter) {
        // Assuming category filter is stored in 'category' field.
        filterStr += ` AND category:${categoryFilter}`;
      }
      
      const results = await searchTuleteItems(searchQuery, filterStr);
      setBrands(results);
      setLoading(false);
    };

    fetchBrands();
  }, [searchQuery, categoryFilter]);

  if (loading && brands.length === 0) {
    return <div className="p-4"><GridSkeleton /></div>;
  }

  return (
    <div className="flex flex-col w-full">
      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setCategoryFilter(categoryFilter === 'product' ? null : 'product')}
            className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all border shadow-sm ${
              categoryFilter === 'product'
                ? 'bg-emerald-500 text-white border-emerald-500 scale-105'
                : 'bg-card text-foreground border-border hover:border-emerald-500/30'
            }`}
          >
            <ShoppingBag className="w-4 h-4 opacity-80" />
            Product Brands
          </button>
          <button
            onClick={() => setCategoryFilter(categoryFilter === 'food' ? null : 'food')}
            className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all border shadow-sm ${
              categoryFilter === 'food'
                ? 'bg-primary text-primary-foreground border-primary scale-105'
                : 'bg-card text-foreground border-border hover:border-primary/30'
            }`}
          >
            <Utensils className="w-4 h-4 opacity-80" />
            Food Brands
          </button>
        </div>
      </div>

      {/* Brands Grid */}
      {brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
             <Tag className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Oops!, No brands found.</h3>
          <p className="text-sm text-muted-foreground mt-1">Can't find this brand, please try again!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
          <AnimatePresence>
            {brands.map((brand: any, i: number) => (
              <motion.div
                key={brand.objectID || brand.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                onClick={() => onSelectBrand(brand.name, brand.category || '')}
                className="flex flex-col items-center gap-3 cursor-pointer group"
              >
                <div className="w-full aspect-square rounded-3xl bg-card border border-border/50 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 group-hover:-translate-y-2 group-hover:border-primary/40 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <img 
                    src={brand.image || 'https://via.placeholder.com/150'} 
                    alt={brand.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                  />
                </div>
                <span className="notranslate text-sm font-extrabold text-center text-foreground group-hover:text-primary transition-colors line-clamp-2 px-1" translate="no">
                  {brand.name}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
