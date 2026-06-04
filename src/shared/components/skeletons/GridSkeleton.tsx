import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { PageContainer, ContentContainer } from '../layout';

export const GridSkeleton = () => {
  return (
    <PageContainer>
      <ContentContainer>
        <div className="mb-6 flex justify-between items-center">
          <div>
             <Skeleton className="h-8 w-48 mb-2" />
             <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </ContentContainer>
    </PageContainer>
  );
};
