import React from 'react';
import { Filter, X } from 'lucide-react';
import { useFilterStore } from '../store/useFilterStore';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FilterSidebar = ({ isOpen, onClose }: FilterSidebarProps) => {
  const {
    category,
    minPrice,
    maxPrice,
    isAvailableOnly,
    sortBy,
    setCategory,
    setPriceRange,
    setAvailableOnly,
    setSortBy,
    clearAllFilters
  } = useFilterStore();

  const categories = ['Retail', 'Salon', 'Food', 'Tech', 'Repair', 'Fashion'];
  const sortOptions = [
    { id: 'popular', label: 'Most Popular' },
    { id: 'newest', label: 'Newest Arrivals' },
    { id: 'price_asc', label: 'Price: Low to High' },
    { id: 'price_desc', label: 'Price: High to Low' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed lg:sticky top-0 lg:top-16 left-0 z-50 lg:z-10 h-full w-72 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="flex items-center gap-2 font-bold">
              <Filter className="w-5 h-5" />
              Filters
            </h2>
            <button onClick={onClose} className="lg:hidden p-2 rounded-full hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Filter Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Sort By */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Sort By</h3>
              <div className="space-y-2">
                {sortOptions.map(option => (
                  <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio"
                      name="sort"
                      className="w-4 h-4 text-primary focus:ring-primary accent-primary"
                      checked={sortBy === option.id}
                      onChange={() => setSortBy(option.id as any)}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Category</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(category === c ? null : c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      category === c 
                        ? 'bg-primary border-primary text-white' 
                        : 'bg-transparent border-border text-foreground hover:border-primary/50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Price Range (TZS)</h3>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  placeholder="Min"
                  value={minPrice || ''}
                  onChange={(e) => setPriceRange(e.target.value ? Number(e.target.value) : null, maxPrice)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-muted-foreground">-</span>
                <input 
                  type="number" 
                  placeholder="Max"
                  value={maxPrice || ''}
                  onChange={(e) => setPriceRange(minPrice, e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-semibold">Available Only</span>
                <input 
                  type="checkbox"
                  checked={isAvailableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary accent-primary"
                />
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border flex items-center gap-3 bg-card">
            <button 
              onClick={clearAllFilters}
              className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              Reset
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-primary text-white py-2 rounded-lg font-bold shadow-sm hover:bg-primary/90 transition-colors lg:hidden"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
