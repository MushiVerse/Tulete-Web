import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ArrowRight, ChevronRight, CheckCircle2, 
  MapPin, Star, Plus, Minus, Phone, ShieldCheck, 
  ShoppingBag, Clock, Sparkles, Tag
} from 'lucide-react';
import { PageContainer } from '../../../shared/components/layout';
import { Button } from '../../../shared/components/ui/Button';
import { useCartStore } from '../../cart/store/useCartStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { APP_SETTINGS } from '@/core/config/settings';

// --- Static Data ---
const PRODUCT_CATEGORIES = [
  { id: 'all', name: 'All Products', icon: '🛍️' },
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'fashion', name: 'Fashion', icon: '👕' },
  { id: 'home', name: 'Home & Living', icon: '🛋️' },
  { id: 'beauty', name: 'Beauty', icon: '💄' },
  { id: 'groceries', name: 'Groceries', icon: '🛒' },
];

const PROMOS = [
  {
    id: 1,
    title: 'Tech Fest',
    subtitle: 'Up to 40% off on latest gadgets',
    badge: 'HOT DEAL',
    color: 'from-blue-600 to-blue-400',
    image: 'https://images.unsplash.com/photo-1550009158-9fdf6c8bea23?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'Fresh Groceries',
    subtitle: 'Delivered in 30 minutes',
    badge: 'ESSENTIALS',
    color: 'from-emerald-500 to-emerald-400',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop',
  }
];

const PRODUCT_ITEMS = [
  { id: 'p1', name: 'Wireless Noise Cancelling Headphones', price: 15500, category: 'electronics', storeName: 'Tech Haven', storeId: 'sp1', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', rating: 4.9, time: 'Next Day' },
  { id: 'p2', name: 'Men\'s Casual Cotton Shirt', price: 2500, category: 'fashion', storeName: 'Urban Style', storeId: 'sp2', image: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e12?w=400', rating: 4.6, time: '2 Days' },
  { id: 'p3', name: 'Organic Fresh Tomatoes (1kg)', price: 350, category: 'groceries', storeName: 'Fresh Mart', storeId: 'sp3', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400', rating: 4.8, time: '30 min' },
  { id: 'p4', name: 'Hydrating Face Serum', price: 3200, category: 'beauty', storeName: 'Glow Up', storeId: 'sp4', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400', rating: 4.7, time: 'Same Day' },
  { id: 'p5', name: 'Smart LED TV 43"', price: 35000, category: 'electronics', storeName: 'Electro World', storeId: 'sp5', image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400', rating: 4.9, time: 'Next Day' },
  { id: 'p6', name: 'Ceramic Coffee Mug Set', price: 1800, category: 'home', storeName: 'Home Essentials', storeId: 'sp6', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400', rating: 4.5, time: '2 Days' },
];

export const ProductsPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart & Auth
  const { items: cartItems, addToCart, updateQuantity, getTotals } = useCartStore();
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
  const filteredProducts = PRODUCT_ITEMS.filter(item => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.storeName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;

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
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border px-6 pt-6 pb-28">
          <div className="sticky top-24 space-y-2 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-none pb-4">
            <h2 className="text-xs font-extrabold text-foreground mb-4 uppercase tracking-widest opacity-80">Departments</h2>
            {PRODUCT_CATEGORIES.map((cat) => (
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
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Tulete Store
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Everything you need, delivered straight to you.</p>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products, brands, or categories..."
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
            {PRODUCT_CATEGORIES.map((cat) => (
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

          {/* Products Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" /> Top Products
              </h2>
            </div>
            
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border border-dashed rounded-3xl">
                <p className="text-muted-foreground font-medium">No products found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filteredProducts.map((product) => {
                    const cartItem = cartItems.find(i => i.productId === product.id);
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={product.id}
                        className="bg-card rounded-3xl border border-border p-3 flex gap-4 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        <div className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden relative bg-muted">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute top-1 left-1 bg-background/90 backdrop-blur px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                            <Star className="w-3 h-3 fill-warning stroke-warning" />
                            <span className="text-[10px] font-extrabold">{product.rating}</span>
                          </div>
                        </div>

                        <div className="flex flex-col flex-1 justify-center">
                          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1">{product.storeName}</p>
                          <h3 className="font-extrabold text-sm text-foreground line-clamp-2 leading-tight mb-1">{product.name}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 font-medium">
                            <Clock className="w-3.5 h-3.5" /> {product.time}
                          </div>
                          
                          <div className="flex items-center justify-between mt-auto">
                            <span className="font-extrabold text-primary">{APP_SETTINGS.currency} {product.price.toLocaleString()}</span>
                            
                            {cartItem ? (
                              <div className="flex items-center gap-3 bg-muted px-2 py-1 rounded-xl" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => updateQuantity(product.id, cartItem.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded-md bg-background text-foreground shadow-sm">
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-extrabold text-sm">{cartItem.quantity}</span>
                                <button onClick={() => updateQuantity(product.id, cartItem.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart({
                                    productId: product.id,
                                    name: product.name,
                                    price: product.price,
                                    imageUrl: product.image,
                                    storeId: product.storeId,
                                    storeName: product.storeName
                                  });
                                }}
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
        <div className="hidden xl:block flex-none w-[320px] shrink-0 border-l border-border px-6 pt-6 pb-28">
          <div className="sticky top-8 space-y-6 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-none pb-4">
            
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
            <div className="bg-primary rounded-3xl p-5 shadow-sm text-primary-foreground">
              <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider opacity-90">Service Stats</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { value: '50k+', label: 'Products', icon: Tag },
                  { value: '4.9★', label: 'Avg Rating', icon: Star },
                  { value: 'Fast', label: 'Delivery', icon: Clock },
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
