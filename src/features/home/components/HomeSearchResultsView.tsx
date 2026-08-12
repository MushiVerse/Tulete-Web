import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchX, Loader2 } from 'lucide-react';
import { searchTuleteItems, isValidSearchItem } from '../../../core/services/algoliaService';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { useCartStore } from '../../cart/store/useCartStore';
import { getNormalizedRating } from '../../../shared/utils/ratingUtils';

interface HomeSearchResultsViewProps {
  query: string;
  filterValue: string | null;
}

export const HomeSearchResultsView: React.FC<HomeSearchResultsViewProps> = ({ query, filterValue }) => {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const addToCart = useCartStore((state) => state.addToCart);

  // Ref to prevent concurrent page fetches
  const fetchingRef = useRef(false);

  const getFilterStr = useCallback(() => {
    if (filterValue === 'food') {
      return `(recordType:food OR category:Food OR cat:Food)`;
    } else if (filterValue === 'product') {
      return `(recordType:product OR category:Product OR cat:Product)`;
    } else if (filterValue === 'laundry') {
      return `(recordType:cloth OR recordType:laundry OR category:Laundry OR category:Nguo OR cat:Nguo)`;
    }
    // 'All' option: fetch all search query hits from Algolia, JS validation cleans up stores & invalid data
    return undefined;
  }, [filterValue]);

  // Reset and fetch initial 20 items (Page 0)
  useEffect(() => {
    let isCancelled = false;

    const fetchInitial = async () => {
      if (!query.trim()) return;

      setLoading(true);
      setPage(0);
      setHasMore(true);
      setResults([]);
      fetchingRef.current = true;

      const filterStr = getFilterStr();

      try {
        const result: any = await searchTuleteItems(query, {
          filters: filterStr,
          hitsPerPage: 20,
          page: 0,
          context: 'home_page'
        });

        if (isCancelled) return;

        const hitsList = Array.isArray(result) ? result : (result.hits || []);
        setResults(hitsList);

        const currPage = result.page ?? 0;
        const totalPages = result.nbPages ?? 1;
        const rawCount = result.rawCount ?? hitsList.length;

        // More pages exist if current page is less than totalPages - 1 AND rawCount was at least 1
        if (currPage < totalPages - 1 && rawCount > 0) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        console.error('Error fetching initial search results:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
          fetchingRef.current = false;
        }
      }
    };

    fetchInitial();

    return () => {
      isCancelled = true;
    };
  }, [query, filterValue, getFilterStr]);

  // Fetch next page on scroll
  const loadNextPage = useCallback(async () => {
    if (fetchingRef.current || !hasMore || loading || loadingMore || !query.trim()) return;

    fetchingRef.current = true;
    setLoadingMore(true);
    const nextPage = page + 1;
    const filterStr = getFilterStr();

    try {
      const result: any = await searchTuleteItems(query, {
        filters: filterStr,
        hitsPerPage: 20,
        page: nextPage
      });

      const hitsList = Array.isArray(result) ? result : (result.hits || []);
      const currPage = result.page ?? nextPage;
      const totalPages = result.nbPages ?? 1;

      if (currPage >= totalPages - 1) {
        setHasMore(false);
      }

      if (hitsList.length > 0) {
        setResults((prev) => {
          const existingIds = new Set(prev.map((item) => item.objectID || item.id));
          const uniqueNewHits = hitsList.filter((item: any) => !existingIds.has(item.objectID || item.id));
          return [...prev, ...uniqueNewHits];
        });
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Error loading next search page:', err);
    } finally {
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [page, hasMore, loading, loadingMore, query, getFilterStr]);

  // High-performance IntersectionObserver for zero-lag infinite scrolling
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!bottomSentinelRef.current || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      { rootMargin: '800px 0px 800px 0px', threshold: 0 }
    );

    observer.observe(bottomSentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadNextPage]);

  // Window Scroll Listener fallback (threshold: 1000px from bottom)
  useEffect(() => {
    const handleScroll = () => {
      const scrollBottom = window.innerHeight + window.scrollY;
      const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      if (docHeight - scrollBottom < 1000) {
        loadNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadNextPage]);

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
    <div className="space-y-6">
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
                key={`${product.id}-${i}`}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: (i % 20) * 0.02 }}
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

      {/* Sentinel element for IntersectionObserver infinite scrolling */}
      <div ref={bottomSentinelRef} className="h-4 w-full" />

      {/* Loading Indicator */}
      {loadingMore && (
        <div className="flex justify-center items-center py-6 gap-2 text-primary font-bold text-sm bg-primary/5 rounded-full border border-primary/10 w-max mx-auto px-6">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Loading more results...</span>
        </div>
      )}
    </div>
  );
};
