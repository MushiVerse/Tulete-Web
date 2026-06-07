import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ArrowRight, ChevronRight, CheckCircle2, 
  MapPin, Star, Plus, Minus, Trash2, ShieldCheck, 
  ShoppingBag, Flame, Clock, Navigation, Phone
} from 'lucide-react';
import { PageContainer } from '../../../shared/components/layout';
import { Button } from '../../../shared/components/ui/Button';
import { useCartStore } from '../../cart/store/useCartStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { APP_SETTINGS } from '@/core/config/settings';

// --- Static Data ---
const FOOD_CATEGORIES = [
  { id: 'all', name: 'All Food', icon: '🍽️' },
  { id: 'fast_food', name: 'Fast Food', icon: '🍔' },
  { id: 'healthy', name: 'Healthy', icon: '🥗' },
  { id: 'local', name: 'Swahili Dishes', icon: '🥘' },
  { id: 'drinks', name: 'Beverages', icon: '🥤' },
  { id: 'desserts', name: 'Desserts', icon: '🍰' },
];

const PROMOS = [
  {
    id: 1,
    title: 'Free Delivery',
    subtitle: 'On your first 3 food orders',
    badge: 'NEW USER',
    color: 'from-orange-500 to-orange-400',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'Pizza Night',
    subtitle: 'Buy 1 Get 1 Free on Large Pizzas',
    badge: 'TRENDING',
    color: 'from-rose-500 to-rose-400',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
  }
];

const MEAL_ITEMS = [
  { id: 'm1', name: 'Classic Beef Burger', price: 850, category: 'fast_food', storeName: 'Burger Palace', storeId: 'sp1', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', rating: 4.8, time: '20-30 min' },
  { id: 'm2', name: 'Grilled Chicken Salad', price: 1200, category: 'healthy', storeName: 'Green Bowl', storeId: 'sp2', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', rating: 4.9, time: '15-25 min' },
  { id: 'm3', name: 'Nyama Choma Special', price: 1500, category: 'local', storeName: 'Swahili Plate', storeId: 'sp3', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', rating: 4.7, time: '30-45 min' },
  { id: 'm4', name: 'Fresh Mango Smoothie', price: 450, category: 'drinks', storeName: 'Juice Bar', storeId: 'sp4', image: 'https://images.unsplash.com/photo-1623065422900-0591585efa75?w=400', rating: 4.6, time: '10-15 min' },
  { id: 'm5', name: 'Chocolate Lava Cake', price: 600, category: 'desserts', storeName: 'Sweet Tooth', storeId: 'sp5', image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400', rating: 4.9, time: '15-20 min' },
  { id: 'm6', name: 'Spicy Chicken Wings', price: 950, category: 'fast_food', storeName: 'WingStop', storeId: 'sp6', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', rating: 4.5, time: '20-30 min' },
];

export const FoodPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart & Auth
  const { items: cartItems, addToCart, removeFromCart, updateQuantity, getTotals } = useCartStore();
  const { openModal } = useAuthModalStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const promoRef = useRef<HTMLDivElement>(null);

  // Snap-scroll Promo Banners
  useEffect(() => {
    if (PROMOS.length <= 1) return;
    
    let interval: NodeJS.Timeout;
    const autoScroll = () => {
      if (promoRef.current && !promoRef.current.matches(':hover')) {
        const { scrollLeft, scrollWidth, clientWidth } = promoRef.current;
        const maxScroll = scrollWidth - clientWidth;
        const cardWidth = promoRef.current.firstElementChild?.clientWidth || clientWidth / 2;
        
        let nextScroll = scrollLeft + cardWidth;
        if (nextScroll >= maxScroll - 10) {
          nextScroll = 0; // Wrap around
        }
        
        promoRef.current.scrollTo({ left: nextScroll, behavior: 'smooth' });
      }
    };
    
    interval = setInterval(autoScroll, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filter logic
  const filteredMeals = MEAL_ITEMS.filter(meal => {
    const matchesCat = activeCategory === 'all' || meal.category === activeCategory;
    const matchesSearch = meal.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          meal.storeName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  }).sort((a, b) => {
    const aInCart = cartItems.some(i => i.productId === a.id);
    const bInCart = cartItems.some(i => i.productId === b.id);
    if (aInCart && !bInCart) return -1;
    if (!aInCart && bInCart) return 1;
    return 0;
  });

  const { subtotal, deliveryFee, total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    navigate('/checkout');
  };

  return (
    <PageContainer>
      <div className="flex w-full bg-background h-[calc(100vh-4rem)] overflow-hidden relative">
        
        {/* ── LEFT SIDEBAR (CATEGORIES) ── */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-2">
            <h2 className="text-xs font-extrabold text-foreground mb-4 uppercase tracking-widest opacity-80">Food Categories</h2>
            {FOOD_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                  activeCategory === cat.id 
                    ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                {cat.name}
                {activeCategory === cat.id && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* ── CENTER/MAIN COLUMN ── */}
        <div className="flex-auto min-w-0 max-w-full h-full overflow-y-auto scrollbar-none pt-6 pb-32 xl:pb-28 px-4 lg:px-8 xl:px-10 space-y-8">
          
          {/* Header & Search */}
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight mb-2">
              Craving something? 🍕
            </h1>
            <p className="text-sm text-muted-foreground mb-6">Discover the best food and drinks near you.</p>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for meals, restaurants, or cuisines..."
                className="w-full h-14 pl-12 pr-4 bg-card border border-border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Promo Banners */}
          <div ref={promoRef} className="flex gap-4 overflow-x-auto scrollbar-none pb-2 snap-x snap-mandatory scroll-smooth">
            {PROMOS.map((promo, i) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="snap-center shrink-0 w-[85%] sm:w-[60%] lg:w-[45%]"
              >
                <div className="relative h-72 rounded-3xl overflow-hidden group shadow-sm border border-border">
                  <img src={promo.image} alt={promo.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className={`absolute inset-0 bg-gradient-to-r ${promo.color} opacity-80 mix-blend-multiply`} />
                  <div className="absolute inset-0 p-6 flex flex-col justify-center text-white">
                    <span className="self-start bg-white/20 backdrop-blur-md text-[10px] font-extrabold px-3 py-1 rounded-full mb-2 uppercase tracking-widest">
                      {promo.badge}
                    </span>
                    <h3 className="font-extrabold text-2xl leading-tight mb-1">{promo.title}</h3>
                    <p className="text-sm font-medium opacity-90">{promo.subtitle}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mobile Categories Pill Bar */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
            {FOOD_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-extrabold transition-all border ${
                  activeCategory === cat.id 
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                    : 'bg-card border-border text-muted-foreground'
                }`}
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>

          {/* Meals Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" /> Trending Meals
              </h2>
            </div>
            
            {filteredMeals.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border border-dashed rounded-3xl">
                <p className="text-muted-foreground font-medium">No meals found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filteredMeals.map((meal) => {
                    const cartItem = cartItems.find(i => i.productId === meal.id);
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`rounded-3xl border p-3 flex gap-4 shadow-sm hover:shadow-md transition-all group ${
                          cartItem ? 'border-primary bg-primary/5' : 'bg-card border-border'
                        }`}
                      >
                        <div className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden relative bg-muted">
                          <img src={meal.image} alt={meal.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute top-1 left-1 bg-background/90 backdrop-blur px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                            <Star className="w-3 h-3 fill-warning stroke-warning" />
                            <span className="text-[10px] font-extrabold">{meal.rating}</span>
                          </div>
                        </div>

                        <div className="flex flex-col flex-1 justify-center">
                          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1">{meal.storeName}</p>
                          <h3 className="font-extrabold text-sm text-foreground line-clamp-2 leading-tight mb-1">{meal.name}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 font-medium">
                            <Clock className="w-3.5 h-3.5" /> {meal.time}
                          </div>
                          
                          <div className="flex items-center justify-between mt-auto">
                            <span className="font-extrabold text-primary">{APP_SETTINGS.currency} {meal.price.toLocaleString()}</span>
                            
                            {cartItem ? (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-xl">
                                  <button onClick={() => updateQuantity(meal.id, cartItem.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded-md bg-background text-foreground shadow-sm">
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="font-extrabold text-sm min-w-[1rem] text-center">{cartItem.quantity}</span>
                                  <button onClick={() => updateQuantity(meal.id, cartItem.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => updateQuantity(meal.id, 0)}
                                  title="Remove from cart"
                                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart({
                                  productId: meal.id,
                                  name: meal.name,
                                  price: meal.price,
                                  imageUrl: meal.image,
                                  storeId: meal.storeId,
                                  storeName: meal.storeName
                                })}
                                className="bg-primary text-primary-foreground p-2 rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR (WIDGETS & CART) ── */}
        <div className="hidden xl:block flex-none w-[320px] shrink-0 border-l border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <div className="space-y-6">
            
            {/* CART WIDGET */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Your Order</h2>
                <ShoppingBag className="w-4 h-4 text-primary" />
              </div>

              {hasItems ? (
                <>
                  <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto scrollbar-none">
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
                      className="w-full rounded-xl py-6 font-extrabold shadow-md flex items-center justify-center gap-2"
                    >
                      Checkout Now <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground mt-1">Add items to get started</p>
                </div>
              )}
            </div>

            {/* TRUST STATS BAND */}
            <div className="bg-secondary rounded-3xl p-5 shadow-sm text-secondary-foreground">
              <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider opacity-90">Service Stats</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { value: '100+', label: 'Local Kitchens', icon: ShoppingBag },
                  { value: '4.8★', label: 'Avg Rating', icon: Star },
                  { value: '30min', label: 'Fast Delivery', icon: Clock },
                  { value: '24/7', label: 'Support', icon: Phone },
                ].map(({ value, label, icon: Icon }) => (
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

          </div>
        </div>

        {/* Mobile Sticky Cart */}
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
