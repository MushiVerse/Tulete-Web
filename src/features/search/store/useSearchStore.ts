import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchState {
  query: string;
  isSearchOpen: boolean;
  searchHistory: string[];
  setQuery: (q: string) => void;
  openSearch: () => void;
  closeSearch: () => void;
  addSearchHistory: (term: string) => void;
  clearSearchHistory: () => void;
  removeSearchHistoryItem: (term: string) => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      query: '',
      isSearchOpen: false,
      searchHistory: [],
      setQuery: (query) => set({ query }),
      openSearch: () => set({ isSearchOpen: true }),
      closeSearch: () => set({ isSearchOpen: false, query: '' }),
      addSearchHistory: (term) => set((state) => {
        const trimmed = term.trim();
        if (!trimmed) return state;
        // Keep max 10 items, no duplicates
        const newHistory = [trimmed, ...state.searchHistory.filter(t => t !== trimmed)].slice(0, 10);
        return { searchHistory: newHistory };
      }),
      clearSearchHistory: () => set({ searchHistory: [] }),
      removeSearchHistoryItem: (term) => set((state) => ({
        searchHistory: state.searchHistory.filter(t => t !== term)
      }))
    }),
    {
      name: 'tulete-search-history',
      partialize: (state) => ({ searchHistory: state.searchHistory }),
    }
  )
);
