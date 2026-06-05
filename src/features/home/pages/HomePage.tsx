import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import {
  Utensils, Shirt, Zap, Sparkles, Car,
  ChevronRight, Star, MapPin, CheckCircle2,
  Navigation, Clock, TrendingUp, Tag, Store as StoreIcon,
  ShoppingBag, Package, Bell, ArrowRight, Flame,
  Search, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { storeService, Store } from '../../stores/services/storeService';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { useCartStore } from '../../cart/store/useCartStore';
import { APP_SETTINGS } from '@/core/config/settings';

/* ─── Shared Configs ──────────────────────────────────────── */
const CAT_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  Food:       { emoji: '🍽️', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
  Laundry:    { emoji: '🧺', color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/20' },
  Products:   { emoji: '🛍️', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Electrical: { emoji: '⚡', color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  Beauty:     { emoji: '💅', color: 'text-primary', bg: 'bg-primary/5 border-primary/10' },
  Rides:      { emoji: '🚗', color: 'text-success', bg: 'bg-success/10 border-success/20' },
};

/* ─── Static Data ─────────────────────────────────────────── */
const CATEGORIES = [
  { name: 'Food', icon: Utensils, color: 'from-primary/90 to-primary/70', light: 'bg-primary/10 text-primary', href: '/food', emoji: '🍽️' },
  { name: 'Laundry', icon: Shirt, color: 'from-secondary to-secondary/80', light: 'bg-secondary/10 text-secondary', href: '/laundry', emoji: '🧺' },
  { name: 'Products', icon: Package, color: 'from-emerald-500/90 to-emerald-500/70', light: 'bg-emerald-500/20 text-emerald-500', href: '/products', emoji: '🛍️' },
  { name: 'Electrical', icon: Zap, color: 'from-warning/90 to-warning/70', light: 'bg-warning/20 text-warning', href: '/explore?category=Electrical', emoji: '⚡' },
  { name: 'Beauty', icon: Sparkles, color: 'from-primary to-primary/80', light: 'bg-primary/20 text-primary', href: '/explore?category=Beauty', emoji: '💅' },
  { name: 'Rides', icon: Car, color: 'from-success/90 to-success/70', light: 'bg-success/20 text-success', href: '/explore?category=Rides', emoji: '🚗' },
];

const PROMOS = [
  {
    id: 1,
    badge: '🔥 Limited Offer',
    title: '50% Off First Laundry',
    subtitle: 'Fresh & pressed — use code WASH50',
    image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?q=80&w=800&auto=format&fit=crop',
    cta: 'Order Now',
    href: '/laundry',
    gradient: 'from-primary via-primary/80 to-primary/60',
  },
  {
    id: 2,
    badge: '🍕 Today Only',
    title: 'Free Delivery on Food',
    subtitle: 'From top-rated kitchens near you',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    cta: 'Order Food',
    href: '/food',
    gradient: 'from-secondary via-secondary/80 to-secondary/60 text-secondary-foreground',
  },
  {
    id: 3,
    badge: '⚡ Fast Response',
    title: 'Electricians In 30 min',
    subtitle: 'Certified pros ready near you',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop',
    cta: 'Book Fundi',
    href: '/explore?category=Electrical',
    gradient: 'from-warning via-warning/80 to-warning/60 text-primary-foreground',
  },
];

const DISCOVERY_PILLS = [
  { label: 'Near Me', icon: Navigation, href: '/explore?sort=nearest', style: 'bg-success text-primary-foreground' },
  { label: 'Open Now', icon: Clock, href: '/explore?available=true', style: 'bg-secondary text-secondary-foreground' },
  { label: 'Trending', icon: Flame, href: '/explore?sort=popular', style: 'bg-destructive text-primary-foreground' },
  { label: 'Deals', icon: Tag, href: '/explore?sort=savings', style: 'bg-warning text-primary-foreground' },
  { label: 'All Stores', icon: StoreIcon, href: '/explore', style: 'bg-muted-foreground text-primary-foreground' },
];

const STATS = [
  { value: '200+', label: 'Providers', icon: StoreIcon },
  { value: '4.8★', label: 'Avg Rating', icon: Star },
  { value: '30min', label: 'Avg Delivery', icon: Clock },
  { value: '24/7', label: 'Support', icon: Bell },
];

/* ─── Hero Promo Dot Indicator ────────────────────────────── */
const DotIndicator = ({ count, active }: { count: number; active: number }) => (
  <div className="flex items-center justify-center gap-1.5 mt-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={`rounded-full transition-all duration-300 ${
          i === active ? 'w-5 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-muted-foreground/30'
        }`}
      />
    ))}
  </div>
);

/* ─── Store Card ──────────────────────────────────────────── */
const FeaturedStoreCard = ({ store, onClick, isFav, onFav }: {
  store: Store & { distance?: number };
  onClick: () => void;
  isFav: boolean;
  onFav: (e: React.MouseEvent) => void;
}) => {
  const cfg = CAT_CONFIG[store.category] || CAT_CONFIG.Food;
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="shrink-0 w-[80%] sm:w-[45%] xl:w-[30%] 2xl:w-[23%] cursor-pointer group"
    >
      <div className="bg-card rounded-3xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full group-hover:-translate-y-1">
        {/* Cover image */}
        <div className="relative aspect-square w-full overflow-hidden bg-muted shrink-0">
          <img
            src={store.imgURL}
            alt={store.store}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-40 group-hover:opacity-50 transition-opacity" />

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

        {/* Info */}
        <div className="p-5 flex flex-col flex-1 bg-card">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="font-extrabold text-foreground text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors flex-1">
              {store.store}
            </h3>
            {store.isVerified && (
              <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50 text-base">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-5 h-5 text-success shrink-0" />
              <span className="font-bold text-foreground">{store.address || 'Nairobi'}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Main HomePage ───────────────────────────────────────── */
export const HomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { openModal } = useAuthModalStore();
  const { items: cartItems, getTotals } = useCartStore();
  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;

  const [favorites, setFavorites] = useState<string[]>(() => {
    const s = localStorage.getItem('tulete_favorite_stores');
    return s ? JSON.parse(s) : [];
  });
  const promoRef = useRef<HTMLDivElement>(null);
  const openNowRef = useRef<HTMLDivElement>(null);
  const topRatedRef = useRef<HTMLDivElement>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning ☀️' : hour < 17 ? 'Good afternoon 👋' : 'Good evening 🌙';
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  const { data: storesData, isLoading } = useFirestoreQuery(
    ['stores', 'home'],
    storeService,
    { limit: 12 }
  );

  const stores = storesData?.data || [];
  const topStores = [...stores].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const openStores = topStores.filter(s => s.availability);

  // Interval-based snapping for Promo Carousel (Holds for 5 seconds so users can read)
  useEffect(() => {
    const t = setInterval(() => {
      if (promoRef.current && !promoRef.current.matches(':hover')) {
        const { scrollLeft, scrollWidth, clientWidth } = promoRef.current;
        const cardWidth = promoRef.current.firstElementChild?.clientWidth || 300;
        
        if (scrollLeft >= scrollWidth - clientWidth - 10) {
          promoRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          promoRef.current.scrollBy({ left: cardWidth + 16, behavior: 'smooth' });
        }
      }
    }, 5000);
    return () => clearInterval(t);
  }, []);


  // Auto-scroll product carousels (Continuous Smooth Sliding)
  useEffect(() => {
    let req1: number;
    let req2: number;

    const startScrolling = (ref: React.RefObject<HTMLDivElement>, speed: number, reqIdSetter: (id: number) => void) => {
      let accumulator = 0;
      const scroll = () => {
        if (!ref.current) return;
        
        // Pause scrolling if user is hovering over the carousel
        if (!ref.current.matches(':hover')) {
          accumulator += speed;
          if (accumulator >= 1) {
            const pixels = Math.floor(accumulator);
            accumulator -= pixels;
            
            const { scrollLeft, scrollWidth, clientWidth } = ref.current;
            const maxScroll = scrollWidth - clientWidth;

            if (scrollLeft >= maxScroll - 1) {
              ref.current.scrollLeft = 0;
            } else {
              ref.current.scrollLeft += pixels;
            }
          }
        }
        
        reqIdSetter(requestAnimationFrame(scroll));
      };
      reqIdSetter(requestAnimationFrame(scroll));
    };

    startScrolling(openNowRef, 0.6, (id) => req1 = id);
    startScrolling(topRatedRef, 0.4, (id) => req2 = id);
    
    return () => {
      cancelAnimationFrame(req1);
      cancelAnimationFrame(req2);
    };
  }, [openStores.length, topStores.length]);

  const toggleFav = (storeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.includes(storeId)
      ? favorites.filter(id => id !== storeId)
      : [...favorites, storeId];
    setFavorites(updated);
    localStorage.setItem('tulete_favorite_stores', JSON.stringify(updated));
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    navigate('/cart');
  };

  return (
    <PageContainer>
      <div className="flex w-full bg-background h-[calc(100vh-4rem)] overflow-hidden relative">

        {/* ── LEFT SIDEBAR (CATEGORIES) ── */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-2">
            <h2 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Browse Services</h2>
            {CATEGORIES.map((cat, i) => (
              <motion.button
                key={cat.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(cat.href)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left group"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center text-primary-foreground shadow-sm group-hover:scale-105 transition-transform shrink-0`}>
                  <span className="text-sm">{cat.emoji}</span>
                </div>
                <span className="font-bold text-sm text-muted-foreground group-hover:text-foreground transition-colors">{cat.name}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── CENTER/MAIN COLUMN ── */}
        <div className="flex-auto min-w-0 max-w-full h-full overflow-y-auto scrollbar-none pt-6 pb-28 px-4 lg:px-8 xl:px-10 space-y-8">

          {/* ── HEADER SECTION ─────────────────────────────────── */}
        <div className="pt-2 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">{greeting}</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Hi, <span className="text-primary">{firstName}</span>!
              </h1>
              <p className="text-base text-muted-foreground mt-1">What can we get for you today?</p>
            </div>
            <button
              onClick={() => navigate('/notifications')}
              className="relative w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
            >
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card" />
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/discover')}
            className="w-full flex items-center gap-3 bg-card hover:bg-muted border border-border rounded-2xl px-5 py-4 text-muted-foreground text-sm font-medium transition-all shadow-sm"
          >
            <Search className="w-5 h-5 shrink-0" />
            <span>Search stores, food, laundry providers...</span>
          </motion.button>
        </div>

          {/* PROMO CAROUSEL */}
          <div>
              <div
                ref={promoRef}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2"
              >
                {PROMOS.map((promo, i) => (
                  <motion.div
                    key={promo.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="snap-center shrink-0 w-[85%] sm:w-[60%] lg:w-[50%] xl:w-[45%]"
                  >
                    <div
                      onClick={() => navigate(promo.href)}
                      className="relative h-72 rounded-3xl overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all border border-border/50"
                    >
                      <img
                        src={promo.image}
                        alt={promo.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-br ${promo.gradient} opacity-45`} />
                      <div className="absolute inset-0 p-6 flex flex-col justify-between">
                        <span className="self-start bg-background/20 backdrop-blur text-primary-foreground text-xs font-extrabold px-3.5 py-1.5 rounded-full">
                          {promo.badge}
                        </span>
                        <div className={promo.id === 2 ? "text-secondary-foreground" : "text-primary-foreground"}>
                          <h3 className="font-extrabold text-2xl leading-tight mb-1.5 drop-shadow-md">{promo.title}</h3>
                          <p className="opacity-90 text-sm font-medium mb-4">{promo.subtitle}</p>
                          <span className="inline-flex items-center gap-2 bg-background text-foreground text-xs font-extrabold px-5 py-2.5 rounded-full hover:scale-105 transition-transform shadow-sm">
                            {promo.cta} <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CATEGORIES (Mobile Only) */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold text-foreground">Browse Services</h2>
                <button onClick={() => navigate('/explore')} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                  See all <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {CATEGORIES.map((cat, i) => (
                  <motion.button
                    key={cat.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => navigate(cat.href)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-primary-foreground shadow-sm group-hover:shadow-md transition-all`}>
                      <span className="text-xl sm:text-2xl leading-none">{cat.emoji}</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground text-center leading-tight">
                      {cat.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* DISCOVERY PILLS */}
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
              {DISCOVERY_PILLS.map(({ label, icon: Icon, href, style }) => (
                <motion.button
                  key={label}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => navigate(href)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-extrabold shadow-sm hover:shadow-md transition-all ${style}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </motion.button>
              ))}
            </div>

            {/* OPEN NOW */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                  <h2 className="text-lg font-extrabold text-foreground">Open Right Now</h2>
                </div>
                <button
                  onClick={() => navigate('/explore?available=true')}
                  className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div ref={openNowRef} className="flex gap-4 overflow-x-auto scrollbar-none pb-4">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="shrink-0 w-[80%] sm:w-[48%] lg:w-[45%] xl:w-[40%]">
                      <Skeleton className="h-52 w-full rounded-2xl" />
                    </div>
                  ))
                ) : openStores.length > 0 ? (
                  openStores.slice(0, 6).map((store) => (
                    <FeaturedStoreCard
                      key={store.id}
                      store={store}
                      onClick={() => navigate(`/store/${store.id}`)}
                      isFav={favorites.includes(store.id)}
                      onFav={(e) => toggleFav(store.id, e)}
                    />
                  ))
                ) : (
                  <div className="py-10 text-center text-muted-foreground text-sm border border-dashed border-border rounded-2xl w-full">No open stores found.</div>
                )}
              </div>
            </div>

            {/* TOP RATED */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-warning stroke-warning" />
                  <h2 className="text-lg font-extrabold text-foreground">Top Rated</h2>
                </div>
                <button
                  onClick={() => navigate('/explore')}
                  className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  Explore <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div ref={topRatedRef} className="flex gap-4 overflow-x-auto scrollbar-none pb-4">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="snap-center shrink-0 w-[80%] sm:w-[48%] lg:w-[45%] xl:w-[40%]">
                      <Skeleton className="h-52 w-full rounded-2xl" />
                    </div>
                  ))
                ) : topStores.slice(0, 6).map((store) => (
                  <FeaturedStoreCard
                    key={store.id}
                    store={store}
                    onClick={() => navigate(`/store/${store.id}`)}
                    isFav={favorites.includes(store.id)}
                    onFav={(e) => toggleFav(store.id, e)}
                  />
                ))}
              </div>
            </div>

        </div>

        {/* ── RIGHT SIDEBAR (WIDGETS & CART) ── */}
        <div className="hidden xl:block flex-none w-[320px] shrink-0 border-l border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-6">
              
              {/* LIVE CART WIDGET */}
              {hasItems && (
                <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Your Order</h2>
                    <ShoppingBag className="w-4 h-4 text-primary" />
                  </div>

                  <div className="space-y-3 mb-4 max-h-[250px] overflow-y-auto scrollbar-none">
                    {cartItems.map((cartItem) => (
                      <div key={cartItem.productId} className="flex justify-between items-center text-sm">
                        <span className="font-bold text-muted-foreground line-clamp-1 flex-1">
                          {cartItem.quantity}x {cartItem.name}
                        </span>
                        <span className="font-extrabold text-foreground shrink-0 ml-3">
                          {APP_SETTINGS.currency} {(cartItem.price * cartItem.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center mb-5">
                      <span className="text-sm font-bold text-muted-foreground">Total</span>
                      <span className="text-xl font-extrabold text-foreground">{APP_SETTINGS.currency} {cartTotal.toLocaleString()}</span>
                    </div>
                    <Button
                      onClick={handleCheckout}
                      className="w-full rounded-xl py-4 font-extrabold shadow-md flex items-center justify-center gap-2"
                    >
                      Checkout Now <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* QUICK ACTION CARDS (Hidden if cart is full to save space, or shown below) */}
              {!hasItems && (
                <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Quick Actions</h2>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      emoji: '🧺',
                      title: 'Book Laundry',
                      sub: 'Express pickup',
                      href: '/laundry',
                      gradient: 'from-primary/90 to-primary/70 text-primary-foreground',
                    },
                    {
                      emoji: '📦',
                      title: 'My Orders',
                      sub: 'Track deliveries',
                      href: '/orders',
                      gradient: 'from-secondary to-secondary/80 text-secondary-foreground',
                    },
                    {
                      emoji: '❤️',
                      title: 'Favourites',
                      sub: 'Saved items',
                      href: '/favorites',
                      gradient: 'from-warning/90 to-warning/70 text-warning-foreground',
                    },
                    {
                      emoji: '🏪',
                      title: 'All Stores',
                      sub: 'Browse network',
                      href: '/explore',
                      gradient: 'from-success/90 to-success/70 text-success-foreground',
                    },
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
              )}

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

        {/* MOBILE FLOATING CHECKOUT BAR */}
        <AnimatePresence>
          {hasItems && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="xl:hidden fixed bottom-20 left-4 right-4 z-50"
            >
              <Button
                onClick={handleCheckout}
                className="w-full py-6 text-base font-extrabold shadow-2xl flex items-center justify-between px-6 rounded-3xl bg-primary text-primary-foreground"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-background/20 px-3 py-1 rounded-full text-xs">
                    {cartItems.length}
                  </div>
                  <span>Checkout</span>
                </div>
                <span>{APP_SETTINGS.currency} {cartTotal.toLocaleString()} <ArrowRight className="inline-block ml-1 w-4 h-4" /></span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageContainer>
  );
};
