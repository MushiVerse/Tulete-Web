import React from 'react';
import { motion } from 'framer-motion';
import { Star, Plus, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '../../../features/products/services/productService';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onToggleFavorite?: (product: Product) => void;
  isFavorite?: boolean;
}

export const ProductCard = ({ 
  product, 
  onAddToCart, 
  onToggleFavorite,
  isFavorite = false 
}: ProductCardProps) => {
  
  // Format price
  const formattedPrice = new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0
  }).format(product.price);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Link to={`/product/${product.id}`} className="block h-full">
        <Card className="h-full overflow-hidden flex flex-col group relative">
          {/* Badges Overlay */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
            {product.tags?.includes('Most TamTam') && (
              <Badge className="bg-[#F59E0B] text-white border-none shadow-sm">Hot</Badge>
            )}
            {product.oldprice && product.oldprice > product.price && (
              <Badge className="bg-destructive text-destructive-foreground border-none shadow-sm">Sale</Badge>
            )}
          </div>

          {/* Favorite Button */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite?.(product);
            }}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 backdrop-blur-sm text-muted-foreground hover:text-destructive hover:bg-white shadow-sm transition-colors"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
          </button>

          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            <img 
              src={product.imgUrl} 
              alt={product.name}
              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {!product.availability && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-semibold text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="p-3 flex flex-col flex-grow">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-muted-foreground truncate">{product.store}</span>
              <div className="flex items-center gap-0.5 text-yellow-500">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-[10px] font-medium text-foreground">{(product.rating ?? 0).toFixed(1)}</span>
              </div>
            </div>
            
            <h3 className="font-medium text-sm line-clamp-2 leading-tight mb-2 flex-grow">
              {product.name}
            </h3>

            <div className="flex items-end justify-between mt-auto">
              <div className="flex flex-col">
                {product.oldprice && product.oldprice > product.price && (
                  <span className="text-xs text-muted-foreground line-through">
                    TZS {product.oldprice.toLocaleString()}
                  </span>
                )}
                <span className="font-bold text-primary">
                  {formattedPrice}
                </span>
              </div>
              
              <Button 
                size="sm" 
                variant="secondary"
                className="h-8 w-8 rounded-full p-0 shrink-0 shadow-sm"
                disabled={!product.availability}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddToCart?.(product);
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};
