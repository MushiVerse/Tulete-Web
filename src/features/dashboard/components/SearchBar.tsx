import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useSearchStore } from '../../search/store/useSearchStore';

export const SearchBar = () => {
  const { openSearch } = useSearchStore();

  return (
    <div className="px-4 md:px-6 py-2">
      <div 
        className="relative flex items-center w-full cursor-pointer group"
        onClick={openSearch}
      >
        <div className="absolute left-3 text-muted-foreground">
          <Search className="w-4 h-4" />
        </div>
        
        <div className="w-full h-12 pl-10 pr-12 rounded-xl bg-card border border-border text-sm shadow-sm flex items-center text-muted-foreground transition-all group-hover:border-primary/50 group-hover:shadow-md">
          Search stores, services, products...
        </div>
        
        <button className="absolute right-2 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
