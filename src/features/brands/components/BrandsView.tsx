import React, { useState } from 'react';
import { Tag, Utensils, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GridSkeleton } from '../../../shared/components/skeletons/GridSkeleton';
import { searchTuleteItems } from '../../../core/services/algoliaService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import logoImg from '../../../assets/Green Modern Organic Health Food Logo_20260531_122513_0000.png';

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

      let filterStr = "recordType:brand";
      if (categoryFilter) {
        filterStr += ` AND category:${categoryFilter}`;
      }

      let results: any[] = [];
      try {
        results = await searchTuleteItems(searchQuery, { filters: filterStr, includeStoresAndBrands: true });
      } catch (err) {
        console.warn('Algolia search brands error:', err);
      }

      // Fallback 1: Query Firestore 'brands' collection if Algolia returns 0 items
      if (!results || results.length === 0) {
        try {
          const snapshot = await getDocs(collection(db, 'brands'));
          const firestoreBrands = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              objectID: docSnap.id,
              name: data.name || data.brand || data.title || docSnap.id,
              image: data.image || data.imgUrl || data.imgURL || data.logo || data.picture || logoImg,
              category: data.category || data.cat || 'product'
            };
          });

          results = firestoreBrands.filter((b: any) => {
            if (!b.name) return false;
            if (categoryFilter) {
              const bCat = String(b.category || '').toLowerCase();
              if (categoryFilter === 'food' && !bCat.includes('food')) return false;
              if (categoryFilter === 'product' && !bCat.includes('product') && bCat.includes('food')) return false;
            }
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase().trim();
              const name = String(b.name || '').toLowerCase();
              if (!name.includes(q)) return false;
            }
            return true;
          });
        } catch (e) {
          console.warn('Firestore brands fallback error:', e);
        }
      }

      // Fallback 2: Extract unique brands from products & foods & cloths if brands collection is empty
      if (!results || results.length === 0) {
        try {
          const collectionsToScan = [
            { colName: 'products', defaultCategory: 'product' },
            { colName: 'foods', defaultCategory: 'food' },
            { colName: 'cloths', defaultCategory: 'product' }
          ];
          const extractedMap = new Map<string, any>();

          for (const col of collectionsToScan) {
            if (categoryFilter && categoryFilter !== col.defaultCategory && col.colName !== 'products') continue;
            const snap = await getDocs(collection(db, col.colName));
            snap.docs.forEach(docSnap => {
              const d = docSnap.data();
              const brandName = d.brand || d.pbrand || d.FBrand || d.LBrand || d.brandName || d.store;
              if (brandName && typeof brandName === 'string' && brandName.trim().length > 0) {
                const cleanName = brandName.trim();
                const key = cleanName.toLowerCase();
                if (!extractedMap.has(key) && key !== 's1' && key !== 'tulete partner store') {
                  extractedMap.set(key, {
                    id: `extracted-${key}`,
                    objectID: `extracted-${key}`,
                    name: cleanName,
                    image: d.imgUrl || d.imgURL || d.image || d.logo || d.picture || logoImg,
                    category: d.category || col.defaultCategory
                  });
                }
              }
            });
          }

          let extractedBrands = Array.from(extractedMap.values());
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            extractedBrands = extractedBrands.filter(b => b.name.toLowerCase().includes(q));
          }
          if (extractedBrands.length > 0) {
            results = extractedBrands;
          }
        } catch (e) {
          console.warn('Extracted brands fallback error:', e);
        }
      }

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
            className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all border shadow-sm ${categoryFilter === 'product'
              ? 'bg-emerald-500 text-white border-emerald-500 scale-105'
              : 'bg-card text-foreground border-border hover:border-emerald-500/30'
              }`}
          >
            <ShoppingBag className="w-4 h-4 opacity-80" />
            Product Brands
          </button>
          <button
            onClick={() => setCategoryFilter(categoryFilter === 'food' ? null : 'food')}
            className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold transition-all border shadow-sm ${categoryFilter === 'food'
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
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
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
                <div className="w-fit h-fit max-w-full rounded-xl bg-card border border-border/60 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-primary/40 relative flex items-center justify-center">
                  <img
                    src={brand.image || brand.logo || brand.imgUrl || brand.imgURL || brand.picture || brand.photo || logoImg}
                    alt={brand.name}
                    className="w-auto h-auto max-w-full max-h-32 object-contain block group-hover:scale-105 transition-transform duration-500 ease-out"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== logoImg) {
                        target.src = logoImg;
                        target.className = "w-auto h-auto max-w-full max-h-32 object-contain p-2 group-hover:scale-105 transition-transform duration-500 ease-out";
                      }
                    }}
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
