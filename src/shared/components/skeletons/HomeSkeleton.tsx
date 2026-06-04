import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { PageContainer, ContentContainer } from '../layout';

export const HomeSkeleton = () => {
  return (
    <PageContainer>
      <ContentContainer>
        {/* Hero Section */}
        <div className="mb-8 space-y-4">
          <Skeleton className="h-[200px] sm:h-[300px] w-full rounded-3xl" />
        </div>
        
        {/* Categories Section */}
        <div className="mb-8">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-24 rounded-2xl flex-shrink-0" />
            ))}
          </div>
        </div>

        {/* Popular Stores/Items Section */}
        <div>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-[180px] w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </ContentContainer>
    </PageContainer>
  );
};
