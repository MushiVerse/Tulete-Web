import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Share2, Heart, Star, MapPin, Store as StoreIcon, ShieldCheck, Tag, ChevronRight, ArrowRight } from 'lucide-react';
import { PageContainer } from '../../../shared/components/layout';
import { ImageGallery } from '../../discovery/components/ImageGallery';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { useFirestoreDocument, useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { productService } from '../../products/services/productService';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { SectionWrapper } from '../../dashboard/components/SectionWrapper';
import { useCartStore } from '../../cart/store/useCartStore';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../auth/store/useAuthModalStore';
import { useLocationStore } from '../../location/store/useLocationStore';
import { useDynamicPrice } from '../../location/hooks/useDynamicPrice';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';
import { MiniCartRow } from '../../../shared/components/MiniCartRow';

const PRODUCT_CATEGORIES = [
  { id: 'all', name: 'All Products', icon: '🛍️' },
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'fashion', name: 'Fashion', icon: '👕' },
  { id: 'home', name: 'Home & Living', icon: '🛋️' },
  { id: 'beauty', name: 'Beauty', icon: '💄' },
  { id: 'groceries', name: 'Groceries', icon: '🛒' },
];

export const ProductDetailPage = () => {
  const { id } = useParams();
  const decodedId = id ? decodeURIComponent(id) : '';
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const { items: cartItems, addToCart, removeFromCart, getTotals } = useCartStore();
  
  // Subscribe to location store so price and cart total update instantly on location change
  const { currentLocation } = useLocationStore();
  
  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;
  
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useAuthModalStore();

  // Fetch specific product using decoded ID
  const { data: product, isLoading, error } = useFirestoreDocument(['product', decodedId || id || ''], productService, decodedId || id || '');

  // Fetch related products (same category)
  const { data: relatedProducts, isLoading: loadingRelated } = useFirestoreQuery(
    ['products', 'related', product?.category],
    productService,
    { 
      limit: 4, 
      filters: product?.category ? [{ field: 'category', operator: '==', value: product.category }] : undefined 
    },
    { enabled: !!product?.category }
  );

  // Compute display product (or fallback) unconditionally
  const displayProduct = product || {
    id: decodedId || id || 'dummy-1',
    name: decodedId && decodedId.trim().length > 2 ? decodedId : 'Premium Leather Smart Watch - Series 9',
    description: 'Experience the ultimate quality with fast delivery straight to your door.',
    price: 350000,
    oldprice: 420000,
    imgUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80',
    storeId: 's1',
    store: 'Tulete Partner Store',
    rating: 4.8,
    reviewCount: 124,
    category: 'Products',
    tags: ['Super Saving', 'Most TamTam'],
    availability: true,
  };

  const isLaundryCategory = ['Laundry', 'Suits', 'Bag Wash', 'Bedding'].includes(displayProduct.category);
  
  // Execute ALL hooks unconditionally BEFORE any early return
  const magicPrice = useDynamicPrice(displayProduct.price || 0, displayProduct.storeId, isLaundryCategory, (displayProduct as any).location);
  const calcOldPrice = useDynamicPrice(displayProduct.oldprice || 0, displayProduct.storeId, isLaundryCategory, (displayProduct as any).location);
  const magicOldPrice = displayProduct.oldprice ? calcOldPrice : undefined;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    navigate('/cart');
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:py-8 space-y-8">
          <Skeleton className="w-full aspect-square md:h-[400px] rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </PageContainer>
    );
  }

  const images = [
    displayProduct.imgUrl,
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&q=80',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'
  ];

  return (
    <PageContainer>
      <div className="flex w-full bg-background h-[calc(100vh-4rem)] overflow-hidden relative">
        
        {/* ── LEFT SIDEBAR (CATEGORIES) ── */}
        <div className="hidden lg:block flex-none w-[260px] shrink-0 border-r border-border h-full overflow-y-auto scrollbar-none px-6 pt-6 pb-28">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="space-y-2">
            <h2 className="text-xs font-extrabold text-foreground mb-4 uppercase tracking-widest opacity-80">Departments</h2>
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate('/products')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm text-muted-foreground hover:bg-muted hover:text-foreground`}
              >
                <span className="text-xl">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── CENTER/MAIN COLUMN ── */}
        <div className="flex-auto min-w-0 max-w-full h-full overflow-y-auto scrollbar-none pt-6 pb-32 xl:pb-28 px-4 lg:px-8 xl:px-10 space-y-8">
          
          {/* Top Nav (Mobile optimized) */}
          <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between py-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsFavorite(!isFavorite)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
              </button>
            </div>
          </div>

          <div className="md:px-0 lg:py-2 lg:grid lg:grid-cols-2 lg:gap-12">
            {/* Left: Gallery */}
            <div className="w-full">
              <ImageGallery images={images} altPrefix={displayProduct.name} />
            </div>

            {/* Right: Details */}
            <div className="py-6 md:px-0 flex flex-col gap-6">
              {/* Title & Price */}
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {displayProduct.tags?.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                      {tag}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-muted-foreground">{displayProduct.category}</Badge>
                </div>
                
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
                  {displayProduct.name}
                </h1>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded text-sm font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{(displayProduct.rating ?? 0).toFixed(1)}</span>
                    <span className="text-muted-foreground text-xs ml-1">({displayProduct.reviewCount} reviews)</span>
                  </div>
                  {!displayProduct.availability && (
                    <Badge variant="destructive" className="font-bold">Out of Stock</Badge>
                  )}
                </div>

                <div className="flex items-end gap-3 mt-4">
                  <span className="text-3xl font-extrabold text-primary">
                    TZS {formatPrice(magicPrice)}
                  </span>
                  {magicOldPrice && magicOldPrice > magicPrice && (
                    <span className="text-lg font-bold text-muted-foreground line-through mb-1">
                      TZS {formatPrice(magicOldPrice)}
                    </span>
                  )}
                </div>

                <Button 
                  className="w-full md:w-auto mt-6 h-12 px-8 text-base font-extrabold shadow-md rounded-2xl"
                  disabled={!displayProduct.availability}
                  onClick={() => {
                    addToCart({
                      productId: displayProduct.id,
                      name: displayProduct.name,
                      price: displayProduct.price,
                      imageUrl: displayProduct.imgUrl,
                      storeId: displayProduct.storeId,
                      storeName: displayProduct.store,
                      isLaundry: isLaundryCategory,
                      location: displayProduct.location,
                      idadi: displayProduct.idadi
                    });
                  }}
                >
                  {displayProduct.availability ? 'Add to Cart' : 'Out of Stock'}
                </Button>
              </div>

              <div className="w-full h-px bg-border/50" />

              {/* Store Info */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <StoreIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">{displayProduct.store}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> 2.4 km</span>
                      <span className="flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3 h-3" /> Verified</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl font-bold">Visit Store</Button>
              </div>

              <div className="w-full h-px bg-border/50" />

              {/* Description */}
              <div>
                <h3 className="font-extrabold text-base mb-2">Description</h3>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed whitespace-pre-line">
                  {displayProduct.description}
                </p>
              </div>
            </div>
          </div>

          {/* Related Products */}
          <div className="mt-8 mb-24 lg:mb-12">
            <SectionWrapper title="You might also like" actionLink={`/products`}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="shrink-0 w-[160px] md:w-[200px] snap-center">
                  <ProductCard 
                    product={{
                      ...displayProduct,
                      id: `related-${i}`,
                      name: `Related Product ${i}`,
                      price: displayProduct.price - (i * 10000)
                    }} 
                  />
                </div>
              ))}
            </SectionWrapper>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR (LIVE CART) ── */}
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
                      <MiniCartRow 
                        key={cartItem.productId} 
                        cartItem={cartItem} 
                        removeFromCart={removeFromCart} 
                      />
                    ))}
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center mb-5">
                      <span className="text-sm font-bold text-muted-foreground">Total</span>
                      <span className="text-xl font-extrabold text-foreground">{APP_SETTINGS.currency} {formatPrice(cartTotal)}</span>
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
            
            {/* SERVICE STATS BAND */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-extrabold mb-4 uppercase tracking-wider text-foreground">Service Stats</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { value: '50k+', label: 'Products', icon: Tag },
                  { value: '4.9★', label: 'Avg Rating', icon: Star },
                  { value: 'Verified', label: 'Merchants', icon: ShieldCheck },
                ].map(({ value, label, icon: Icon }) => (
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
                <span>{APP_SETTINGS.currency} {formatPrice(cartTotal)} <ArrowRight className="inline-block ml-1 w-4 h-4" /></span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageContainer>
  );
};
