import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { PageContainer, ContentContainer } from '../layout';

export const ProfileSkeleton = () => {
  return (
    <PageContainer>
      <ContentContainer size="md">
        {/* Profile Hero Skeleton */}
        <div className="relative mb-6 rounded-2xl overflow-hidden bg-card border border-border">
          <Skeleton className="h-28 w-full rounded-none" />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <Skeleton className="w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800" />
              <div className="flex gap-2 mt-12">
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2 mt-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full mt-4 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card flex flex-col items-center">
              <Skeleton className="w-9 h-9 rounded-xl mb-2" />
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>

        {/* Menu Skeleton */}
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-slate-50 dark:divide-slate-800">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3 w-3" />
            </div>
          ))}
        </div>
      </ContentContainer>
    </PageContainer>
  );
};
