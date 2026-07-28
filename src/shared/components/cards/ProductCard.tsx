import React from 'react';
import { motion } from 'framer-motion';
import { Star, Plus, Minus, Heart, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '../../../features/products/services/productService';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useDynamicPrice } from '../../../features/location/hooks/useDynamicPrice';
import { useCartStore } from '../../../features/cart/store/useCartStore';
import { formatPrice } from '../../utils/formatPrice';
import { APP_SETTINGS } from '../../../core/config/settings';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onToggleFavorite?: (product: Product) => void;
  isFavorite?: boolean;
  onClick?: (product: Product) => void;
}

export const ProductCard = ({ 
  product, 
  onAddToCart, 
  onToggleFavorite,
  isFavorite = false,
  onClick
}: ProductCardProps) => {
  if (product.availability === false) {
    return null;
  }

  const { items: cartItems, updateQuantity, addToCart } = useCartStore();
  const cartItem = cartItems.find(i => i.productId === product.id);
  
  const isSoldOut = (product.quantity !== undefined && product.quantity <= 0) || (product.idadi !== undefined && product.idadi <= 0);
  
  const isLaundryCategory = ['Laundry', 'Suits', 'Bag Wash', 'Bedding'].includes(product.category);
  const magicPrice = useDynamicPrice(product.price, product.storeId, isLaundryCategory, product.location);
  const magicOldPrice = product.oldprice ? useDynamicPrice(product.oldprice, product.storeId, isLaundryCategory, product.location) : undefined;

  // Format price
  const formattedPrice = `${APP_SETTINGS.currency} ${formatPrice(magicPrice)}`;

  const Wrapper = onClick ? 'div' : Link;
  const wrapperProps = onClick 
    ? { onClick: () => onClick(product), className: "block h-full cursor-pointer" } 
    : { to: `/product/${encodeURIComponent(product.id)}`, className: "block h-full" };

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

          {/* Favorite Button */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite?.(product);
            }}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm hover:bg-white/40 active:scale-95 transition-all"
          >
            <Heart className={`w-4 h-4 transition-all duration-200 ${isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white'}`} />
          </button>

          {/* Image Container */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/50 shrink-0">
            <img 
              src={product.imgUrl} 
              alt={product.name}
              className="object-cover w-full h-full transition-transform duration-500 ease-out group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
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
                <span className="text-[11px] font-bold text-muted-foreground truncate">
                  {product.store}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded-full shrink-0 shadow-sm">
                <Star className="w-3 h-3 fill-warning stroke-warning" />
                <span className="text-[10px] font-extrabold text-white">{(product.rating ?? 0).toFixed(1)}</span>
              </div>
            </div>
            
            <h3 className="font-extrabold text-sm text-foreground line-clamp-2 leading-snug mb-3 flex-grow group-hover:text-primary transition-colors">
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
                          alert(`Cannot add more. Only ${stockLimit} items available in stock.`);
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
                    
                    if (onAddToCart) {
                      onAddToCart(product);
                    } else {
                      addToCart({
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        imageUrl: product.imgUrl,
                        storeId: product.storeId,
                        storeName: product.store,
                        cat: product.category,
                        location: product.location,
                        isLaundry: isLaundryCategory,
                        idadi: product.quantity !== undefined ? product.quantity : product.idadi
                      });
                    }
                  }}
                  className={`flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-extrabold shadow-sm transition-all active:scale-95 shrink-0 ${
                    !isSoldOut
                      ? 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground' 
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 mr-0.5" strokeWidth={3} />
                  Add
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </Wrapper>
    </motion.div>
  );
};
