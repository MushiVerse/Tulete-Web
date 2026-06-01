import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, Star, MapPin, Store as StoreIcon, ShieldCheck } from 'lucide-react';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { ImageGallery } from '../../discovery/components/ImageGallery';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { useFirestoreDocument, useFirestoreQuery } from '../../../core/hooks/useFirestoreQuery';
import { productService } from '../../products/services/productService';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { ProductCard } from '../../../shared/components/cards/ProductCard';
import { SectionWrapper } from '../../dashboard/components/SectionWrapper';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);

  // Fetch specific product
  const { data: product, isLoading, error } = useFirestoreDocument(['product', id || ''], productService, id || '');

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

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:py-8 space-y-8">
          <Skeleton className="w-full aspect-square md:h-[400px] rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Use dummy data if product not found (since DB is empty)
  const displayProduct = product || {
    id: id || 'dummy-1',
    name: 'Premium Leather Smart Watch - Series 9',
    description: 'Experience the ultimate smart watch with our premium leather band. Features advanced health tracking, always-on retina display, and up to 36 hours of battery life. Water resistant up to 50 meters.',
    price: 350000,
    originalPrice: 420000,
    imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80',
    storeId: 's1',
    storeName: 'Tech Hub Premium',
    rating: 4.8,
    reviewCount: 124,
    category: 'Tech',
    tags: ['Super Saving', 'Most TamTam'],
    isAvailable: true,
  };

  const images = [
    displayProduct.imageUrl,
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&q=80',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'
  ];

  return (
    <PageWrapper className="pb-24 bg-background">
      {/* Top Nav (Mobile optimized) */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 h-14">
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

      <div className="max-w-7xl mx-auto md:px-6 lg:py-8 lg:grid lg:grid-cols-2 lg:gap-12">
        {/* Left: Gallery */}
        <div className="w-full">
          <ImageGallery images={images} altPrefix={displayProduct.name} />
        </div>

        {/* Right: Details */}
        <div className="px-4 py-6 md:px-0 flex flex-col gap-6">
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
            
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              {displayProduct.name}
            </h1>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded text-sm font-medium">
                <Star className="w-4 h-4 fill-current" />
                <span>{displayProduct.rating.toFixed(1)}</span>
                <span className="text-muted-foreground text-xs ml-1">({displayProduct.reviewCount} reviews)</span>
              </div>
              {!displayProduct.isAvailable && (
                <Badge variant="destructive">Out of Stock</Badge>
              )}
            </div>

            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-primary">
                TZS {displayProduct.price.toLocaleString()}
              </span>
              {displayProduct.originalPrice && displayProduct.originalPrice > displayProduct.price && (
                <span className="text-lg text-muted-foreground line-through mb-1">
                  TZS {displayProduct.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-border/50" />

          {/* Store Info */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <StoreIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{displayProduct.storeName}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> 2.4 km away</span>
                  <span className="flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3 h-3" /> Verified</span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm">Visit Store</Button>
          </div>

          <div className="w-full h-px bg-border/50" />

          {/* Description */}
          <div>
            <h3 className="font-semibold text-base mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {displayProduct.description}
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-40 lg:hidden flex gap-3">
        <Button className="flex-1 h-12 text-base font-bold" disabled={!displayProduct.isAvailable}>
          {displayProduct.isAvailable ? 'Add to Cart' : 'Out of Stock'}
        </Button>
      </div>

      {/* Related Products */}
      <div className="max-w-7xl mx-auto mt-8 mb-24 lg:mb-12">
        <SectionWrapper title="You might also like" actionLink={`/discover?c=${displayProduct.category}`}>
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
    </PageWrapper>
  );
};
