import React from "react";
import { cn } from "../../utils/cn";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted/80 dark:bg-muted/40",
        "after:absolute after:inset-0 after:-translate-x-full",
        "after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/40 dark:after:via-white/10 after:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-3xl p-3.5 border border-border/80 shadow-sm flex flex-col h-full space-y-3">
      <Skeleton className="w-full aspect-[4/3] rounded-2xl" />
      <div className="space-y-2 flex-1 flex flex-col">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-4.5 w-4/5 rounded-lg" />
        <Skeleton className="h-3.5 w-2/3 rounded-md" />
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-border/40">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function StoreCardSkeleton() {
  return (
    <div className="bg-card rounded-3xl overflow-hidden border border-border/80 shadow-sm flex flex-col h-full">
      <div className="relative aspect-square w-full">
        <Skeleton className="w-full h-full rounded-none" />
        <div className="absolute top-3 left-3">
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="absolute bottom-3 left-3">
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="absolute bottom-3 right-3">
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1 space-y-3">
        <Skeleton className="h-5 w-3/4 rounded-lg" />
        <Skeleton className="h-3.5 w-full rounded-md" />
        <Skeleton className="h-3.5 w-4/5 rounded-md" />
        <div className="pt-3 flex justify-between items-center border-t border-border/40 mt-auto">
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="h-4 w-14 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function StoreListCardSkeleton() {
  return (
    <div className="flex gap-4 bg-card rounded-2xl border border-border/80 p-3.5 shadow-sm items-center">
      <Skeleton className="w-20 h-20 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
        <Skeleton className="h-3 w-3/4 rounded" />
      </div>
    </div>
  );
}

export function LaundryCardSkeleton() {
  return (
    <div className="bg-card rounded-3xl p-4 border border-border/80 shadow-sm flex flex-col h-full space-y-3">
      <Skeleton className="w-full aspect-[4/3] rounded-2xl" />
      <div className="space-y-2 flex-1 flex flex-col">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-4.5 w-3/4 rounded-lg" />
        <Skeleton className="h-3.5 w-full rounded-md" />
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-border/40">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
