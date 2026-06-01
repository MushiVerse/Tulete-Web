import React, { useState } from 'react';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { DashboardHeader } from '../components/DashboardHeader';
import { SearchBar } from '../components/SearchBar';
import { CategoryScroll } from '../components/CategoryScroll';
import { PromoCarousel } from '../components/PromoCarousel';
import { SectionWrapper } from '../components/SectionWrapper';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { StoreCard } from '../../../shared/components/cards/StoreCard';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { productService, Product } from '../../products/services/productService';
import { storeService, Store } from '../../stores/services/storeService';

export const DashboardPage = () => {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch "Most TamTam" products
  const { data: tamtamProducts, isLoading: loadingProducts, refetch: refetchProducts } = useFirestoreQuery(
    ['products', 'tamtam'],
    productService,
    { limit: 5 }
  );

  // Fetch Nearby Stores
  const { data: nearbyStores, isLoading: loadingStores, refetch: refetchStores } = useFirestoreQuery(
    ['stores', 'nearby'],
    storeService,
    { limit: 5 }
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProducts(), refetchStores()]);
    setTimeout(() => setRefreshing(false), 800); // UI feel
  };

  // Helper for rendering horizontal loading skeletons
  const renderSkeletons = () => (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="shrink-0 w-[160px] md:w-[200px] snap-center">
          <Skeleton className="h-[220px] w-full rounded-xl" />
        </div>
      ))}
    </>
  );

  return (
    <PageWrapper className="pb-24 bg-background min-h-screen">
      {/* Pull to refresh zone (Visual only for now, can use external lib for real pull) */}
      <DashboardHeader />
      
      <div className="max-w-7xl mx-auto w-full">
        <SearchBar />
        <CategoryScroll />
        <PromoCarousel />

        <SectionWrapper 
          title="Most TamTam 🔥" 
          subtitle="Trending right now" 
          actionLink="/products/trending"
          delay={0.1}
        >
          {loadingProducts ? (
            renderSkeletons()
          ) : tamtamProducts?.data.length ? (
            tamtamProducts.data.map((product) => (
              <div key={product.id} className="shrink-0 w-[160px] md:w-[200px] snap-center">
                <ProductCard product={product} />
              </div>
            ))
          ) : (
            // Dummy Data Fallback for visual testing while DB is empty
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="shrink-0 w-[160px] md:w-[200px] snap-center">
                <ProductCard 
                  product={{
                    id: `dummy-${i}`,
                    name: `Amazing Product ${i}`,
                    description: 'This is a test product',
                    price: 25000 + (i * 5000),
                    originalPrice: i % 2 === 0 ? 35000 + (i * 5000) : undefined,
                    imageUrl: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80`,
                    storeId: 's1',
                    storeName: 'Super Store',
                    rating: 4.8,
                    reviewCount: 120,
                    category: 'Retail',
                    tags: ['Most TamTam'],
                    isAvailable: true
                  }} 
                />
              </div>
            ))
          )}
        </SectionWrapper>

        <SectionWrapper 
          title="Available Now near you 📍" 
          subtitle="Stores currently open" 
          actionLink="/stores"
          delay={0.2}
        >
          {loadingStores ? (
            renderSkeletons()
          ) : nearbyStores?.data.length ? (
            nearbyStores.data.map((store) => (
              <div key={store.id} className="shrink-0 w-[240px] md:w-[280px] snap-center">
                <StoreCard store={store} distanceKm={2.4} />
              </div>
            ))
          ) : (
             // Dummy Data Fallback
             [1, 2, 3].map((i) => (
              <div key={i} className="shrink-0 w-[240px] md:w-[280px] snap-center">
                <StoreCard 
                  distanceKm={1.2 * i}
                  store={{
                    id: `store-${i}`,
                    name: `Premium Salon ${i}`,
                    description: 'Best haircuts and beauty services in town.',
                    logoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=PS${i}`,
                    bannerUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80',
                    ownerId: 'u1',
                    rating: 4.9,
                    reviewCount: 340,
                    category: 'Beauty',
                    isOpen: i % 3 !== 0,
                    address: '123 Main St'
                  }} 
                />
              </div>
            ))
          )}
        </SectionWrapper>

        <SectionWrapper 
          title="Super Savings 💰" 
          subtitle="Top discounts today" 
          actionLink="/offers"
          delay={0.3}
        >
          {[4, 5, 6].map((i) => (
              <div key={i} className="shrink-0 w-[160px] md:w-[200px] snap-center">
                <ProductCard 
                  product={{
                    id: `dummy-sale-${i}`,
                    name: `Discounted Item ${i}`,
                    description: 'This is a test product',
                    price: 15000,
                    originalPrice: 45000,
                    imageUrl: `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80`,
                    storeId: 's1',
                    storeName: 'Tech Hub',
                    rating: 4.5,
                    reviewCount: 89,
                    category: 'Tech',
                    tags: ['Super Saving'],
                    isAvailable: true
                  }} 
                />
              </div>
            ))}
        </SectionWrapper>
      </div>
    </PageWrapper>
  );
};
