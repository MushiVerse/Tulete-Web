import React from 'react';
import { motion } from 'framer-motion';
import { Star, Plus, Minus, Heart, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '../../../features/products/services/productService';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useDynamicPrice } from '../../../features/location/hooks/useDynamicPrice';
import { useCartStore, isFoodItem, isLaundryItem } from '../../../features/cart/store/useCartStore';
import { formatPrice } from '../../utils/formatPrice';
import { APP_SETTINGS } from '../../../core/config/settings';
import { getNormalizedRating } from '../../utils/ratingUtils';
import { useCurrencyLanguageStore } from '../../../core/config/currencyStore';

import { toast } from 'sonner';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { useAuthModalStore } from '../../../features/auth/store/useAuthModalStore';
import { useFavoritesStore } from '../../../features/favorites/hooks/useFavoritesStore';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onToggleFavorite?: (product: Product) => void;
  isFavorite?: boolean;
  onClick?: (product: Product) => void;
  viewMode?: 'grid' | 'list';
}

export const ProductCard = ({ 
  product, 
  onAddToCart, 
  onToggleFavorite,
  isFavorite: customIsFavorite,
  onClick,
  viewMode = 'grid'
}: ProductCardProps) => {
  if (product.availability === false || (product as any).availability === "false" || String((product as any).availability).toLowerCase() === "false") {
    return null;
  }

  const { user, isAuthenticated } = useAuthStore();
  const { openModal } = useAuthModalStore();
  const { isFavorited, toggleFavorite } = useFavoritesStore();

  const effectiveIsFavorite = customIsFavorite !== undefined 
    ? customIsFavorite 
    : isFavorited(product.id);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(product);
    } else {
      if (!isAuthenticated) {
        openModal('login');
        return;
      }
      if (user?.id) {
        const willFav = !effectiveIsFavorite;
        toggleFavorite(user.id, product);
        toast.success(willFav ? `Added ${product.name || 'item'} to favorites` : `Removed ${product.name || 'item'} from wishlist`);
      }
    }
  };

  const { currentLanguage } = useCurrencyLanguageStore();
  const { rating: normRating } = getNormalizedRating(product);
  const displayRating = (product.rating && Number(product.rating) > 0) ? Number(product.rating) : normRating;

  const { items: cartItems, updateQuantity, addToCart } = useCartStore();
  const cartItem = cartItems.find(i => i.productId === product.id);
  
  const isSoldOut = (product.quantity !== undefined && product.quantity <= 0) || (product.idadi !== undefined && product.idadi <= 0);
  
  const itemCat = (product as any)?.cat || product.category || 'Product';
  const isLaundryCategory = itemCat === 'Nguo';
  const magicPrice = useDynamicPrice(product.price, product.storeId, isLaundryCategory, product.location, undefined, itemCat);
  const magicOldPrice = product.oldprice ? useDynamicPrice(product.oldprice, product.storeId, isLaundryCategory, product.location, undefined, itemCat) : undefined;

  // Format price
  const formattedPrice = `${currentLanguage.symbol} ${formatPrice(magicPrice)}`;

  const Wrapper = onClick ? 'div' : Link;
  const wrapperProps = onClick 
    ? { onClick: () => onClick(product), className: "block h-full cursor-pointer" } 
    : { to: `/product/${encodeURIComponent(product.id)}`, className: "block h-full" };

  if (viewMode === 'list') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="w-full"
      >
        <Wrapper {...wrapperProps as any}>
          <Card className="overflow-hidden flex flex-row group relative bg-card border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 rounded-3xl p-2.5 sm:p-3 gap-3.5 sm:gap-4 items-center w-full">
            {/* Left Image Thumbnail */}
            <div className="relative w-28 sm:w-36 h-28 sm:h-32 rounded-2xl overflow-hidden bg-muted/50 shrink-0">
              <img 
                src={product.imgUrl} 
                alt={product.name}
                className="object-cover w-full h-full transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
              />
              
              <button 
                onClick={handleHeartClick}
                className="absolute top-2 left-2 z-20 w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center shadow-md hover:bg-black/60 active:scale-95 transition-all group/fav"
                title={effectiveIsFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className={`w-3.5 h-3.5 transition-all duration-200 ${effectiveIsFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white group-hover/fav:text-rose-400'}`} />
              </button>

              {product.tags?.includes('Most TamTam') && (
                <span className="absolute bottom-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm bg-success/90 text-primary-foreground tracking-wide">
                  HOT 🔥
                </span>
              )}
              
              {isSoldOut && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-20">
                  <span className="text-foreground font-extrabold text-[10px] bg-background px-2.5 py-1 rounded-full shadow-lg">
                    Sold Out
                  </span>
                </div>
              )}
            </div>

            {/* Right Side Content Details */}
            <div className="flex-1 flex flex-col justify-between min-w-0 h-full py-0.5">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <Store className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="notranslate text-xs font-bold text-muted-foreground truncate" translate="no">
                      {product.store}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-background/90 backdrop-blur text-foreground border border-border/40 px-2 py-0.5 rounded-full shrink-0 shadow-sm">
                    <Star className="w-3 h-3 fill-warning stroke-warning" />
                    <span className="text-xs font-extrabold">{displayRating.toFixed(1)}</span>
                  </div>
                </div>

                <h3 className="notranslate font-extrabold text-sm sm:text-base text-foreground line-clamp-2 leading-snug mb-1 group-hover:text-primary transition-colors" translate="no">
                  {product.name}
                </h3>
              </div>

              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50">
                <div className="flex flex-col">
                  {magicOldPrice && magicOldPrice > magicPrice && (
                    <span className="text-[10px] font-bold text-muted-foreground line-through">
                      {APP_SETTINGS.currency} {formatPrice(magicOldPrice)}
                    </span>
                  )}
                  <span className="font-extrabold text-sm sm:text-base text-foreground">
                    {formattedPrice}
                  </span>
                </div>

                {cartItem ? (
                  <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-xl">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateQuantity(product.id, cartItem.quantity - 1);
                      }} 
                      className="w-6 h-6 shrink-0 flex items-center justify-center rounded-md bg-background text-foreground shadow-sm hover:bg-background/80"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-extrabold text-xs min-w-[1rem] text-center">{cartItem.quantity}</span>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const stockLimit = product.quantity !== undefined ? product.quantity : product.idadi;
                        if (stockLimit !== undefined && cartItem.quantity >= stockLimit) {
                          alert(`Cannot add more. Maximum available stock reached (${stockLimit} left in stock).`);
                          return;
                        }
                        updateQuantity(product.id, cartItem.quantity + 1);
                      }} 
                      className="w-6 h-6 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button 
                    disabled={isSoldOut}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const stockVal = product.quantity !== undefined ? product.quantity : product.idadi;
                      if (onAddToCart) {
                        onAddToCart(product);
                      } else {
                        addToCart({
                          productId: product.id,
                          name: product.name,
                          price: product.price,
                          basePrice: product.price,
                          imageUrl: product.imgUrl,
                          storeId: product.storeId || '',
                          storeName: product.store || '',
                          cat: itemCat,
                          idadi: stockVal,
                          location: product.location,
                          isLaundry: isLaundryItem(product),
                          isFood: isFoodItem(product),
                        });
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 ${
                      isSoldOut 
                        ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                )}
              </div>
            </div>
          </Card>
        </Wrapper>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Wrapper {...wrapperProps as any}>
        <Card className="h-full overflow-hidden flex flex-col group relative bg-card border-border/40 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 rounded-3xl">
          {/* Badges Overlay (Styled exactly like Open Now) */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
            {product.tags?.includes('Most TamTam') && (
              <span className="text-[10px] font-extrabold px-3 py-1 rounded-full shadow-sm backdrop-blur-md bg-success/90 text-primary-foreground tracking-wide">
                HOT 🔥
              </span>
            )}
            {magicOldPrice && magicOldPrice > magicPrice && (
              <span className="text-[10px] font-extrabold px-3 py-1 rounded-full shadow-sm backdrop-blur-md bg-success/90 text-primary-foreground tracking-wide">
                SALE
              </span>
            )}
          </div>

          {/* Image Container */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/50 shrink-0">
            <img 
              src={product.imgUrl} 
              alt={product.name}
              className="object-cover w-full h-full transition-transform duration-500 ease-out group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Favorite Button (Bottom Left of Item Image) */}
            <button 
              onClick={handleHeartClick}
              className="absolute bottom-3 left-3 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center shadow-md hover:bg-black/60 hover:scale-110 active:scale-95 transition-all group/fav"
              title={effectiveIsFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`w-4 h-4 transition-all duration-200 ${effectiveIsFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white group-hover/fav:text-rose-400'}`} />
            </button>
            
            {/* Floating quantity left badge in top right corner of image */}
            {(() => {
              const stockVal = product.quantity !== undefined ? product.quantity : product.idadi;
              if (stockVal !== undefined && stockVal > 0 && !isSoldOut) {
                return (
                  <div className="absolute top-2.5 right-2.5 bg-background/90 backdrop-blur text-foreground border border-border/50 font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-sm z-10">
                    {stockVal} left
                  </div>
                );
              }
              return null;
            })()}

            {isSoldOut && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-20">
                <span className="text-foreground font-extrabold text-xs bg-background px-4 py-2 rounded-full shadow-lg">
                  Sold Out
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="p-3.5 flex flex-col flex-grow bg-card">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Store className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="notranslate text-[11px] font-bold text-muted-foreground truncate" translate="no">
                  {product.store}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-background/90 backdrop-blur text-foreground border border-border/40 px-1.5 py-0.5 rounded-full shrink-0 shadow-sm">
                <Star className="w-3 h-3 fill-warning stroke-warning" />
                <span className="text-[10px] font-extrabold">{displayRating.toFixed(1)}</span>
              </div>
            </div>
            
            <h3 className="notranslate font-extrabold text-sm text-foreground line-clamp-2 leading-snug mb-1 flex-grow group-hover:text-primary transition-colors" translate="no">
              {product.name}
            </h3>

            <div className="flex items-end justify-between mt-auto pt-3 border-t border-border/50">
              <div className="flex flex-col">
                {magicOldPrice && magicOldPrice > magicPrice && (
                  <span className="text-[10px] font-bold text-muted-foreground line-through mb-0.5">
                    {APP_SETTINGS.currency} {formatPrice(magicOldPrice)}
                  </span>
                )}
                <span className="font-extrabold text-sm sm:text-[15px] text-foreground">
                  {formattedPrice}
                </span>
              </div>
              
              {cartItem ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1 sm:gap-1.5 bg-muted px-1.5 sm:px-2 py-1 rounded-xl">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateQuantity(product.id, cartItem.quantity - 1);
                      }} 
                      className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-md bg-background text-foreground shadow-sm hover:bg-background/80"
                    >
                      <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                    <span className="font-extrabold text-xs sm:text-sm min-w-[1rem] text-center">{cartItem.quantity}</span>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const stockLimit = product.quantity !== undefined ? product.quantity : product.idadi;
                        if (stockLimit !== undefined && cartItem.quantity >= stockLimit) {
                          alert(`Cannot add more. Maximum available stock reached (${stockLimit} left in stock).`);
                          return;
                        }
                        updateQuantity(product.id, cartItem.quantity + 1);
                      }} 
                      className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  disabled={isSoldOut}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const stockVal = product.quantity !== undefined ? product.quantity : product.idadi;
                    if (onAddToCart) {
                      onAddToCart(product);
                    } else {
                      addToCart({
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        basePrice: product.price,
                        imageUrl: product.imgUrl,
                        storeId: product.storeId,
                        storeName: product.store,
                        cat: itemCat,
                        location: product.location,
                        isLaundry: isLaundryItem(product),
                        isFood: isFoodItem(product),
                        idadi: stockVal,
                        maxQuantity: stockVal,
                      });
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl shadow-sm transition-all text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shrink-0 ${
                    !isSoldOut 
                      ? 'bg-primary text-primary-foreground hover:scale-105 active:scale-95' 
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </Wrapper>
    </motion.div>
  );
};
