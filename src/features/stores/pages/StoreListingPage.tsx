import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storeService, Store } from '../services/storeService';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { PageContainer } from '../../../shared/components/layout';
import { Badge } from '../../../shared/components/ui/Badge';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import {
  Search, MapPin, Star, CheckCircle2, Heart,
  Filter, X, Grid3X3, List, SlidersHorizontal,
  Utensils, Shirt, Zap, Sparkles, Car, Store as StoreIcon,
  Navigation, Clock, TrendingUp, Tag, ChevronDown, Phone, ArrowRight, Bell, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Shared Configs ──────────────────────────────────────── */
const CAT_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  Food:       { emoji: '🍽️', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
  Laundry:    { emoji: '🧺', color: 'text-secondary-foreground', bg: 'bg-secondary/20 border-secondary/30' },
  Electrical: { emoji: '⚡', color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  Beauty:     { emoji: '💅', color: 'text-primary', bg: 'bg-primary/5 border-primary/10' },
  Rides:      { emoji: '🚗', color: 'text-success', bg: 'bg-success/10 border-success/20' },
};

const CATEGORIES = ['Food', 'Laundry', 'Electrical', 'Beauty', 'Rides'];

const HUBS = [
  { label: 'Kilimani', lat: -1.2894, lng: 36.7909 },
  { label: 'Westlands', lat: -1.2635, lng: 36.8049 },
  { label: 'CBD', lat: -1.2821, lng: 36.8185 },
  { label: 'Hurlingham', lat: -1.2941, lng: 36.7981 },
];

const STATS = [
  { value: '200+', label: 'Providers', icon: StoreIcon },
  { value: '4.8★', label: 'Avg Rating', icon: Star },
  { value: '30min', label: 'Avg Delivery', icon: Clock },
  { value: '24/7', label: 'Support', icon: Bell },
];

/* ─── Store Grid Card ──────────────────────────────────────── */
const StoreGridCard = ({
  store, isFav, onFav, onClick
}: {
  store: Store & { distance: number };
  isFav: boolean;
  onFav: (e: React.MouseEvent) => void;
  onClick: () => void;
}) => {
  const cfg = CAT_CONFIG[store.category] || CAT_CONFIG.Food;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div className="bg-card rounded-3xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full group-hover:-translate-y-1">
        {/* Cover image */}
        <div className="relative aspect-square w-full overflow-hidden bg-muted shrink-0">
          <img
            src={store.imgURL}
            alt={store.store}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 opacity-80 group-hover:opacity-90 transition-opacity" />

          {/* Status & Fav Row */}
          <div className="absolute top-3 inset-x-3 flex justify-between items-start">
            <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full shadow-sm backdrop-blur-md ${
              store.availability ? 'bg-success/90 text-primary-foreground' : 'bg-black/50 text-white'
            }`}>
              {store.availability ? 'Open Now' : 'Closed'}
            </span>
            <button
              onClick={onFav}
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm hover:bg-white/40 active:scale-95 transition-all"
            >
              <Heart className={`w-4 h-4 transition-colors ${isFav ? 'fill-destructive text-destructive' : 'text-white'}`} />
            </button>
          </div>

          {/* Bottom Row on Image */}
          <div className="absolute bottom-3 inset-x-3 flex justify-between items-end">
            <div className={`flex items-center gap-1.5 ${cfg.bg} border px-2.5 py-1.5 rounded-full bg-background/95 backdrop-blur shadow-sm`}>
              <span className="text-sm">{cfg.emoji}</span>
              <span className={`text-[11px] font-extrabold uppercase tracking-widest ${cfg.color}`}>{store.category}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm">
              <Star className="w-4 h-4 fill-warning stroke-warning" />
              <span className="text-white text-sm font-extrabold">{store.rating || '—'}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1 bg-card">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="font-extrabold text-foreground text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors flex-1">
              {store.store}
            </h3>
            {store.isVerified && (
              <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4 flex-1">
            {store.description}
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-border/50 text-base">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-5 h-5 text-success shrink-0" />
              <span className="font-bold text-foreground">{store.distance} km</span>
            </div>
            <span className="text-primary font-extrabold text-sm tracking-wide uppercase flex items-center gap-1 group-hover:gap-2 transition-all">
              Visit <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Store List Card ──────────────────────────────────────── */
const StoreListCard = ({
  store, isFav, onFav, onClick
}: {
  store: Store & { distance: number };
  isFav: boolean;
  onFav: (e: React.MouseEvent) => void;
  onClick: () => void;
}) => {
  const cfg = CAT_CONFIG[store.category] || CAT_CONFIG.Food;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div className="flex gap-4 bg-card rounded-2xl border border-border p-3.5 shadow-sm hover:shadow-md transition-all items-center">
        {/* Thumbnail */}
        <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-muted">
          <img
            src={store.imgURL}
            alt={store.store}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200'; }}
          />
          <span className={`absolute bottom-1 left-1 w-2 h-2 rounded-full border border-white ${store.availability ? 'bg-success' : 'bg-muted-foreground'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-extrabold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {store.store}
            </h3>
            {store.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0" />}
          </div>

          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.bg} border ${cfg.color}`}>
              {cfg.emoji} {store.category}
            </span>
            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${store.availability ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
              {store.availability ? 'Open' : 'Closed'}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground line-clamp-1">{store.description}</p>

          <div className="flex items-center gap-3 mt-1.5 text-[11px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3 h-3 text-success" />
              <span className="font-semibold">{store.distance} km</span>
            </span>
            <span className="flex items-center gap-0.5 font-bold text-foreground">
              <Star className="w-3 h-3 fill-warning stroke-warning" />
              {store.rating}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={onFav}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors"
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
          </button>
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Main StoreListingPage ────────────────────────────────── */
export const StoreListingPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeHub, setActiveHub] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category') || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(searchParams.get('available') === 'true');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'popular'>(
    (searchParams.get('sort') as any) || 'distance'
  );

  const [favorites, setFavorites] = useState<string[]>(() => {
    const s = localStorage.getItem('tulete_favorite_stores');
    return s ? JSON.parse(s) : [];
  });

  const hub = HUBS[activeHub];

  const toggleFav = (storeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.includes(storeId)
      ? favorites.filter(id => id !== storeId)
      : [...favorites, storeId];
    setFavorites(updated);
    localStorage.setItem('tulete_favorite_stores', JSON.stringify(updated));
  };

  const { data: storesData, isLoading } = useFirestoreQuery(
    ['stores', 'all'],
    storeService,
    { limit: 100 }
  );

  const allStores = storesData?.data || [];

  const processedStores = allStores
    .map((s) => ({
      ...s,
      distance: s.location
        ? storeService.calculateDistance(hub.lat, hub.lng, s.location.lat, s.location.lng)
        : 99.9,
    }))
    .filter((s) => {
      if (selectedCategory && s.category !== selectedCategory) return false;
      if (onlyOpen && !s.availability) return false;
      if (onlyVerified && !s.isVerified) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.store.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'popular') return (b.reviewCount || 0) - (a.reviewCount || 0);
      return a.distance - b.distance; // nearest
    });

  const activeFiltersCount = [onlyOpen, onlyVerified, !!selectedCategory].filter(Boolean).length;

  const clearAll = () => {
    setSelectedCategory(null);
    setSearchQuery('');
    setOnlyOpen(false);
    setOnlyVerified(false);
    setSortBy('distance');
  };

  return (
    <PageContainer>
      <div className="flex w-full bg-background h-[calc(100vh-4rem)] overflow-hidden relative">

        {/* ── LEFT SIDEBAR (FILTERS & NAVIGATION) ── */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-8">
            
            {/* Category Navigation */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Categories</h2>
                {selectedCategory && (
                  <button onClick={() => setSelectedCategory(null)} className="text-[10px] text-destructive font-bold hover:underline">Clear</button>
                )}
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left text-sm font-bold ${
                    !selectedCategory ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="w-6 text-center">🏪</span>
                  All Providers
                </button>
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat;
                  const cfg = CAT_CONFIG[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(isActive ? null : cat)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left text-sm font-bold ${
                        isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className="w-6 text-center">{cfg.emoji}</span>
                      {cat}
                      {isActive && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location Hubs */}
            <div>
              <h2 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Locations</h2>
              <div className="space-y-1.5">
                {HUBS.map((h, i) => (
                  <button
                    key={h.label}
                    onClick={() => setActiveHub(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left text-sm font-bold ${
                      activeHub === i ? 'bg-success text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Navigation className="w-4 h-4" />
                    {h.label}
                    {activeHub === i && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div>
              <h2 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Refine</h2>
              <div className="space-y-4">
                {[
                  { label: '✅ Open Now', checked: onlyOpen, set: setOnlyOpen },
                  { label: '🛡️ Verified Only', checked: onlyVerified, set: setOnlyVerified },
                ].map(({ label, checked, set }) => (
                  <label key={label} className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => set(!checked)}
                      className={`w-10 h-5 rounded-full transition-all relative ${checked ? 'bg-primary' : 'bg-muted border border-border'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-primary-foreground border border-border rounded-full shadow transition-all ${checked ? 'left-5' : 'left-0.5'}`} />
                    </div>
                    <span className="text-sm font-bold text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── CENTER/MAIN COLUMN ── */}
        <div className="flex-auto min-w-0 max-w-full h-full overflow-y-auto scrollbar-none pt-6 pb-28 px-4 lg:px-8 xl:px-10 space-y-6">

          {/* ── Header ───────────────────────────────────────── */}
          <div className="mb-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mb-1">
              Explore Providers
            </h1>
            <p className="text-sm text-muted-foreground">
              {processedStores.length > 0
                ? `${processedStores.length} provider${processedStores.length !== 1 ? 's' : ''} found near ${hub.label}`
                : 'Find the best local services'}
            </p>
          </div>

          {/* ── Search + Controls Row ─────────────────────────── */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stores, food, beauty..."
                className="w-full pl-10 pr-10 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`lg:hidden relative flex items-center gap-1.5 px-4 py-3 rounded-xl border font-bold text-xs transition-all ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card border-border text-foreground hover:border-primary/30 shadow-sm'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-primary-foreground text-[9px] font-extrabold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View mode */}
            <div className="flex border border-border rounded-xl overflow-hidden bg-card shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 transition-all ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Mobile Category Pills ────────────────────────────────── */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-extrabold border transition-all ${
                !selectedCategory
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              🏪 All
            </button>
            {CATEGORIES.map((cat) => {
              const cfg = CAT_CONFIG[cat];
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isActive ? null : cat)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-extrabold border transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : `bg-card border-border ${cfg.color} hover:border-primary/30`
                  }`}
                >
                  <span>{cfg.emoji}</span>
                  {cat}
                </button>
              );
            })}
          </div>

          {/* ── Sort Controls ─────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sort:</span>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'distance', label: '📍 Nearest' },
                { value: 'rating', label: '⭐ Top Rated' },
                { value: 'popular', label: '🔥 Most Popular' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSortBy(value as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                    sortBy === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Mobile Filter Drawer ─────────────────────────────────── */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden overflow-hidden"
              >
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-extrabold text-foreground">Refine Results</span>
                    {activeFiltersCount > 0 && (
                      <button onClick={clearAll} className="text-xs font-bold text-destructive hover:text-destructive/80">
                        Reset all
                      </button>
                    )}
                  </div>
                  
                  {/* Toggles */}
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: '✅ Open Now', checked: onlyOpen, set: setOnlyOpen },
                      { label: '🛡️ Verified Only', checked: onlyVerified, set: setOnlyVerified },
                    ].map(({ label, checked, set }) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() => set(!checked)}
                          className={`w-10 h-5 rounded-full transition-all relative ${checked ? 'bg-primary' : 'bg-muted border border-border'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-primary-foreground border border-border rounded-full shadow transition-all ${checked ? 'left-5' : 'left-0.5'}`} />
                        </div>
                        <span className="text-xs font-bold text-foreground">{label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Hubs */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2 block">Locations</span>
                    <div className="flex flex-wrap gap-2">
                      {HUBS.map((h, i) => (
                        <button
                          key={h.label}
                          onClick={() => setActiveHub(i)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition-all ${
                            activeHub === i
                              ? 'bg-success text-primary-foreground border-success'
                              : 'bg-muted border-border text-muted-foreground'
                          }`}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Results ───────────────────────────────────────── */}
          {isLoading ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4' : 'space-y-3'}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className={`w-full rounded-2xl ${viewMode === 'grid' ? 'h-72' : 'h-24'}`} />
              ))}
            </div>
          ) : processedStores.length === 0 ? (
            /* ── Empty State ─ */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 bg-card border border-border rounded-3xl shadow-sm"
            >
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-extrabold text-foreground mb-2">No Providers Found</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                We couldn't find stores matching your filters. Try a different category or location.
              </p>
              <Button onClick={clearAll} className="rounded-full px-6">
                Clear All Filters
              </Button>
            </motion.div>
          ) : viewMode === 'grid' ? (
            /* ── Grid View ─ */
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
            >
              <AnimatePresence>
                {processedStores.map((store) => (
                  <StoreGridCard
                    key={store.id}
                    store={store}
                    isFav={favorites.includes(store.id)}
                    onFav={(e) => toggleFav(store.id, e)}
                    onClick={() => navigate(`/store/${store.id}`)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* ── List View ─ */
            <div className="space-y-3">
              <AnimatePresence>
                {processedStores.map((store) => (
                  <StoreListCard
                    key={store.id}
                    store={store}
                    isFav={favorites.includes(store.id)}
                    onFav={(e) => toggleFav(store.id, e)}
                    onClick={() => navigate(`/store/${store.id}`)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

        </div>

        {/* ── RIGHT SIDEBAR (WIDGETS) ── */}
        <div className="hidden xl:block flex-none w-[320px] shrink-0 border-l border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-6">
            
            {/* QUICK ACTION CARDS */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Quick Actions</h2>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { emoji: '🧺', title: 'Book Laundry', sub: 'Express pickup', href: '/laundry', gradient: 'from-primary/90 to-primary/70 text-primary-foreground' },
                  { emoji: '📦', title: 'My Orders', sub: 'Track deliveries', href: '/orders', gradient: 'from-secondary to-secondary/80 text-secondary-foreground' },
                  { emoji: '❤️', title: 'Favourites', sub: 'Saved items', href: '/favorites', gradient: 'from-warning/90 to-warning/70 text-warning-foreground' },
                ].map(({ emoji, title, sub, href, gradient }) => (
                  <motion.button
                    key={title}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate(href)}
                    className={`bg-gradient-to-br ${gradient} rounded-xl p-3 flex items-center gap-3 text-left shadow-sm hover:shadow-md transition-all border border-black/5 group`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-background/20 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-lg">{emoji}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-extrabold text-xs leading-tight">{title}</p>
                      <p className="opacity-80 text-[10px] mt-0.5">{sub}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* TRUST STATS BAND */}
            <div className="bg-primary rounded-3xl p-5 shadow-sm text-primary-foreground">
              <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider opacity-90">Platform Stats</h2>
              <div className="grid grid-cols-1 gap-4">
                {STATS.map(({ value, label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-lg font-extrabold leading-tight">{value}</span>
                      <span className="block text-[10px] opacity-70 font-semibold uppercase">{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LAUNDRY PROMO BANNER */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/laundry')}
              className="relative rounded-3xl overflow-hidden h-40 cursor-pointer shadow-sm bg-primary border border-border"
            >
              <img
                src="https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?q=80&w=800&auto=format&fit=crop"
                alt="Laundry"
                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40"
              />
              <div className="absolute inset-0 flex flex-col justify-between p-5">
                <div className="text-primary-foreground">
                  <p className="opacity-90 text-[10px] font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Professional Cleaning
                  </p>
                  <h3 className="font-extrabold text-xl leading-tight">Laundry at Your Door</h3>
                  <p className="opacity-80 text-xs mt-1">Pick up in 2 hrs · Express available</p>
                </div>
                <div className="self-start flex items-center gap-1.5 bg-background text-foreground font-extrabold text-xs px-4 py-2 rounded-full shadow-sm hover:bg-secondary hover:text-secondary-foreground transition-colors">
                  Order Now <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>

          </div>
        </div>

      </div>
    </PageContainer>
  );
};
