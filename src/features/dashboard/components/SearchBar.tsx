import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useSearchStore } from '../../search/store/useSearchStore';

export const SearchBar = () => {
  const { openSearch } = useSearchStore();

  return (
    <div className="sticky top-0 z-30 px-4 md:px-6 py-3 bg-background/90 backdrop-blur-xl border-b border-border/40 transition-all">
      <div 
        className="relative flex items-center w-full min-w-0 h-14 sm:h-16 px-2.5 sm:px-3.5 gap-2.5 rounded-full bg-card dark:bg-card/95 backdrop-blur-xl border-2 border-border/80 hover:border-primary/40 shadow-lg shadow-black/5 dark:shadow-black/30 hover:shadow-xl transition-all duration-200 cursor-pointer group overflow-hidden"
        onClick={openSearch}
      >
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        
        <div className="flex-1 min-w-0 truncate text-sm sm:text-base font-medium text-muted-foreground">
          Search stores, services, products...
        </div>
        
        <button
          type="button"
          aria-label="Open search filters"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white flex items-center justify-center shrink-0 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
