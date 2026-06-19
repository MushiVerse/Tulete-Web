import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, Grid, List as ListIcon, X, Search } from 'lucide-react';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { FilterSidebar } from '../components/FilterSidebar';
import { useFilterStore } from '../store/useFilterStore';
import { searchTuleteItems } from '../../../core/services/algoliaService';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

export const DiscoveryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const urlCategory = searchParams.get('category');
  
  const { 
    category, setCategory, clearAllFilters, 
    minPrice, maxPrice, isAvailableOnly 
  } = useFilterStore();
  
  const [localQuery, setLocalQuery] = useState(query);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<any[]>([]);

  // Sync URL category to store on mount
  useEffect(() => {
    if (urlCategory && urlCategory !== category) {
      setCategory(urlCategory);
    }
  }, [urlCategory]);

  // Handle local query debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (localQuery !== query) {
        setSearchParams((prev) => {
          if (localQuery) prev.set('q', localQuery);
          else prev.delete('q');
          return prev;
        });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [localQuery, query, setSearchParams]);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      let filterStr = undefined;
      if (category) {
        filterStr = `category:"${category}"`;
      } else {
        filterStr = `NOT recordType:brand`;
      }

      // Build numeric filters
      const numericFilters: string[] = [];
      if (minPrice !== null) numericFilters.push(`price >= ${minPrice}`);
      if (maxPrice !== null) numericFilters.push(`price <= ${maxPrice}`);

      // Handle availability via filters string since it's a boolean
      if (isAvailableOnly) {
        filterStr += ` AND availability:true`;
      }
      
      const results = await searchTuleteItems(query, {
        filters: filterStr,
        numericFilters: numericFilters.length > 0 ? numericFilters : undefined
      });
      setProducts(results);
      setLoading(false);
    };
    
    fetchResults();
  }, [query, category, minPrice, maxPrice, isAvailableOnly]);

  return (
    <PageWrapper className="min-h-screen bg-background">
      <div className="flex h-full">
        {/* Sidebar Filters */}
        <FilterSidebar isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
          
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex-1 max-w-xl relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                placeholder="Search everything..."
                className="w-full h-14 pl-12 pr-4 bg-card border border-border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile Filter Toggle */}
              <button 
                onClick={() => setIsFilterOpen(true)}
                className="flex lg:hidden items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium bg-card hover:bg-muted"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>

              {/* View Toggles */}
              <div className="flex items-center p-1 bg-muted rounded-lg border border-border">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(category || query) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-xs text-muted-foreground font-medium mr-1">Active:</span>
              {query && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Search: {query}
                </span>
              )}
              {category && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Category: {category}
                </span>
              )}
              <button onClick={clearAllFilters} className="text-xs text-destructive hover:underline ml-2">
                Clear all
              </button>
            </div>
          )}

          {/* Results Grid/List */}
          <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
            {loading ? (
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <Skeleton key={i} className={`rounded-xl ${viewMode === 'grid' ? 'h-[250px]' : 'h-[120px]'} w-full`} />
                ))}
              </div>
            ) : (
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {products.length === 0 ? (
                  <div className="col-span-full py-10 text-center text-muted-foreground">No results found for your search.</div>
                ) : products.map((item: any) => {
                  const product = {
                    ...item,
                    id: item.objectID || item.id,
                    imgUrl: item.imgURL || item.image || item.imgUrl || '',
                    rating: item.rating || 0,
                    reviewCount: item.reviewCount || 0
                  };
                  return (
                    <div key={product.id} className={viewMode === 'list' ? 'h-[140px]' : ''}>
                      <ProductCard 
                        product={product}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};
