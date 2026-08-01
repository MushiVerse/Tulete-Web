import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useSearchStore } from '../../search/store/useSearchStore';

export const SearchBar = () => {
  const { openSearch } = useSearchStore();

  return (
    <div className="sticky top-0 z-20 px-4 md:px-6 py-2 bg-background/80 backdrop-blur-xl">
      <div 
        className="relative flex items-center w-full cursor-pointer group"
        onClick={openSearch}
      >
        <div className="absolute left-3 text-muted-foreground">
          <Search className="w-4 h-4" />
        </div>
        
        <div className="w-full h-12 pl-10 pr-12 rounded-xl bg-card/75 dark:bg-card/60 backdrop-blur-xl border border-border/80 text-sm shadow-md flex items-center text-muted-foreground transition-all group-hover:border-primary/50 group-hover:shadow-lg">
          Search stores, services, products...
        </div>
        
        <button className="absolute right-2 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
