import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Grid, List as ListIcon, X } from 'lucide-react';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { FilterSidebar } from '../components/FilterSidebar';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { useFilterStore } from '../store/useFilterStore';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

export const DiscoveryPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);

  const { category, clearAllFilters } = useFilterStore();

  // Simulate Network loading
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [query, category]); // Refetch when search query or category changes

  return (
    <PageWrapper className="min-h-screen bg-background">
      <div className="flex h-full">
        {/* Sidebar Filters */}
        <FilterSidebar isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
          
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {query ? `Search results for "${query}"` : 'Discover'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Showing 12 results
              </p>
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
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className={viewMode === 'list' ? 'h-[140px]' : ''}>
                    <ProductCard 
                      product={{
                        id: `prod-${i}`,
                        name: `Tulete Product ${i} - Premium Quality`,
                        description: 'Detailed description of the product',
                        price: 15000 + (i * 2500),
                        oldprice: i % 3 === 0 ? 30000 : undefined,
                        imgUrl: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80`,
                        storeId: 's1',
                        store: 'Verified Store',
                        rating: 4.8,
                        reviewCount: 120,
                        category: category || 'Retail',
                        tags: i % 2 === 0 ? ['Most TamTam'] : [],
                        availability: true
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};
