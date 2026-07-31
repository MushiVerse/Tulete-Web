import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storeService, Store } from '../services/storeService';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { PageContainer } from '../../../shared/components/layout';
import { Badge } from '../../../shared/components/ui/Badge';
import { Skeleton, StoreCardSkeleton, StoreListCardSkeleton } from '../../../shared/components/ui/Skeleton';
import { useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import {
  Search, MapPin, Star, CheckCircle2, Heart,
  Filter, X, Grid3X3, List, SlidersHorizontal,
  Utensils, Shirt, Zap, Sparkles, Car, Store as StoreIcon, ShoppingBag,
  Navigation, Clock, TrendingUp, Tag, ChevronDown, Phone, ArrowRight, Bell, ChevronRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { motion, AnimatePresence } from 'framer-motion';
import { getCategoryEmoji } from '../../../shared/utils/categoryEmoji';
import { HelpSafetyWidget } from '../../../shared/components/HelpSafetyWidget';

/* ─── Shared Configs ──────────────────────────────────────── */
const CAT_CONFIG: Record<string, { emoji: string; color: string; bg: string; activeBg: string }> = {
  Food: { emoji: '🍽️', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20', activeBg: 'bg-orange-500 text-white' },
  Laundry: { emoji: '🧺', color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/20', activeBg: 'bg-sky-500 text-white' },
  Electrical: { emoji: '⚡', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', activeBg: 'bg-amber-500 text-white' },
  Beauty: { emoji: '💅', color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20', activeBg: 'bg-pink-500 text-white' },
};

const getCategoryConfig = (store: Store) => {
  const docEmoji = (store as any).emoji || (store as any).icon || (store as any).categoryIcon;
  const displayCat = (store as any).cat || store.category || '';
  const rawCat = String(displayCat).toLowerCase().trim();

  let matchedConfig = CAT_CONFIG.Food;

  if (rawCat.includes('laund') || rawCat.includes('clean') || rawCat.includes('nguo') || rawCat.includes('wash')) {
    matchedConfig = CAT_CONFIG.Laundry || { emoji: '🧺', color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/20', activeBg: 'bg-sky-500 text-white' };
  } else if (rawCat.includes('elect') || rawCat.includes('gadget') || rawCat.includes('tech')) {
    matchedConfig = CAT_CONFIG.Electrical || { emoji: '⚡', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', activeBg: 'bg-amber-500 text-white' };
  } else if (rawCat.includes('beaut') || rawCat.includes('salon') || rawCat.includes('barber') || rawCat.includes('spa')) {
    matchedConfig = CAT_CONFIG.Beauty || { emoji: '💅', color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20', activeBg: 'bg-pink-500 text-white' };
  } else if (rawCat.includes('prod') || rawCat.includes('shop') || rawCat.includes('store') || rawCat.includes('groc') || rawCat.includes('market')) {
    matchedConfig = { emoji: '🛍️', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', activeBg: 'bg-emerald-500 text-white' };
  } else if (rawCat.includes('pharm') || rawCat.includes('health') || rawCat.includes('med')) {
    matchedConfig = { emoji: '💊', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', activeBg: 'bg-red-500 text-white' };
  } else if (CAT_CONFIG[displayCat]) {
    matchedConfig = CAT_CONFIG[displayCat];
  } else if (CAT_CONFIG[store.category]) {
    matchedConfig = CAT_CONFIG[store.category];
  }

  if (docEmoji && typeof docEmoji === 'string') {
    return { ...matchedConfig, emoji: docEmoji };
  }

  return matchedConfig;
};

const getCategoryBadgeConfig = (catName: string) => {
  if (CAT_CONFIG[catName]) return { ...CAT_CONFIG[catName], Icon: StoreIcon };
  const rawCat = catName.toLowerCase().trim();
  if (rawCat.includes('laund') || rawCat.includes('clean') || rawCat.includes('nguo') || rawCat.includes('wash')) {
    return { emoji: '🧺', color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/20', activeBg: 'bg-sky-500 text-white', Icon: Shirt };
  }
  if (rawCat.includes('elect') || rawCat.includes('gadget') || rawCat.includes('tech')) {
    return { emoji: '⚡', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', activeBg: 'bg-amber-500 text-white', Icon: Zap };
  }
  if (rawCat.includes('beaut') || rawCat.includes('salon') || rawCat.includes('barber') || rawCat.includes('spa')) {
    return { emoji: '💅', color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20', activeBg: 'bg-pink-500 text-white', Icon: Sparkles };
  }
  if (rawCat.includes('prod') || rawCat.includes('shop') || rawCat.includes('store') || rawCat.includes('groc') || rawCat.includes('market')) {
    return { emoji: '🛍️', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', activeBg: 'bg-emerald-500 text-white', Icon: ShoppingBag };
  }
  if (rawCat.includes('pharm') || rawCat.includes('health') || rawCat.includes('med')) {
    return { emoji: '💊', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', activeBg: 'bg-red-500 text-white', Icon: StoreIcon };
  }
  if (rawCat.includes('food') || rawCat.includes('restaur')) {
    return { emoji: '🍽️', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20', activeBg: 'bg-orange-500 text-white', Icon: Utensils };
  }
  return { emoji: '🏪', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', activeBg: 'bg-primary text-white', Icon: StoreIcon };
};

const CATEGORIES = ['Food', 'Laundry', 'Electrical', 'Beauty'];

const HUBS = [
  { label: 'Kisasa', lat: -6.1630, lng: 35.7516 },
  { label: 'Central Dodoma', lat: -6.1700, lng: 35.7400 },
  { label: 'Makulu', lat: -6.1800, lng: 35.7600 },
  { label: 'Area D', lat: -6.1550, lng: 35.7450 },
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
  const displayCat = (store as any).cat || store.category;
  const cfg = getCategoryConfig(store);
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
            <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full shadow-sm backdrop-blur-md ${store.availability ? 'bg-success/90 text-primary-foreground' : 'bg-black/50 text-white'
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
          <div className="absolute bottom-3 inset-x-3 flex justify-between items-end gap-2">
            <div className={`flex items-center gap-1 ${cfg.bg} border px-2 py-1 rounded-full bg-background/95 backdrop-blur shadow-sm max-w-[120px] shrink min-w-0`}>
              {/* <span className="text-xs shrink-0">{cfg.emoji}</span> */}
              <span className={`text-[9px] font-extrabold uppercase tracking-wider ${cfg.color} truncate whitespace-nowrap`}>{displayCat}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm shrink-0">
              <Star className="w-4 h-4 fill-warning stroke-warning" />
              <span className="text-white text-sm font-extrabold">{store.rating || '—'}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1 bg-card">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="notranslate font-extrabold text-foreground text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors flex-1" translate="no">
              {store.store || (store as any).name}
            </h3>
            {store.isVerified && (
              <CheckCircle2 className="w-5 h-5 text-sky-500 shrink-0" />
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
  const displayCat = (store as any).cat || store.category;
  const cfg = getCategoryConfig(store);
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
            <h3 className="notranslate font-extrabold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors" translate="no">
              {store.store || (store as any).name}
            </h3>
            {store.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
          </div>

          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.bg} border ${cfg.color} max-w-[110px] truncate whitespace-nowrap inline-block align-middle`}>
              {cfg.emoji} {displayCat}
            </span>
            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${store.availability ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
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
import { useLocationStore } from '../../location/store/useLocationStore';
import { getDeliveryFee } from '../../location/hooks/useDynamicPrice';

export const StoreListingPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentLocation } = useLocationStore();

  const [activeHub, setActiveHub] = useState(0);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(
    searchParams.get('category') || null
  );
  const [expandedMainCategories, setExpandedMainCategories] = useState<Record<string, boolean>>({});

  const toggleExpandMain = (mainCat: string) => {
    setExpandedMainCategories(prev => ({
      ...prev,
      [mainCat]: !prev[mainCat]
    }));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state (20 items initially, loads +20 on scroll)
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(searchParams.get('available') === 'true');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'popular'>(
    (searchParams.get('sort') as any) || 'rating'
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

  const { data: firestoreCategories = [] } = useQuery({
    queryKey: ['CategoriesCollectionStoreListing'],
    queryFn: async () => {
      try {
        const snap = await getDocs(collection(db, 'Categories'));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        return [];
      }
    }
  });

  // Extract dynamic main categories & sub-categories from Firestore Categories collection & store documents
  const categoryHierarchy = React.useMemo(() => {
    const map = new Map<string, Set<string>>();
    const EXCLUDED_CATS = ['all stores', 'all providers', 'all products', 'all'];

    // 1. Populate from Firestore Categories collection using the "category" field
    (Array.isArray(firestoreCategories) ? firestoreCategories : []).forEach((catDoc: any) => {
      const rawCat = catDoc.category || catDoc.name;
      if (rawCat && typeof rawCat === 'string' && rawCat.trim()) {
        const cleanMain = rawCat.trim();
        const normKey = cleanMain.toLowerCase();
        if (EXCLUDED_CATS.includes(normKey)) return;

        let existingKey = Array.from(map.keys()).find(k => k.toLowerCase() === normKey);
        if (!existingKey) {
          map.set(cleanMain, new Set<string>());
          existingKey = cleanMain;
        }

        if (Array.isArray(catDoc.subCategories)) {
          catDoc.subCategories.forEach((sub: any) => {
            const subStr = typeof sub === 'string' ? sub : sub?.name;
            if (subStr && typeof subStr === 'string' && subStr.trim()) {
              map.get(existingKey!)!.add(subStr.trim());
            }
          });
        }
      }
    });

    // 2. Populate dynamically from store documents fetched from Firestore
    (Array.isArray(allStores) ? allStores : []).forEach((s) => {
      const rawMain = (s as any).mainCategory || (s as any).mainCat || s.category;
      const subCat = (s as any).cat || (s as any).subCategory;
      if (rawMain && typeof rawMain === 'string' && rawMain.trim()) {
        const cleanMain = rawMain.trim();
        const normKey = cleanMain.toLowerCase();
        if (EXCLUDED_CATS.includes(normKey)) return;

        let existingKey = Array.from(map.keys()).find(k => k.toLowerCase() === normKey);
        if (!existingKey) {
          map.set(cleanMain, new Set<string>());
          existingKey = cleanMain;
        }
        if (subCat && typeof subCat === 'string' && subCat.trim()) {
          map.get(existingKey!)!.add(subCat.trim());
        }
      }
    });

    return Array.from(map.entries()).map(([mainCat, subSet]) => ({
      mainCategory: mainCat,
      subCategories: Array.from(subSet),
    }));
  }, [firestoreCategories, allStores]);

  const dynamicCategories = React.useMemo(() => {
    const catsSet = new Set<string>();
    allStores.forEach((s) => {
      const docCat = (s as any).cat || s.category;
      if (docCat && typeof docCat === 'string' && docCat.trim()) {
        catsSet.add(docCat.trim());
      }
    });
    return Array.from(catsSet);
  }, [allStores]);

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatchStore(s: any, query: string): boolean {
  if (!query || !query.trim()) return true;
  const q = query.toLowerCase().trim();

  const targets = [
    s.store || '',
    s.name || '',
    s.description || '',
    s.address || '',
    s.cat || '',
    s.category || '',
    s.mainCategory || '',
    s.subCategory || '',
  ].map(t => String(t).toLowerCase().trim());

  if (targets.some(t => t.includes(q))) return true;

  const qTokens = q.split(/\s+/).filter(Boolean);
  return qTokens.every(qToken => {
    return targets.some(target => {
      if (target.includes(qToken)) return true;

      const words = target.split(/\s+/).filter(Boolean);
      return words.some(word => {
        if (qToken.length <= 3) return word === qToken;
        const maxDist = qToken.length <= 5 ? 1 : 2;
        return levenshteinDistance(qToken, word) <= maxDist;
      });
    });
  });
}

  const processedStores = (Array.isArray(allStores) ? allStores : [])
    .map((s) => ({
      ...s,
      distance: s.location
        ? storeService.calculateDistance(hub.lat, hub.lng, s.location.lat, s.location.lng)
        : 99.9,
    }))
    .filter((s) => {
      // Exclude invalid, empty, dummy, or undefined store documents
      if (!s || !s.id || !s.store || s.store === 'Store' || !s.store.trim() || s.store.toLowerCase() === 'undefined') return false;

      if (s.availability === false || (s as any).availability === 'false' || (s as any).available === false || (s as any).isAvailable === false) return false;

      if (currentLocation && s.location) {
        const fee = getDeliveryFee(currentLocation, s.location, s.id, false, true);
        if (fee > 10000) return false;
      }

      if (selectedSubCategory) {
        const storeSubCat = ((s as any).cat || (s as any).subCategory || (s as any).subCat || s.subCategory || '').toLowerCase().trim();
        const storeMainCat = ((s as any).mainCategory || (s as any).mainCat || s.category || '').toLowerCase().trim();
        const subLower = selectedSubCategory.toLowerCase().trim();
        if (storeSubCat !== subLower && !storeSubCat.includes(subLower) && storeMainCat !== subLower && !storeMainCat.includes(subLower)) return false;
      } else if (selectedMainCategory) {
        const storeMainCat = ((s as any).mainCategory || (s as any).mainCat || (s as any).cat || s.category || '').toLowerCase().trim();
        const mainLower = selectedMainCategory.toLowerCase().trim();
        if (storeMainCat !== mainLower && !storeMainCat.includes(mainLower) && !mainLower.includes(storeMainCat)) return false;
      }

      if (onlyOpen && !s.availability) return false;
      if (onlyVerified && !s.isVerified) return false;
      if (searchQuery && !fuzzyMatchStore(s, searchQuery)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;

        const timeA = (a as any).time || (a as any).createdAt || '';
        const timeB = (b as any).time || (b as any).createdAt || '';
        if (timeA && timeB) return timeB.localeCompare(timeA);
        if (timeB) return 1;
        if (timeA) return -1;

        return 0;
      }
      if (sortBy === 'popular') return (b.reviewCount || 0) - (a.reviewCount || 0);
      return a.distance - b.distance;
    });

  // Reset pagination when category, search query, location hub, or filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [selectedMainCategory, selectedSubCategory, searchQuery, activeHub, onlyOpen, onlyVerified, sortBy]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 20);
        }
      },
      { threshold: 0.1 }
    );

    const target = loadMoreRef.current;
    observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [processedStores.length, visibleCount]);

  const displayedStores = processedStores.slice(0, visibleCount);
  const hasMore = visibleCount < processedStores.length;

  const activeFiltersCount = [onlyOpen, onlyVerified, !!selectedMainCategory, !!selectedSubCategory].filter(Boolean).length;

  const clearAll = () => {
    setSelectedMainCategory(null);
    setSelectedSubCategory(null);
    setSearchQuery('');
    setOnlyOpen(false);
    setOnlyVerified(false);
    setSortBy('rating');
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
                {(selectedMainCategory || selectedSubCategory) && (
                  <button onClick={() => { setSelectedMainCategory(null); setSelectedSubCategory(null); }} className="text-[10px] text-destructive font-bold hover:underline">Clear</button>
                )}
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() => { setSelectedMainCategory(null); setSelectedSubCategory(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left text-sm font-bold ${!selectedMainCategory && !selectedSubCategory ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  <span className="text-base w-6 text-center shrink-0">🏪</span>
                  All Providers
                </button>
                {categoryHierarchy.map((item) => {
                  const isMainActive = selectedMainCategory === item.mainCategory;
                  const cfg = getCategoryBadgeConfig(item.mainCategory);

                  return (
                    <button
                      key={item.mainCategory}
                      onClick={() => {
                        setSelectedMainCategory(isMainActive ? null : item.mainCategory);
                        setSelectedSubCategory(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left text-sm font-bold border cursor-pointer ${isMainActive
                          ? `${cfg.activeBg} border-transparent shadow-sm`
                          : 'bg-card text-foreground border-border hover:bg-muted hover:border-primary/30'
                        }`}
                    >
                      <span className="text-base w-6 text-center shrink-0">{cfg.emoji || '🏪'}</span>
                      <span className="flex-1 truncate">{item.mainCategory}</span>
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left text-sm font-bold ${activeHub === i ? 'bg-success text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
              className={`lg:hidden relative flex items-center gap-1.5 px-4 py-3 rounded-xl border font-bold text-xs transition-all ${showFilters || activeFiltersCount > 0
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
              onClick={() => { setSelectedMainCategory(null); setSelectedSubCategory(null); }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold border transition-all ${!selectedMainCategory && !selectedSubCategory
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                }`}
            >
              <span className="text-xs shrink-0">🏪</span>
              All
            </button>
            {categoryHierarchy.map((item) => {
              const cfg = getCategoryBadgeConfig(item.mainCategory);
              const isActive = selectedMainCategory === item.mainCategory;
              return (
                <button
                  key={item.mainCategory}
                  onClick={() => {
                    setSelectedMainCategory(isActive ? null : item.mainCategory);
                    setSelectedSubCategory(null);
                  }}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold border transition-all max-w-[130px] whitespace-nowrap ${isActive
                      ? `${cfg.activeBg} border-transparent shadow-md`
                      : `bg-card border-border ${cfg.color} hover:border-primary/30`
                    }`}
                >
                  <span className="text-xs shrink-0">{cfg.emoji || '🏪'}</span>
                  <span className="truncate">{item.mainCategory}</span>
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${sortBy === value
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
                          className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition-all ${activeHub === i
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

          {/* ── Results Header ───────────────────────── */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Providers List</h2>
            <span className="text-sm font-bold text-muted-foreground">
              Showing {Math.min(visibleCount, processedStores.length)} of {processedStores.length} Stores
            </span>
          </div>

          {/* ── Results ───────────────────────────────────────── */}
          {isLoading ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4' : 'space-y-3'}>
              {Array.from({ length: 8 }).map((_, i) => (
                viewMode === 'grid' ? (
                  <StoreCardSkeleton key={i} />
                ) : (
                  <StoreListCardSkeleton key={i} />
                )
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
          ) : (
            <>
              {viewMode === 'grid' ? (
                /* ── Grid View ─ */
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
                >
                  <AnimatePresence>
                    {displayedStores.map((store) => (
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
                    {displayedStores.map((store) => (
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

              {hasMore && (
                <div ref={loadMoreRef} className="col-span-full py-8 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold text-muted-foreground">Loading more stores...</span>
                </div>
              )}
            </>
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
                  {
                    icon: Sparkles,
                    iconBg: 'bg-sky-500/10 text-sky-500',
                    title: 'Book Laundry',
                    sub: 'Express pickup',
                    href: '/laundry',
                  },
                  {
                    icon: ShoppingBag,
                    iconBg: 'bg-emerald-500/10 text-emerald-500',
                    title: 'My Orders',
                    sub: 'Track deliveries',
                    href: '/orders',
                  },
                  {
                    icon: Heart,
                    iconBg: 'bg-rose-500/10 text-rose-500',
                    title: 'Favourites',
                    sub: 'Saved items',
                    href: '/favorites',
                  },
                ].map(({ icon: Icon, iconBg, title, sub, href }) => (
                  <motion.button
                    key={title}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate(href)}
                    className="bg-card hover:bg-muted text-foreground rounded-2xl p-3 flex items-center gap-3 text-left shadow-sm hover:shadow-md transition-all border border-border group cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-extrabold text-xs leading-tight text-foreground">{title}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">{sub}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* TRUST STATS BAND */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider text-foreground">Platform Stats</h2>
              <div className="grid grid-cols-1 gap-4">
                {STATS.map(({ value, label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-lg font-extrabold leading-tight text-foreground">{value}</span>
                      <span className="block text-[10px] text-muted-foreground font-semibold uppercase">{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HELP & SAFETY WIDGET */}
            <HelpSafetyWidget />

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
