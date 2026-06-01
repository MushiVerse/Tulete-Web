import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeService, Store } from '../services/storeService';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { Badge } from '../../../shared/components/ui/Badge';
import { 
  Search, MapPin, Compass, Grid, List, 
  Map, Star, CheckCircle2, Heart, ExternalLink, Filter, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Nairobi coordinate selections to test distance calculations dynamically
const HUBS = [
  { label: 'Kilimani Center', lat: -1.2894, lng: 36.7909 },
  { label: 'Westlands Mall', lat: -1.2635, lng: 36.8049 },
  { label: 'CBD Kenyatta Ave', lat: -1.2821, lng: 36.8185 },
  { label: 'Hurlingham Plaza', lat: -1.2941, lng: 36.7981 },
];

export const StoreListingPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [activeHubIndex, setActiveHubIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  
  // Local persistence for favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('tulete_favorite_stores');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeMapStore, setActiveMapStore] = useState<Store | null>(null);

  const activeHub = HUBS[activeHubIndex];

  // Toggle favorite
  const toggleFavorite = (storeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.includes(storeId)
      ? favorites.filter(id => id !== storeId)
      : [...favorites, storeId];
    setFavorites(updated);
    localStorage.setItem('tulete_favorite_stores', JSON.stringify(updated));
  };

  const stores = storeService.getMockStores();

  // Filter & calculate distances
  const processedStores = stores
    .map((store) => {
      const distance = store.location
        ? storeService.calculateDistance(
            activeHub.lat,
            activeHub.lng,
            store.location.lat,
            store.location.lng
          )
        : 99.9;
      return { ...store, distance };
    })
    .filter((store) => {
      const categoryMatch = !selectedCategory || store.category === selectedCategory;
      const searchMatch =
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.address.toLowerCase().includes(searchQuery.toLowerCase());
      const openMatch = !onlyOpen || store.isOpen;
      const verifiedMatch = !onlyVerified || store.isVerified;

      return categoryMatch && searchMatch && openMatch && verifiedMatch;
    })
    // Sort primarily by proximity (location-aware ranking)
    .sort((a, b) => a.distance - b.distance);

  // Categories list
  const categories = ['Food', 'Laundry', 'Electrical', 'Beauty', 'Rides'];

  // HUD Vector Map drawer for 'map' view mode
  useEffect(() => {
    if (viewMode !== 'map') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let pulseAngle = 0;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect?.width || 600;
      canvas.height = rect?.height || 500;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Map Nairobi coordinates bounds dynamically to fit canvas size
    // Lat range: [-1.30, -1.25]
    // Lng range: [36.78, 36.83]
    const mapCoordsToCanvas = (lat: number, lng: number) => {
      const minLat = -1.305;
      const maxLat = -1.255;
      const minLng = 36.780;
      const maxLng = 36.830;

      const x = ((lng - minLng) / (maxLng - minLng)) * canvas.width;
      const y = (1 - (lat - minLat) / (maxLat - minLat)) * canvas.height;
      return { x, y };
    };

    const drawMap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Grid System
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw active user location hub node
      const hubPos = mapCoordsToCanvas(activeHub.lat, activeHub.lng);
      pulseAngle += 0.04;
      const pulseRad = 15 + Math.sin(pulseAngle) * 5;

      ctx.beginPath();
      ctx.arc(hubPos.x, hubPos.y, pulseRad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(79, 70, 229, 0.15)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(hubPos.x, hubPos.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#4f46e5';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#4f46e5';
      ctx.fillText('Your Location', hubPos.x - 36, hubPos.y - 14);

      // Draw stores pins
      processedStores.forEach((store) => {
        if (!store.location) return;
        const storePos = mapCoordsToCanvas(store.location.lat, store.location.lng);
        const isActive = activeMapStore?.id === store.id;

        // Pulsing highlights for focused store pin
        if (isActive) {
          ctx.beginPath();
          ctx.arc(storePos.x, storePos.y, 16 + Math.sin(pulseAngle * 1.5) * 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(storePos.x, storePos.y, isActive ? 9 : 7, 0, Math.PI * 2);
        ctx.fillStyle = store.isOpen ? '#10b981' : '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(store.name, storePos.x - 30, storePos.y + 18);
      });

      animationId = requestAnimationFrame(drawMap);
    };

    drawMap();

    // Mouse click handler to select pins
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found = false;
      for (const store of processedStores) {
        if (!store.location) continue;
        const storePos = mapCoordsToCanvas(store.location.lat, store.location.lng);
        // Collision threshold
        const dist = Math.sqrt(Math.pow(mouseX - storePos.x, 2) + Math.pow(mouseY - storePos.y, 2));
        if (dist < 15) {
          setActiveMapStore(store);
          found = true;
          break;
        }
      }
      if (!found) {
        setActiveMapStore(null);
      }
    };

    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('click', handleCanvasClick);
      cancelAnimationFrame(animationId);
    };
  }, [viewMode, processedStores, activeHub, activeMapStore]);

  return (
    <PageWrapper className="py-6 px-4 max-w-6xl mx-auto">
      {/* Location awareness selector header */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Compass className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">GPS Hub Location</span>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Proximity Centered: {activeHub.label}
              </h2>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {HUBS.map((hub, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveHubIndex(idx);
                setActiveMapStore(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeHubIndex === idx
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-750 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
              }`}
            >
              {hub.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Discovery search toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stores, brands, or laundry providers..."
            className="pl-10 py-5 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-4 font-semibold text-xs border ${showFilters ? 'bg-primary/5 text-primary border-primary' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>

          {/* View mode toggle icons */}
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-900">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-slate-850 shadow-sm text-primary' : 'text-slate-500'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-slate-850 shadow-sm text-primary' : 'text-slate-500'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-md ${viewMode === 'map' ? 'bg-white dark:bg-slate-850 shadow-sm text-primary' : 'text-slate-500'}`}
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Horizontal Filter slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none mb-6">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
            selectedCategory === null
              ? 'bg-primary text-white border-primary shadow-md'
              : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
          }`}
        >
          All Providers
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              selectedCategory === cat
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Slide-out Filters bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <Card className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyOpen}
                    onChange={(e) => setOnlyOpen(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-slate-350 focus:ring-primary"
                  />
                  Open Stores Only
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyVerified}
                    onChange={(e) => setOnlyVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-slate-350 focus:ring-primary"
                  />
                  Verified Providers Only
                </label>
              </div>

              {(onlyOpen || onlyVerified) && (
                <button
                  onClick={() => {
                    setOnlyOpen(false);
                    setOnlyVerified(false);
                  }}
                  className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                >
                  Reset Filters
                </button>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid, List, or Map Views */}
      {viewMode === 'map' ? (
        /* MAP HUD MODULE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 h-[450px] relative overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-md rounded-2xl flex">
            <canvas ref={canvasRef} className="flex-1 w-full" />
          </Card>

          {/* Map details preview panel */}
          <div className="h-[450px] flex flex-col justify-center">
            {activeMapStore ? (
              <motion.div
                key={activeMapStore.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card 
                  onClick={() => navigate(`/store/${activeMapStore.id}`)}
                  className="p-5 border border-slate-150 dark:border-slate-800 shadow-xl cursor-pointer hover:border-primary transition-all bg-white dark:bg-slate-900"
                >
                  <img 
                    src={activeMapStore.bannerUrl} 
                    alt={activeMapStore.name} 
                    className="w-full h-32 rounded-xl object-cover mb-4"
                  />
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-1">{activeMapStore.name}</h3>
                    <Badge className={`${activeMapStore.isOpen ? 'bg-emerald-500' : 'bg-rose-500'} text-white border-0 text-[10px] py-0.5 px-2 font-bold`}>
                      {activeMapStore.isOpen ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{activeMapStore.description}</p>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-primary">{activeMapStore.category}</span>
                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                      {activeMapStore.rating} ({activeMapStore.reviewCount})
                    </span>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <div className="text-center p-8 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <MapPin className="w-10 h-10 text-slate-350 mx-auto mb-3 animate-bounce" />
                <h4 className="font-bold text-sm mb-1 text-slate-900 dark:text-white">Pin Exploration</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto">Click any pulsing store pin on the Nairobi coordinates map to preview.</p>
              </div>
            )}
          </div>
        </div>
      ) : processedStores.length === 0 ? (
        /* EMPTY STATE */
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
          <Compass className="w-12 h-12 text-slate-350 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-1 text-slate-900 dark:text-white">No Providers Found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto mb-6">
            We couldn't find any stores matching your current criteria or categories in this region.
          </p>
          <Button onClick={() => {
            setSelectedCategory(null);
            setSearchQuery('');
            setOnlyOpen(false);
            setOnlyVerified(false);
          }}>Clear All Filters</Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedStores.map((store) => (
            <motion.div
              key={store.id}
              onClick={() => navigate(`/store/${store.id}`)}
              className="group cursor-pointer"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <Card className="h-full overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="relative h-40 overflow-hidden bg-slate-100 flex-shrink-0">
                  <img 
                    src={store.bannerUrl} 
                    alt={store.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className={`${store.isOpen ? 'bg-emerald-500' : 'bg-rose-500'} text-white border-0 text-[10px] font-bold py-0.5 px-2 rounded-full shadow-md`}>
                      {store.isOpen ? 'Open Now' : 'Closed'}
                    </Badge>
                  </div>

                  <button
                    onClick={(e) => toggleFavorite(store.id, e)}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm hover:bg-white text-slate-600 hover:text-red-500 rounded-full shadow-md transition-all active:scale-95"
                  >
                    <Heart className={`w-4 h-4 ${favorites.includes(store.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">{store.category}</span>
                      {store.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />}
                    </div>
                    
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                      {store.name}
                    </h3>
                    <p className="text-xs text-slate-550 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                      {store.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-3 text-xs mt-auto">
                    <div className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-semibold text-slate-800 dark:text-slate-350">
                        {store.distance} km away
                      </span>
                    </div>

                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                      {store.rating} ({store.reviewCount})
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-4">
          {processedStores.map((store) => (
            <motion.div
              key={store.id}
              onClick={() => navigate(`/store/${store.id}`)}
              className="group cursor-pointer"
            >
              <Card className="p-4 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 items-center">
                <img 
                  src={store.logoUrl} 
                  alt={store.name} 
                  className="w-20 h-20 rounded-xl object-cover bg-slate-50 flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">
                      {store.name}
                    </h3>
                    {store.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                    <Badge className={`${store.isOpen ? 'bg-emerald-500' : 'bg-rose-500'} text-white border-0 text-[9px] py-0.5 px-2 rounded-full font-bold`}>
                      {store.isOpen ? 'Open' : 'Closed'}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                    {store.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span className="font-bold text-primary text-[10px] uppercase tracking-wider">{store.category}</span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      {store.distance} km away
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-300 flex items-center gap-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                      {store.rating} ({store.reviewCount})
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 self-stretch sm:self-center justify-end">
                  <button
                    onClick={(e) => toggleFavorite(store.id, e)}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-full transition-all active:scale-95"
                  >
                    <Heart className={`w-4 h-4 ${favorites.includes(store.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                  <Button variant="outline" size="sm" className="font-bold text-xs">
                    View
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
};
