import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingScreen = () => {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium animate-pulse">Loading...</p>
    </div>
  );
};

export const FullPageLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="mt-4 text-sm font-medium text-slate-600 animate-pulse">Please wait...</p>
    </div>
  );
};
