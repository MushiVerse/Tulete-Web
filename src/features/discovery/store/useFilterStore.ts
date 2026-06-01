import { create } from 'zustand';

interface FilterState {
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  isAvailableOnly: boolean;
  sortBy: 'popular' | 'newest' | 'price_asc' | 'price_desc';
  
  setCategory: (category: string | null) => void;
  setPriceRange: (min: number | null, max: number | null) => void;
  setMinRating: (rating: number | null) => void;
  setAvailableOnly: (isAvailable: boolean) => void;
  setSortBy: (sort: 'popular' | 'newest' | 'price_asc' | 'price_desc') => void;
  clearAllFilters: () => void;
}

const initialState = {
  category: null,
  minPrice: null,
  maxPrice: null,
  minRating: null,
  isAvailableOnly: false,
  sortBy: 'popular' as const,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,
  
  setCategory: (category) => set({ category }),
  setPriceRange: (minPrice, maxPrice) => set({ minPrice, maxPrice }),
  setMinRating: (minRating) => set({ minRating }),
  setAvailableOnly: (isAvailableOnly) => set({ isAvailableOnly }),
  setSortBy: (sortBy) => set({ sortBy }),
  
  clearAllFilters: () => set(initialState),
}));
