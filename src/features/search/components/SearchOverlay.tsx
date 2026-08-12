import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSearchStore } from '../store/useSearchStore';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { analyticsService } from '../../../services/analyticsService';

export const SearchOverlay = () => {
  const navigate = useNavigate();
  const { 
    isSearchOpen, 
    closeSearch, 
    query, 
    setQuery, 
    searchHistory,
    addSearchHistory,
    removeSearchHistoryItem,
    clearSearchHistory
  } = useSearchStore();

  const [inputValue, setInputValue] = useState(query);
  const debouncedValue = useDebounce(inputValue, 500);

  // Sync internal state with global state when debounced
  useEffect(() => {
    setQuery(debouncedValue);
  }, [debouncedValue, setQuery]);

  // When overlay opens, sync input with global query
  useEffect(() => {
    if (isSearchOpen) {
      setInputValue(query);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSearchOpen, query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      analyticsService.trackSearchQuery(inputValue.trim(), 'header_overlay', true);
      addSearchHistory(inputValue);
      closeSearch();
      navigate(`/explore?q=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  const handleHistoryClick = (term: string) => {
    analyticsService.trackSearchQuery(term.trim(), 'history_click', true);
    setInputValue(term);
    setQuery(term);
    addSearchHistory(term);
    closeSearch();
    navigate(`/explore?q=${encodeURIComponent(term)}`);
  };

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col md:p-6"
        >
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full md:h-auto md:max-w-2xl md:mx-auto bg-card md:rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            {/* Search Header */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 p-4 border-b border-border">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3 w-5 h-5 text-muted-foreground" />
                <input 
                  type="text"
                  autoFocus
                  placeholder="Search Tulete..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full h-12 pl-10 pr-10 bg-muted/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-base"
                />
                {inputValue && (
                  <button 
                    type="button"
                    onClick={() => setInputValue('')}
                    className="absolute right-3 p-1 rounded-full text-muted-foreground hover:bg-muted"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button 
                type="button" 
                onClick={closeSearch}
                className="text-sm font-medium text-muted-foreground hover:text-foreground md:hidden"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={closeSearch}
                className="hidden md:flex p-2 rounded-xl text-muted-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </form>

            {/* Search Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
              {!inputValue ? (
                <div className="space-y-6">
                  {/* Recent Searches */}
                  {searchHistory.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-foreground">Recent Searches</h3>
                        <button 
                          onClick={clearSearchHistory}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {searchHistory.map((term) => (
                          <div 
                            key={term} 
                            className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm group cursor-pointer hover:bg-primary/10 transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span onClick={() => handleHistoryClick(term)}>{term}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSearchHistoryItem(term);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-muted-foreground/20 text-muted-foreground"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Searches */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Trending on Tulete
                    </h3>
                    <ul className="space-y-1">
                      {['Iphone 15 Pro', 'Men Sneakers', 'Salon near me', 'Nike Shoes', 'Gaming Laptops'].map((trending) => (
                        <li key={trending}>
                          <button 
                            onClick={() => handleHistoryClick(trending)}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left text-sm"
                          >
                            <span>{trending}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                  {/* Realtime Search Results simulation space */}
                  <Search className="w-8 h-8 mb-2 opacity-20" />
                  <p>Press Enter to search for "{inputValue}"</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
