import React from "react";
import { cn } from "../../utils/cn";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted/40 dark:bg-muted/20",
        "after:absolute after:inset-0 after:-translate-x-full",
        "after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/20 dark:after:via-white/5 after:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <Skeleton className="w-full h-72 rounded-3xl" />
  );
}

export function StoreCardSkeleton() {
  return (
    <Skeleton className="w-full h-80 rounded-3xl" />
  );
}

export function StoreListCardSkeleton() {
  return (
    <Skeleton className="w-full h-24 rounded-2xl" />
  );
}

export function LaundryCardSkeleton() {
  return (
    <Skeleton className="w-full h-72 rounded-3xl" />
  );
}
