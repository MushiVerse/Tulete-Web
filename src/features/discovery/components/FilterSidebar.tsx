import React, { useState, useEffect } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { useFilterStore } from '../store/useFilterStore';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CategoryGroup {
  label: string;
  type: 'food' | 'product';
  items: string[];
}

export const FilterSidebar = ({ isOpen, onClose }: FilterSidebarProps) => {
  const {
    category,
    minPrice,
    maxPrice,
    isAvailableOnly,
    sortBy,
    setCategory,
    setPriceRange,
    setAvailableOnly,
    setSortBy,
    clearAllFilters
  } = useFilterStore();

  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    food: true,
    product: true,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        const [ecomSnap, foodSnap] = await Promise.all([
          getDocs(collection(db, 'ecommerceSubCategory')),
          getDocs(collection(db, 'foodSubCategory')),
        ]);

        const productCats: string[] = [];
        ecomSnap.docs.forEach(doc => {
          const d = doc.data();
          const name = d.name || d.subCat || d.subCategory || d.category;
          if (name && typeof name === 'string') {
            const trimmed = name.trim();
            if (trimmed && !productCats.includes(trimmed)) productCats.push(trimmed);
          }
        });

        const foodCats: string[] = [];
        foodSnap.docs.forEach(doc => {
          const d = doc.data();
          const name = d.subCat || d.name || d.category || d.subCategory;
          if (name && typeof name === 'string') {
            const trimmed = name.trim();
            if (trimmed && !foodCats.includes(trimmed)) foodCats.push(trimmed);
          }
        });

        if (isMounted) {
          const groups: CategoryGroup[] = [];
          if (productCats.length > 0) {
            groups.push({ label: 'Products', type: 'product', items: productCats.sort() });
          }
          if (foodCats.length > 0) {
            groups.push({ label: 'Food & Drinks', type: 'food', items: foodCats.sort() });
          }
          setCategoryGroups(groups);
        }
      } catch (err) {
        console.warn('FilterSidebar: failed to load categories', err);
      } finally {
        if (isMounted) setLoadingCategories(false);
      }
    };

    fetchCategories();
    return () => { isMounted = false; };
  }, []);

  const sortOptions = [
    { id: 'popular', label: 'Most Popular' },
    { id: 'newest', label: 'Newest Arrivals' },
    { id: 'price_asc', label: 'Price: Low to High' },
    { id: 'price_desc', label: 'Price: High to Low' },
  ];

  const hasActiveFilters = Boolean(
    category !== null ||
    minPrice !== null ||
    maxPrice !== null ||
    isAvailableOnly ||
    sortBy !== 'popular'
  );

  const toggleGroup = (type: string) => {
    setExpandedGroups(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 z-[90] h-full w-72 md:w-80 bg-card border-r border-border
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
            <h2 className="flex items-center gap-2 font-bold text-foreground">
              <Filter className="w-5 h-5 text-primary" />
              Filters
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Bar — shown only when a filter is active */}
          {hasActiveFilters && (
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-primary/5 shrink-0">
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 border border-destructive/25 rounded-xl transition-colors shrink-0"
              >
                Reset All
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl font-bold text-xs shadow hover:bg-primary/90 transition-all"
              >
                Apply Filter
              </button>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">

            {/* Sort By */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground">Sort By</h3>
              <div className="space-y-2">
                {sortOptions.map(option => (
                  <label key={option.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="sort"
                      className="w-4 h-4 accent-primary"
                      checked={sortBy === option.id}
                      onChange={() => setSortBy(option.id as any)}
                    />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-border/60" />

            {/* Category Groups — real Firestore data */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground">Category</h3>

              {loadingCategories ? (
                <div className="space-y-4">
                  {[1, 2].map(g => (
                    <div key={g} className="space-y-2">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="h-7 w-20 bg-muted rounded-full animate-pulse" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : categoryGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">No categories available</p>
              ) : (
                <div className="space-y-4">
                  {categoryGroups.map(group => (
                    <div key={group.type}>
                      {/* Group header toggle */}
                      <button
                        onClick={() => toggleGroup(group.type)}
                        className="flex items-center justify-between w-full mb-2 group"
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                          {group.label}
                        </span>
                        {expandedGroups[group.type]
                          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </button>

                      {expandedGroups[group.type] && (
                        <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto scrollbar-thin pr-1">
                          {group.items.map(item => (
                            <button
                              key={`${group.type}-${item}`}
                              onClick={() => setCategory(category === item ? null : item)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                                category === item
                                  ? 'bg-primary border-primary text-primary-foreground shadow-sm scale-105'
                                  : 'bg-transparent border-border text-foreground hover:border-primary/60 hover:text-primary'
                              }`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border/60" />

            {/* Price Range */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground">Price Range (TZS)</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice ?? ''}
                  onChange={e => setPriceRange(e.target.value ? Number(e.target.value) : null, maxPrice)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-muted-foreground shrink-0">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice ?? ''}
                  onChange={e => setPriceRange(minPrice, e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="border-t border-border/60" />

            {/* Available Only */}
            <div>
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <span className="text-sm font-semibold text-foreground block">Availables Only</span>
                </div>
                <div
                  onClick={() => setAvailableOnly(!isAvailableOnly)}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                    isAvailableOnly ? 'bg-primary' : 'bg-muted border border-border'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isAvailableOnly ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </label>
            </div>

          </div>


        </div>
      </div>
    </>
  );
};
