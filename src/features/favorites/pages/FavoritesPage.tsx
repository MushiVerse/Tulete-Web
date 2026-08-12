import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavoritesStore } from '../hooks/useFavoritesStore';
import { useCartStore, isFoodItem, isLaundryItem, isProductItem } from '../../cart/store/useCartStore';
import { useLocationStore } from '../../location/store/useLocationStore';
import { getItemPriceWithDelivery, useDynamicPrice } from '../../location/hooks/useDynamicPrice';
import { productService } from '../../products/services/productService';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { Badge } from '../../../shared/components/ui/Badge';
import {
  Heart, HeartCrack, Search, FolderHeart, Plus, Minus,
  Trash2, ShoppingCart, Star, Eye, ExternalLink, Sparkles, X, Store as StoreIcon, ArrowRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { APP_SETTINGS } from '@/core/config/settings';
import { resolveImageUrl, resolveItemCategory } from '../../../shared/utils/productPayload';
import { getNormalizedRating } from '../../../shared/utils/ratingUtils';

const resolveStoreCategory = (fav: any): string => {
  if (!fav) return 'Store';

  const candidates = [
    fav.storeCategory,
    fav.cat && fav.cat !== 'Store' ? fav.cat : null,
    fav.category && fav.category !== 'Store' ? fav.category : null,
    fav.subCategory,
    fav.subCat,
    fav.mainCategory,
    fav.scat,
    fav.speccat,
  ];

  for (const c of candidates) {
    if (c && typeof c === 'string') {
      const trimmed = c.trim();
      const lower = trimmed.toLowerCase();
      if (
        trimmed.length > 0 &&
        lower !== 'store' &&
        lower !== 'stores' &&
        lower !== 'product' &&
        lower !== 'products' &&
        lower !== 'all' &&
        lower !== 'item'
      ) {
        return trimmed;
      }
    }
  }

  // Fallback: infer category from store name, product title, or description
  const searchStr = `${fav.name || ''} ${fav.store || ''} ${fav.description || ''} ${fav.itemId || ''}`.toLowerCase();

  if (searchStr.includes('laundry') || searchStr.includes('nguo') || searchStr.includes('dobi') || searchStr.includes('dry clean') || searchStr.includes('wash')) {
    return 'Laundry';
  }
  if (
    searchStr.includes('food') || searchStr.includes('diko') || searchStr.includes('restaurant') ||
    searchStr.includes('cafe') || searchStr.includes('meal') || searchStr.includes('kitchen') ||
    searchStr.includes('bakery') || searchStr.includes('bites') || searchStr.includes('pizza') ||
    searchStr.includes('burger') || searchStr.includes('chapati') || searchStr.includes('fast food') ||
    searchStr.includes('duka la chakula') || searchStr.includes('hotel')
  ) {
    return 'Food';
  }
  if (
    searchStr.includes('electric') || searchStr.includes('electronics') || searchStr.includes('tech') ||
    searchStr.includes('phone') || searchStr.includes('gadget') || searchStr.includes('simu') ||
    searchStr.includes('solar') || searchStr.includes('hardware')
  ) {
    return 'Electrical';
  }
  if (
    searchStr.includes('beauty') || searchStr.includes('cosmetics') || searchStr.includes('salon') ||
    searchStr.includes('barber') || searchStr.includes('spa') || searchStr.includes('makeup') ||
    searchStr.includes('hair')
  ) {
    return 'Beauty';
  }
  if (
    searchStr.includes('supermarket') || searchStr.includes('mart') || searchStr.includes('grocery') ||
    searchStr.includes('groceries') || searchStr.includes('duka')
  ) {
    return 'Supermarket';
  }

  return 'Store';
};

const FavoriteCardItem = ({
  fav,
  cartItems,
  updateQuantity,
  onRemove,
  onAddToCart,
  onQuickView,
  onNavigate,
}: {
  fav: any;
  cartItems: any[];
  updateQuantity: (id: string, qty: number) => void;
  onRemove: (fav: any) => void;
  onAddToCart: (fav: any, finalPrice: number) => void;
  onQuickView: (fav: any) => void;
  onNavigate: (fav: any) => void;
}) => {
  const isStore = fav.type === 'store' || (fav as any).recordType === 'store' || (fav as any).category === 'Store' || (fav as any).cat === 'Store';

  const formatStoreCat = (c?: string) => {
    if (!c || c.trim() === '' || c.toLowerCase() === 'store') return 'Store';
    const trimmed = c.trim();
    if (trimmed.toLowerCase().includes('store')) return trimmed;
    return `${trimmed} Store`;
  };

  const storeCatResolved = resolveStoreCategory(fav);
  const storeBadgeText = formatStoreCat(storeCatResolved);
  const rawStoreCat = fav.storeCategory || fav.category || fav.cat || (storeCatResolved !== 'Store' ? storeCatResolved : '');
  const specificCat = isStore ? storeBadgeText : resolveItemCategory(fav);
  const isLaundry = !isStore && (isLaundryItem(fav) || specificCat === 'Nguo' || specificCat === 'Laundry');
  const isFood = !isStore && (isFoodItem(fav) || specificCat === 'Food');
  const itemCat = isLaundry ? 'Nguo' : (isFood ? 'Food' : specificCat);

  const dynamicPrice = useDynamicPrice(
    fav.price || 0,
    fav.storeId || fav.store,
    isLaundry,
    fav.location,
    undefined,
    itemCat
  );

  const cartItem = cartItems.find((i: any) => i.productId === fav.itemId || i.baseProductId === fav.itemId);

  const stockVal = fav.quantity !== undefined ? fav.quantity : (fav.idadi !== undefined ? fav.idadi : fav.maxQuantity);
  const isSoldOut = !isStore && ((stockVal !== undefined && stockVal <= 0) || fav.availability === false);

  const { rating: normRating } = getNormalizedRating(fav);
  const displayRating = fav.rating && Number(fav.rating) > 0 ? Number(fav.rating) : normRating;

  const badgeLabel = (specificCat === 'Nguo' || specificCat === 'nguo') ? 'Laundry' : specificCat;

  const badgeStyle = isStore
    ? (storeCatResolved.toLowerCase().includes('laundry') || storeCatResolved.toLowerCase().includes('nguo'))
      ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-extrabold'
      : (storeCatResolved.toLowerCase().includes('food'))
        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-extrabold'
        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-extrabold'
    : (badgeLabel === 'Laundry' || badgeLabel === 'Nguo' || badgeLabel.toLowerCase().includes('laundry') || isLaundry)
      ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
      : (badgeLabel === 'Food' || badgeLabel.toLowerCase().includes('food') || isFood)
        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        : 'bg-primary/10 text-primary';

  return (
    <Card
      onClick={() => onNavigate(fav)}
      className={`p-4 border border-border bg-card shadow-sm flex gap-4 items-center relative overflow-hidden group cursor-pointer hover:border-primary/50 hover:shadow-md transition-all ${isSoldOut ? 'opacity-85' : ''}`}
    >
      <div className="relative w-20 h-20 flex-shrink-0">
        <img
          src={resolveImageUrl(fav.imageUrl || fav)}
          alt={fav.name}
          className="w-full h-full rounded-xl object-cover bg-muted"
        />
        {isSoldOut && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] rounded-xl flex items-center justify-center">
            <span className="text-[9px] font-extrabold text-foreground bg-background/90 px-1.5 py-0.5 rounded shadow-sm">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <Badge className={`border-0 text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0 ${badgeStyle}`}>
            {badgeLabel}
          </Badge>
          {displayRating && (
            <span className="text-[10px] font-bold text-foreground flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-primary stroke-primary text-primary" />
              {displayRating}
            </span>
          )}
          {fav.type !== 'store' && (
            isSoldOut ? (
              <span className="text-[9px] font-extrabold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                Out of Stock
              </span>
            ) : (stockVal !== undefined && stockVal > 0) ? (
              <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900">
                {stockVal} left
              </span>
            ) : null
          )}
        </div>

        <h3 className="font-extrabold text-sm text-foreground truncate mb-0.5 group-hover:text-primary transition-colors">
          {fav.name}
        </h3>
        <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">
          {fav.description || (isStore ? (rawStoreCat ? `${rawStoreCat} provider in Dodoma` : 'Verified partner store') : 'Saved service shortcut')}
        </p>

        <div className="flex justify-between items-center">
          {fav.price ? (
            <span className="font-extrabold text-xs text-foreground">
              {formatPrice(dynamicPrice)} {APP_SETTINGS.currency}
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-emerald-500">
              Hub Verified
            </span>
          )}

          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Quick navigation shortcut */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(fav);
              }}
              className="p-2 bg-muted dark:bg-slate-800 text-muted-foreground hover:text-primary rounded-full transition-colors"
              title="View details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Quick Cart button / Increment-Decrement controls */}
            {fav.type !== 'store' && (
              cartItem && cartItem.quantity > 0 ? (
                <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-full border border-border shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(cartItem.productId, cartItem.quantity - 1);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-card text-foreground shadow-xs hover:bg-destructive hover:text-white transition-colors"
                    title="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-extrabold text-xs px-1 text-foreground min-w-[1rem] text-center">{cartItem.quantity}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (stockVal !== undefined && stockVal > 0 && cartItem.quantity >= stockVal) {
                        alert(`Cannot add more. Maximum available stock reached (${stockVal} left in stock).`);
                        return;
                      }
                      updateQuantity(cartItem.productId, cartItem.quantity + 1);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
                    title="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : isSoldOut ? (
                <button
                  disabled
                  className="px-2.5 py-1 bg-muted text-muted-foreground font-extrabold text-[10px] rounded-full cursor-not-allowed border border-border"
                  title="Out of stock"
                >
                  Sold Out
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(fav, dynamicPrice);
                  }}
                  className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-full transition-all"
                  title="Add to cart"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                </button>
              )
            )}

            {/* Remove Bookmark */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(fav);
              }}
              className="p-1.5 sm:p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-full transition-all shrink-0"
              title="Remove favorite"
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};

const RecommendationCardItem = ({
  rec,
  cartItems,
  updateQuantity,
  onBookmark,
  onAddToCart,
}: {
  rec: any;
  cartItems: any[];
  updateQuantity: (id: string, qty: number) => void;
  onBookmark: (rec: any) => void;
  onAddToCart: (rec: any, finalPrice: number) => void;
}) => {
  const isLaundry = isLaundryItem(rec);
  const itemCat = isLaundry ? 'Nguo' : (rec.cat || rec.category || 'Product');
  const dynamicPrice = useDynamicPrice(
    rec.price || 0,
    rec.storeId || rec.store,
    isLaundry,
    rec.location,
    undefined,
    itemCat
  );

  const cartItem = cartItems.find((i: any) => i.productId === rec.id || i.baseProductId === rec.id);
  const stockVal = rec.quantity !== undefined ? rec.quantity : (rec.idadi !== undefined ? rec.idadi : rec.maxQuantity);
  const isSoldOut = (stockVal !== undefined && stockVal <= 0) || rec.availability === false;

  const { rating: normRating } = getNormalizedRating(rec);
  const displayRating = rec.rating && Number(rec.rating) > 0 ? Number(rec.rating) : normRating;

  return (
    <Card className="p-3 bg-card border border-border flex flex-col justify-between h-full group">
      <div>
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-3">
          <img src={resolveImageUrl(rec.imgUrl || rec)} alt={rec.name} className="w-full h-full object-cover" />
          {isSoldOut ? (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-[9px] font-extrabold text-foreground bg-background/90 px-2 py-0.5 rounded shadow-sm">
                Sold Out
              </span>
            </div>
          ) : stockVal !== undefined && stockVal > 0 ? (
            <div className="absolute top-1.5 right-1.5 bg-background/90 backdrop-blur text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full shadow-sm">
              {stockVal} left
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-primary">
            {rec.category === 'Nguo' || rec.category === 'nguo' ? 'Laundry' : rec.category}
          </span>
          {displayRating && (
            <span className="text-[9px] font-bold text-foreground flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />
              {displayRating}
            </span>
          )}
        </div>
        <h4 className="font-extrabold text-xs text-foreground mt-1 group-hover:text-primary transition-colors line-clamp-1">
          {rec.name}
        </h4>
        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{rec.description}</p>
      </div>

      <div className="flex justify-between items-center mt-3 pt-2 border-t border-border">
        <span className="font-extrabold text-xs text-foreground">{formatPrice(dynamicPrice)} {APP_SETTINGS.currency}</span>

        <div className="flex gap-1">
          <button
            onClick={() => onBookmark(rec)}
            className="p-1.5 text-muted-foreground hover:text-red-500 rounded-full"
            title="Bookmark item"
          >
            <Heart className="w-3.5 h-3.5" />
          </button>

          {cartItem && cartItem.quantity > 0 ? (
            <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-full border border-border shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateQuantity(cartItem.productId, cartItem.quantity - 1);
                }}
                className="w-5 h-5 flex items-center justify-center rounded-full bg-card text-foreground shadow-xs hover:bg-destructive hover:text-white transition-colors"
                title="Decrease quantity"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-extrabold text-xs px-1 text-foreground min-w-[1rem] text-center">{cartItem.quantity}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (stockVal !== undefined && stockVal > 0 && cartItem.quantity >= stockVal) {
                    alert(`Cannot add more. Maximum available stock reached (${stockVal} left in stock).`);
                    return;
                  }
                  updateQuantity(cartItem.productId, cartItem.quantity + 1);
                }}
                className="w-5 h-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
                title="Increase quantity"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : isSoldOut ? (
            <span className="text-[9px] font-extrabold text-rose-500 px-1.5 py-0.5">
              Sold Out
            </span>
          ) : (
            <button
              onClick={() => onAddToCart(rec, dynamicPrice)}
              className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-full transition-colors"
              title="Add to cart"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};

export const FavoritesPage = () => {
  const navigate = useNavigate();

  // Tab states
  const [activeTab, setActiveTab] = useState<'favorites' | 'wishlists'>('favorites');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [favoriteTypeFilter, setFavoriteTypeFilter] = useState<'all' | 'store' | 'item'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'price_low' | 'price_high'>('recent');

  // Modal / Input states for Wishlist creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [newWishlistDesc, setNewWishlistDesc] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  const { user, isAuthenticated } = useAuthStore();
  const [firestoreFavorites, setFirestoreFavorites] = useState<any[]>([]);

  const {
    favorites,
    wishlists,
    initialize,
    toggleFavorite,
    removeFavorite,
    createWishlist,
    deleteWishlist,
    removeFromWishlist
  } = useFavoritesStore();

  const { items: cartItems, addToCart, updateQuantity, clearCart, getTotals, removeFromCart } = useCartStore();
  const [isCartClosed, setIsCartClosed] = useState(false);
  const [showAllMobileCartItems, setShowAllMobileCartItems] = useState(false);
  const { total: cartTotal } = getTotals();
  const hasItems = cartItems.length > 0;

  const handleCheckout = () => {
    navigate('/cart');
  };

  // Initialize store
  useEffect(() => {
    initialize(user?.id || 'guest_user');
  }, [initialize, user?.id]);

  // Live Firestore subscription for userfavorites collection (both favorites and stores subcollections)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setFirestoreFavorites([]);
      return;
    }
    try {
      const favsRef = collection(db, 'userfavorites', user.id, 'favorites');
      const storesRef = collection(db, 'userfavorites', user.id, 'stores');

      let favsList: any[] = [];
      let storesList: any[] = [];

      const combineAndSet = () => {
        const docsMap = new Map<string, any>();
        const processItem = (docSnap: any) => {
          const data = docSnap.data();
          if (data.fav !== false) {
            const { rating: calculatedRating, reviewCount: calculatedReviewCount } = getNormalizedRating(data);
            const isStoreDoc = data.type === 'store' || data.recordType === 'store' || data.category === 'Store' || data.cat === 'Store';
            const resolvedCat = resolveItemCategory(data);
            const resolvedStoreCat = resolveStoreCategory(data);

            docsMap.set(docSnap.id, {
              id: docSnap.id,
              itemId: data.foodId || data.id || docSnap.id,
              docId: docSnap.id,
              userId: user.id,
              type: data.type || (data.category === 'Store' ? 'store' : 'product'),
              name: data.name || data.nam1 || data.store || 'Favorite Item',
              description: data.description || data.desc || '',
              price: Number(data.price || data.price1 || 0),
              quantity: data.quantity ?? data.quanty ?? data.idadi ?? data.count,
              idadi: data.idadi ?? data.quantity ?? data.quanty,
              time: data.time || data.updatedAt || data.createdAt || '',
              ...(data as any),
              storeCategory: data.storeCategory || data.cat || data.category || data.subCategory || resolvedStoreCat,
              category: data.category || data.cat || data.storeCategory || (isStoreDoc ? 'Store' : resolvedCat),
              cat: data.cat || data.category || data.storeCategory || (isStoreDoc ? (resolvedStoreCat !== 'Store' ? resolvedStoreCat : 'Store') : (data.cat || data.category || resolvedCat)),
              subCat: data.subCat || data.subCategory || data.cat || data.category || resolvedCat,
              imageUrl: resolveImageUrl(data),
              rating: calculatedRating,
              reviewCount: calculatedReviewCount,
            });
          }
        };

        favsList.forEach(processItem);
        storesList.forEach(processItem);

        const list = Array.from(docsMap.values());

        // Arrange in descending order using "time" field
        list.sort((a, b) => {
          const getTimeMs = (item: any) => {
            const rawTime = item.time || item.createdAt || item.updatedAt;
            if (!rawTime) return 0;
            if (rawTime instanceof Date) return rawTime.getTime();
            return new Date(rawTime).getTime() || 0;
          };
          return getTimeMs(b) - getTimeMs(a);
        });

        setFirestoreFavorites(list);
      };

      const unsubFavs = onSnapshot(favsRef, (snap) => {
        favsList = snap.docs;
        combineAndSet();
      }, (err) => {
        console.warn('Error listening to favorites in FavoritesPage:', err);
      });

      const unsubStores = onSnapshot(storesRef, (snap) => {
        storesList = snap.docs;
        combineAndSet();
      }, (err) => {
        console.warn('Error listening to store favorites in FavoritesPage:', err);
      });

      return () => {
        unsubFavs();
        unsubStores();
      };
    } catch (e) {
      console.warn('userfavorites listener error:', e);
    }
  }, [user?.id, isAuthenticated]);

  // Combined favorites: prefers live Firestore favorites if available, fallback to store favorites
  const activeFavorites = (isAuthenticated && firestoreFavorites.length > 0) ? firestoreFavorites : favorites;

  // Handle toggle remove
  const handleRemove = (favItem: any) => {
    const activeUid = user?.id || 'guest_user';
    setFirestoreFavorites((prev) =>
      prev.filter((f) => f.id !== favItem.id && f.itemId !== favItem.itemId && (favItem.docId ? f.docId !== favItem.docId : true))
    );
    removeFavorite(activeUid, favItem);
  };

  // Filter & Sort favorites
  const filteredFavorites = activeFavorites
    .filter((fav) => {
      // Category type filter
      const isStoreType = fav.type === 'store' || (fav as any).recordType === 'store' || (fav as any).category === 'Store' || (fav as any).cat === 'Store';
      if (favoriteTypeFilter === 'store' && !isStoreType) return false;
      if (favoriteTypeFilter === 'item' && isStoreType) return false;

      // Category filter (Food, Laundry, Electrical, Beauty)
      if (selectedCategoryFilter !== 'all') {
        const catTarget = selectedCategoryFilter.toLowerCase();
        const storeCat = String(fav.cat || fav.category || fav.storeCategory || fav.subCategory || '').toLowerCase();
        const itemCat = String(resolveItemCategory(fav)).toLowerCase();
        const resStoreCat = String(resolveStoreCategory(fav)).toLowerCase();

        const catMatches = storeCat.includes(catTarget) || itemCat.includes(catTarget) || resStoreCat.includes(catTarget) ||
          (catTarget === 'laundry' && (storeCat.includes('nguo') || itemCat.includes('nguo') || resStoreCat.includes('nguo')));

        if (!catMatches) return false;
      }

      // Search query
      const nameStr = String(fav.name || fav.store || '');
      const descStr = String(fav.description || '');
      const catStr = String(fav.cat || fav.category || '');
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return nameStr.toLowerCase().includes(q) || descStr.toLowerCase().includes(q) || catStr.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'price_low') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'price_high') {
        return (b.price || 0) - (a.price || 0);
      }
      // 'recent' sorting: arrange in descending order using "time" field
      const getTimeMs = (item: any) => {
        const rawTime = item.time || item.createdAt || item.updatedAt;
        if (!rawTime) return 0;
        if (rawTime instanceof Date) return rawTime.getTime();
        return new Date(rawTime).getTime() || 0;
      };
      return getTimeMs(b) - getTimeMs(a);
    });

  // Handle wishlist folder creation
  const handleCreateWishlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWishlistName.trim()) return;
    createWishlist('user_current', newWishlistName.trim(), newWishlistDesc.trim());
    setNewWishlistName('');
    setNewWishlistDesc('');
    setShowCreateModal(false);
  };

  // Calculate recommendation items based on active favorite categories
  const getPersonalizedRecommendations = () => {
    // Collect categories already favorited
    const savedCategories = favorites.map((f) => f.type);
    const hasFood = favorites.some((f) => f.name.toLowerCase().includes('chapati') || f.name.toLowerCase().includes('combo'));
    const hasLaundry = favorites.some((f) => f.type === 'service' || f.name.toLowerCase().includes('laundry') || f.name.toLowerCase().includes('iron'));

    // Pull catalog base
    const allProducts = productService.getMockProducts('all');

    // Filter recommendations (items NOT already saved in favorites)
    return allProducts
      .filter((prod) => {
        const alreadySaved = favorites.some((f) => f.itemId === prod.id);
        if (alreadySaved) return false;

        // Custom weight matching
        if (hasLaundry && prod.category.toLowerCase().includes('laundry')) return true;
        if (hasFood && prod.category.toLowerCase().includes('food')) return true;
        return prod.rating >= 4.8; // default fallback: high quality items
      })
      .slice(0, 3); // limit to 3 elements
  };

  const recommendations = getPersonalizedRecommendations();

  return (
    <PageContainer>
      {/* Top Header & Tab Navigation */}
      <div className="w-full bg-background pt-6">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
          {/* Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                Personal Space
              </span>
              <h1 className="text-2xl font-extrabold text-foreground mt-3">
                Favorites & Saved Wishlists
              </h1>
            </div>

            {activeTab === 'wishlists' && (
              <Button
                onClick={() => setShowCreateModal(true)}
                size="sm"
                className="font-bold text-xs shadow-md self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Collection
              </Button>
            )}
          </div>

          {/* Main Tab Navigation */}
          <div className="flex border-b border-border gap-6 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('favorites')}
              className={`pb-3 font-bold text-xs uppercase tracking-wider relative transition-all whitespace-nowrap ${activeTab === 'favorites' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Saved Favorites ({favorites.length})
              {activeTab === 'favorites' && (
                <motion.div
                  layoutId="favoritesTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab('wishlists')}
              className={`pb-3 font-bold text-xs uppercase tracking-wider relative transition-all whitespace-nowrap ${activeTab === 'wishlists' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Custom Wishlists ({wishlists.length})
              {activeTab === 'wishlists' && (
                <motion.div
                  layoutId="favoritesTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search HUD Bar (Sticky Floating Header in both Desktop & Mobile views) */}
      {activeTab === 'favorites' && (
        <div className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-2xl border-b border-border/60 shadow-md py-3.5 transition-all my-2">
          <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 flex flex-col md:flex-row gap-3 md:gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved items or stores..."
                className="pl-10 bg-card/75 dark:bg-card/60 backdrop-blur-xl border-border/80 rounded-2xl shadow-md text-xs w-full"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto justify-between md:justify-end">
              {/* Type filter tabs: All, Stores, Items */}
              <div className="flex border border-border rounded-lg p-0.5 bg-muted text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setFavoriteTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-md font-extrabold flex items-center gap-1 transition-all ${favoriteTypeFilter === 'all'
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>All ✨</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFavoriteTypeFilter('store')}
                  className={`px-3 py-1.5 rounded-md font-extrabold flex items-center gap-1 transition-all ${favoriteTypeFilter === 'store'
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <StoreIcon className="w-3 h-3" />
                  <span>Stores 🏪</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFavoriteTypeFilter('item')}
                  className={`px-3 py-1.5 rounded-md font-extrabold flex items-center gap-1 transition-all ${favoriteTypeFilter === 'item'
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span>Items 🛍️</span>
                </button>
              </div>

              {/* Sorting Select */}
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-foreground cursor-pointer"
              >
                <option value="recent">Recently Added</option>
                <option value="rating">Top Rated First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <ContentContainer size="md" className="flex flex-col min-h-[70vh] pt-4">

        {/* Tab Panels */}
        <div className="flex-1">
          {/* FAVORITES VIEW */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              {filteredFavorites.length === 0 ? (
                <div className="text-center py-16 bg-muted/40 border border-border/80 rounded-2xl">
                  <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-base font-bold mb-1 text-foreground">No Saved Favorites</h3>
                  <p className="text-muted-foreground text-xs max-w-sm mx-auto mb-6">
                    Items or service providers you bookmark will appear here for fast shortcuts.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button onClick={() => navigate('/explore')} size="sm">Explore Services</Button>
                    <Button
                      onClick={() => navigate('/explore?category=Food')}
                      variant="outline"
                      size="sm"
                      className="border-primary text-primary hover:bg-primary/10 font-bold shadow-xs transition-all"
                    >
                      Hot Meals 🔥
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {filteredFavorites.map((fav) => (
                      <motion.div
                        key={fav.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        layout
                      >
                        <FavoriteCardItem
                          fav={fav}
                          cartItems={cartItems}
                          updateQuantity={updateQuantity}
                          onRemove={handleRemove}
                          onQuickView={(f) => {
                            const isStore = f.type === 'store' || (f as any).recordType === 'store' || (f as any).category === 'Store';
                            if (isStore) {
                              const storeName = f.store || f.name;
                              const isGeneric = !f.itemId || f.itemId === 's1' || f.itemId === 'Tulete Duka' || f.itemId === 'Tulete Dobi' || f.itemId === 'unknown';
                              const targetId = !isGeneric ? f.itemId : (storeName || f.itemId || 's1');
                              navigate(`/store/${encodeURIComponent(targetId)}`, { state: { storeData: { ...f, store: storeName } } });
                            } else {
                              const catalog = productService.getMockProducts('all');
                              const item = catalog.find((c) => c.id === f.itemId);
                              if (item) {
                                setQuickViewProduct(item);
                              } else {
                                navigate(`/product/${encodeURIComponent(f.itemId)}`, { state: { product: f } });
                              }
                            }
                          }}
                          onNavigate={(f) => {
                            const isStore = f.type === 'store' || (f as any).recordType === 'store' || (f as any).category === 'Store';
                            if (isStore) {
                              const storeName = f.store || f.name;
                              const isGeneric = !f.itemId || f.itemId === 's1' || f.itemId === 'Tulete Duka' || f.itemId === 'Tulete Dobi' || f.itemId === 'unknown';
                              const targetId = !isGeneric ? f.itemId : (storeName || f.itemId || 's1');
                              navigate(`/store/${encodeURIComponent(targetId)}`, { state: { storeData: { ...f, store: storeName } } });
                            } else {
                              navigate(`/product/${encodeURIComponent(f.itemId)}`, { state: { product: f } });
                            }
                          }}
                          onAddToCart={(f, finalPrice) => {
                            const catalog = productService.getMockProducts('all');
                            const item = catalog.find((c) => c.id === f.itemId);
                            const combined = { ...item, ...f };

                            const isLaundry = isLaundryItem(combined);
                            // Detect food more reliably: check explicit flags, _collection, and category fields
                            const isFdByFlag = combined.isFood === true;
                            const isFdByColl = String(combined._collection || '').toLowerCase() === 'foods';
                            const isFdByCat = ['food', 'foods'].includes(String(combined.category || combined.cat || '').toLowerCase());
                            const isFd = !isLaundry && (isFdByFlag || isFdByColl || isFdByCat || isFoodItem(combined));
                            const isProd = !isLaundry && !isFd;

                            // Always use canonical category so CartPage renders the correct UI
                            const canonicalCat = isLaundry ? 'Nguo' : (isFd ? 'Food' : 'Product');

                            const brandVal = String(f.brand || f.pbrand || f.FBrand || f.LBrand || combined.brand || (item as any)?.brand || '').trim();
                            const finalStoreId = combined.storeId || combined.store || brandVal || item?.storeId || 's1';
                            const finalStoreName = combined.storeName || combined.store || brandVal || item?.store || 'Verified Partner';

                            const hour = new Date().getHours();
                            const isBrandNow = brandVal.toLowerCase() === 'now';
                            const defaultFoodSlot = isBrandNow ? 'ASAP' : (hour < 15 ? 'Lunch' : 'Dinner');
                            // Use stored slot only if it's a valid food slot, otherwise use default
                            const storedSlot = String((combined as any).deliverySlot || '');
                            const validFoodSlots = isBrandNow ? ['ASAP', 'Lunch', 'Dinner', 'Mchana', 'Usiku'] : ['Lunch', 'Dinner', 'Mchana', 'Usiku'];
                            const slot = isLaundry ? 'Laundry' : (isFd ? (validFoodSlots.includes(storedSlot) ? storedSlot : defaultFoodSlot) : 'Product');

                            addToCart({
                              productId: combined.itemId || combined.id || f.itemId,
                              baseProductId: combined.itemId || combined.id || f.itemId,
                              name: combined.name || 'Favorite Item',
                              price: finalPrice,
                              basePrice: combined.price || finalPrice,
                              imageUrl: resolveImageUrl(combined.imageUrl || combined.imgUrl || combined),
                              storeId: finalStoreId,
                              storeName: finalStoreName,
                              brand: brandVal,
                              category: canonicalCat,
                              cat: canonicalCat,
                              location: combined.location || item?.location,
                              idadi: combined.idadi || item?.idadi,
                              isLaundry,
                              isProduct: isProd,
                              isFood: isFd,
                              washingSelected: combined.washingSelected ?? true,
                              ironingSelected: combined.ironingSelected ?? false,
                              packagingSelected: combined.packagingSelected ?? false,
                              vipSelected: combined.vipSelected ?? false,
                              deliverySlot: slot,
                              isDeliverySelected: combined.isDeliverySelected ?? true,
                              packagepickup: combined.packagepickup ?? false,
                            });
                          }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* WISHLISTS VIEW */}
          {activeTab === 'wishlists' && (
            <div className="space-y-4">
              {wishlists.length === 0 ? (
                <div className="text-center py-16 bg-muted/40 border border-border/80 rounded-2xl">
                  <FolderHeart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-base font-bold mb-1 text-foreground">No Wishlists Collections</h3>
                  <p className="text-muted-foreground text-xs max-w-sm mx-auto mb-6">
                    Create customized categories (e.g. Laundry Bundles) to group services and products together.
                  </p>
                  <Button onClick={() => setShowCreateModal(true)} size="sm">Create First Folder</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {wishlists.map((wish) => (
                    <Card key={wish.id} className="p-5 border border-border bg-card shadow-sm relative overflow-hidden">
                      <div className="flex justify-between items-start gap-4 mb-3 pb-3 border-b border-border">
                        <div>
                          <h3 className="font-extrabold text-sm text-foreground">{wish.name}</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{wish.description || 'Collection checklist'}</p>
                        </div>

                        <button
                          onClick={() => deleteWishlist(wish.id)}
                          className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1 font-bold shrink-0 p-1.5 sm:p-0 rounded-lg sm:rounded-none hover:bg-rose-50 sm:hover:bg-transparent dark:hover:bg-rose-950/20 sm:dark:hover:bg-transparent transition-colors"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="hidden sm:inline">Delete Folder</span>
                        </button>
                      </div>

                      {wish.itemIds.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic py-2">No items saved in this wishlist folder yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {wish.itemIds.map((itemId) => {
                            const catalog = productService.getMockProducts('all');
                            const item = catalog.find((c) => c.id === itemId);
                            if (!item) return null;
                            const cartItem = cartItems.find((i: any) => i.productId === item.id || i.baseProductId === item.id);
                            const stockVal = item.quantity !== undefined ? item.quantity : (item.idadi !== undefined ? item.idadi : (item as any).maxQuantity);
                            const isSoldOut = (stockVal !== undefined && stockVal <= 0) || (item as any).availability === false;

                            return (
                              <div key={itemId} className="flex items-center justify-between gap-4 p-2 bg-muted rounded-lg text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img src={item.imgUrl} alt={item.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                  <div className="min-w-0">
                                    <span className="font-bold text-foreground truncate block">{item.name}</span>
                                    {isSoldOut ? (
                                      <span className="text-[9px] font-extrabold text-rose-500">Sold Out</span>
                                    ) : stockVal !== undefined && stockVal > 0 ? (
                                      <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">{stockVal} left</span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-foreground shrink-0">{formatPrice(item.price)} {APP_SETTINGS.currency}</span>

                                  {cartItem && cartItem.quantity > 0 ? (
                                    <div className="flex items-center gap-1 bg-card px-1.5 py-0.5 rounded-full border border-border shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => updateQuantity(cartItem.productId, cartItem.quantity - 1)}
                                        className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-foreground shadow-xs hover:bg-destructive hover:text-white transition-colors"
                                        title="Decrease quantity"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="font-extrabold text-xs px-1 text-foreground min-w-[1rem] text-center">{cartItem.quantity}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (stockVal !== undefined && stockVal > 0 && cartItem.quantity >= stockVal) {
                                            alert(`Cannot add more. Maximum available stock reached (${stockVal} left in stock).`);
                                            return;
                                          }
                                          updateQuantity(cartItem.productId, cartItem.quantity + 1);
                                        }}
                                        className="w-5 h-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
                                        title="Increase quantity"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : isSoldOut ? (
                                    <span className="text-[10px] font-extrabold text-rose-500 px-2 py-0.5">Out of Stock</span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        const isLaundry = isLaundryItem(item);
                                        const isFdByFlag = (item as any).isFood === true;
                                        const isFdByColl = String((item as any)._collection || '').toLowerCase() === 'foods';
                                        const isFdByCat = ['food', 'foods'].includes(String((item as any).category || (item as any).cat || '').toLowerCase());
                                        const isFd = !isLaundry && (isFdByFlag || isFdByColl || isFdByCat || isFoodItem(item));
                                        const isProd = !isLaundry && !isFd;

                                        // Always use canonical category so CartPage renders the correct UI
                                        const canonicalCat = isLaundry ? 'Nguo' : (isFd ? 'Food' : 'Product');

                                        const hour = new Date().getHours();
                                        const bVal = String((item as any).brand || item.store || '').toLowerCase().trim();
                                        const isBrandNow = bVal === 'now';
                                        const defaultFoodSlot = isBrandNow ? 'ASAP' : (hour < 15 ? 'Lunch' : 'Dinner');
                                        const storedSlot = String((item as any).deliverySlot || '');
                                        const validFoodSlots = isBrandNow ? ['ASAP', 'Lunch', 'Dinner', 'Mchana', 'Usiku'] : ['Lunch', 'Dinner', 'Mchana', 'Usiku'];
                                        const slot = isLaundry ? 'Laundry' : (isFd ? (validFoodSlots.includes(storedSlot) ? storedSlot : defaultFoodSlot) : 'Product');

                                        addToCart({
                                          productId: item.id,
                                          baseProductId: item.id,
                                          name: item.name,
                                          price: item.price,
                                          basePrice: item.price,
                                          imageUrl: item.imgUrl,
                                          storeId: item.storeId,
                                          storeName: item.store,
                                          brand: (item as any).brand || (item as any).pbrand || '',
                                          category: canonicalCat,
                                          cat: canonicalCat,
                                          location: item.location,
                                          idadi: stockVal,
                                          maxQuantity: stockVal,
                                          isLaundry,
                                          isProduct: isProd,
                                          isFood: isFd,
                                          washingSelected: isLaundry ? true : undefined,
                                          deliverySlot: slot,
                                          isDeliverySelected: !isProd,
                                        });
                                      }}
                                      className="p-1.5 text-primary hover:bg-primary/10 rounded-full"
                                      title="Add to cart"
                                    >
                                      <ShoppingCart className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    onClick={() => removeFromWishlist(wish.id, itemId)}
                                    className="text-muted-foreground hover:text-rose-500 p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors shrink-0"
                                    title="Remove from wishlist"
                                  >
                                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Smart Personalized Recommendations Widget */}
        {recommendations.length > 0 && (
          <div className="mt-12 bg-muted/60 border border-border/80 p-5 rounded-2xl shadow-sm">
            <h3 className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground mb-4">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              Inspired by your Saves & Favorites
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.map((rec) => (
                <RecommendationCardItem
                  key={rec.id}
                  rec={rec}
                  cartItems={cartItems}
                  updateQuantity={updateQuantity}
                  onBookmark={(item) => {
                    const activeUid = user?.id || 'guest_user';
                    const { rating: normRating, reviewCount: normReviewCount } = getNormalizedRating(item);
                    toggleFavorite(activeUid, {
                      ...item,
                      itemId: item.id,
                      type: 'product',
                      name: item.name,
                      description: item.description,
                      imageUrl: item.imgUrl,
                      price: item.price,
                      rating: item.rating ?? normRating,
                      reviewCount: item.reviewCount ?? normReviewCount,
                    });
                    alert(`Bookmarked ${item.name}!`);
                  }}
                  onAddToCart={(item, finalPrice) => {
                    const isLaundry = isLaundryItem(item);
                    const isFdByFlag = (item as any).isFood === true;
                    const isFdByColl = String((item as any)._collection || '').toLowerCase() === 'foods';
                    const isFdByCat = ['food', 'foods'].includes(String((item as any).category || (item as any).cat || '').toLowerCase());
                    const isFd = !isLaundry && (isFdByFlag || isFdByColl || isFdByCat || isFoodItem(item));
                    const isProd = !isLaundry && !isFd;

                    // Always use canonical category so CartPage renders the correct UI
                    const canonicalCat = isLaundry ? 'Nguo' : (isFd ? 'Food' : 'Product');

                    const hour = new Date().getHours();
                    const bVal = String((item as any).brand || (item as any).pbrand || item.store || '').toLowerCase().trim();
                    const isBrandNow = bVal === 'now';
                    const defaultFoodSlot = isBrandNow ? 'ASAP' : (hour < 15 ? 'Lunch' : 'Dinner');
                    const storedSlot = String((item as any).deliverySlot || '');
                    const validFoodSlots = isBrandNow ? ['ASAP', 'Lunch', 'Dinner', 'Mchana', 'Usiku'] : ['Lunch', 'Dinner', 'Mchana', 'Usiku'];
                    const slot = isLaundry ? 'Laundry' : (isFd ? (validFoodSlots.includes(storedSlot) ? storedSlot : defaultFoodSlot) : 'Product');

                    addToCart({
                      productId: item.id,
                      baseProductId: item.id,
                      name: item.name,
                      price: finalPrice,
                      basePrice: item.price,
                      imageUrl: item.imgUrl,
                      storeId: item.storeId,
                      storeName: item.store,
                      brand: (item as any).brand || (item as any).pbrand || '',
                      category: canonicalCat,
                      cat: canonicalCat,
                      location: item.location,
                      idadi: item.idadi,
                      isLaundry,
                      isProduct: isProd,
                      isFood: isFd,
                      washingSelected: isLaundry ? true : undefined,
                      deliverySlot: slot,
                      isDeliverySelected: !isProd,
                    });
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* CREATE WISHLIST COLLECTION MODAL POPUP */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card w-full max-w-md rounded-2xl p-6 border border-border shadow-2xl relative"
              >
                <h3 className="font-extrabold text-base text-foreground mb-1">Create Wishlist Folder</h3>
                <p className="text-[11px] text-muted-foreground mb-4">Organize your saved items by category folder structure.</p>

                <form onSubmit={handleCreateWishlist} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Folder Name</label>
                    <Input
                      value={newWishlistName}
                      onChange={(e) => setNewWishlistName(e.target.value)}
                      placeholder="e.g. Weekend Chapati Treats"
                      className="text-xs py-3"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Description (Optional)</label>
                    <textarea
                      value={newWishlistDesc}
                      onChange={(e) => setNewWishlistDesc(e.target.value)}
                      placeholder="Brief description of these grouped items..."
                      className="w-full text-xs bg-muted border border-border rounded-lg p-3 outline-none focus:ring-1 focus:ring-primary"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateModal(false)}
                      className="font-bold text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="font-bold text-xs"
                    >
                      Create Folder
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Quick View Modal (Bottom Sheet on Mobile) ── */}
        <AnimatePresence>
          {quickViewProduct && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setQuickViewProduct(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
              >
                <div className="relative h-64 sm:h-72 bg-muted shrink-0">
                  <img src={resolveImageUrl(quickViewProduct.imgUrl || quickViewProduct)} alt={quickViewProduct.name} className="w-full h-full object-cover" />
                  <button onClick={() => setQuickViewProduct(null)} className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 transition-colors rounded-full p-2 backdrop-blur-md">
                    <X className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-4 left-4 flex gap-2">
                    {quickViewProduct.tags?.includes('Most TamTam') && (
                      <span className="text-xs font-extrabold px-3 py-1 rounded-full shadow-sm backdrop-blur-md bg-success/90 text-primary-foreground tracking-wide">
                        HOT 🔥
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 overflow-y-auto">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-foreground">{quickViewProduct.name}</h2>
                      <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1">
                        <StoreIcon className="w-4 h-4" /> {quickViewProduct.store}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-primary font-extrabold text-2xl">{APP_SETTINGS.currency} {formatPrice(quickViewProduct.price)}</p>
                      {quickViewProduct.oldprice && quickViewProduct.oldprice > quickViewProduct.price && (
                        <p className="text-muted-foreground line-through text-sm">{APP_SETTINGS.currency} {formatPrice(quickViewProduct.oldprice)}</p>
                      )}
                    </div>
                  </div>

                  {quickViewProduct.description && (
                    <div className="mt-6">
                      <h3 className="text-sm font-bold text-foreground mb-2">Description</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{quickViewProduct.description}</p>
                    </div>
                  )}
                  {(() => {
                    const stockVal = quickViewProduct.quantity !== undefined ? quickViewProduct.quantity : (quickViewProduct.idadi !== undefined ? quickViewProduct.idadi : quickViewProduct.maxQuantity);
                    const isSoldOut = (stockVal !== undefined && stockVal <= 0) || quickViewProduct.availability === false;

                    return (
                      <div className="mt-8 flex flex-col gap-3">
                        {stockVal !== undefined && stockVal > 0 && !isSoldOut && (
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            In Stock ({stockVal} available)
                          </p>
                        )}
                        <Button
                          disabled={isSoldOut}
                          onClick={() => {
                            if (isSoldOut) return;
                            addToCart({
                              productId: quickViewProduct.id,
                              baseProductId: quickViewProduct.id,
                              name: quickViewProduct.name,
                              price: quickViewProduct.price,
                              imageUrl: quickViewProduct.imgUrl,
                              storeId: quickViewProduct.storeId,
                              storeName: quickViewProduct.store,
                              cat: quickViewProduct.category || '',
                              location: quickViewProduct.location,
                              idadi: stockVal,
                              maxQuantity: stockVal,
                              isLaundry: isLaundryItem(quickViewProduct)
                            });
                            setQuickViewProduct(null);
                          }}
                          className={`flex-1 py-6 text-lg font-bold rounded-2xl shadow-lg ${isSoldOut ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'shadow-primary/25'
                            }`}
                        >
                          {isSoldOut ? 'Out of Stock' : 'Add to Cart'}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        {/* CREATE WISHLIST COLLECTION MODAL POPUP */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card w-full max-w-md rounded-2xl p-6 border border-border shadow-2xl relative"
              >
                <h3 className="font-extrabold text-base text-foreground mb-1">Create Wishlist Folder</h3>
                <p className="text-[11px] text-muted-foreground mb-4">Organize your saved items by category folder structure.</p>

                <form onSubmit={handleCreateWishlist} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Folder Name</label>
                    <Input
                      value={newWishlistName}
                      onChange={(e) => setNewWishlistName(e.target.value)}
                      placeholder="e.g. Weekend Chapati Treats"
                      className="text-xs py-3"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Description (Optional)</label>
                    <textarea
                      value={newWishlistDesc}
                      onChange={(e) => setNewWishlistDesc(e.target.value)}
                      placeholder="Brief description of these grouped items..."
                      className="w-full text-xs bg-muted border border-border rounded-lg p-3 outline-none focus:ring-1 focus:ring-primary"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateModal(false)}
                      className="font-bold text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="font-bold text-xs"
                    >
                      Create Folder
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Quick View Modal (Bottom Sheet on Mobile) ── */}
        <AnimatePresence>
          {quickViewProduct && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setQuickViewProduct(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
              >
                <div className="relative h-64 sm:h-72 bg-muted shrink-0">
                  <img src={resolveImageUrl(quickViewProduct.imgUrl || quickViewProduct)} alt={quickViewProduct.name} className="w-full h-full object-cover" />
                  <button onClick={() => setQuickViewProduct(null)} className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 transition-colors rounded-full p-2 backdrop-blur-md">
                    <X className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-4 left-4 flex gap-2">
                    {quickViewProduct.tags?.includes('Most TamTam') && (
                      <span className="text-xs font-extrabold px-3 py-1 rounded-full shadow-sm backdrop-blur-md bg-success/90 text-primary-foreground tracking-wide">
                        HOT 🔥
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 overflow-y-auto">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-foreground">{quickViewProduct.name}</h2>
                      <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1">
                        <StoreIcon className="w-4 h-4" /> {quickViewProduct.store}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-primary font-extrabold text-2xl">{APP_SETTINGS.currency} {formatPrice(quickViewProduct.price)}</p>
                      {quickViewProduct.oldprice && quickViewProduct.oldprice > quickViewProduct.price && (
                        <p className="text-muted-foreground line-through text-sm">{APP_SETTINGS.currency} {formatPrice(quickViewProduct.oldprice)}</p>
                      )}
                    </div>
                  </div>

                  {quickViewProduct.description && (
                    <div className="mt-6">
                      <h3 className="text-sm font-bold text-foreground mb-2">Description</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{quickViewProduct.description}</p>
                    </div>
                  )}
                  {(() => {
                    const stockVal = quickViewProduct.quantity !== undefined ? quickViewProduct.quantity : (quickViewProduct.idadi !== undefined ? quickViewProduct.idadi : quickViewProduct.maxQuantity);
                    const isSoldOut = (stockVal !== undefined && stockVal <= 0) || quickViewProduct.availability === false;

                    return (
                      <div className="mt-8 flex flex-col gap-3">
                        {stockVal !== undefined && stockVal > 0 && !isSoldOut && (
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            In Stock ({stockVal} available)
                          </p>
                        )}
                        <Button
                          disabled={isSoldOut}
                          onClick={() => {
                            if (isSoldOut) return;
                            addToCart({
                              productId: quickViewProduct.id,
                              baseProductId: quickViewProduct.id,
                              name: quickViewProduct.name,
                              price: quickViewProduct.price,
                              imageUrl: quickViewProduct.imgUrl,
                              storeId: quickViewProduct.storeId,
                              storeName: quickViewProduct.store,
                              cat: quickViewProduct.category || '',
                              location: quickViewProduct.location,
                              idadi: stockVal,
                              maxQuantity: stockVal,
                              isLaundry: isLaundryItem(quickViewProduct)
                            });
                            setQuickViewProduct(null);
                          }}
                          className={`flex-1 py-6 text-lg font-bold rounded-2xl shadow-lg ${isSoldOut ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'shadow-primary/25'
                            }`}
                        >
                          {isSoldOut ? 'Out of Stock' : 'Add to Cart'}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* ── Premium Floating Cart Panel ── */}
        <AnimatePresence>
          {hasItems && !isCartClosed && (
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed bottom-20 xl:bottom-6 left-3 right-3 xl:left-auto xl:right-6 xl:w-[400px] z-50"
            >
              <div
                className="relative overflow-hidden rounded-[2rem] shadow-2xl border border-white/10"
                style={{
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.97) 0%, rgba(234,88,12,0.97) 60%, rgba(251,146,60,0.97) 100%)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                }}
              >
                {/* Decorative top glow */}
                <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-yellow-300/30 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-red-700/30 blur-2xl pointer-events-none" />

                <div className="relative z-10 px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-4">

                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <div className="relative">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                          <ShoppingCart className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-white text-primary text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-lg">
                          {cartItems.reduce((a, i) => a + i.quantity, 0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-extrabold text-xs sm:text-sm leading-none">Your Cart</p>
                        <p className="text-white/70 text-[10px] sm:text-[11px] font-medium mt-0.5">
                          {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsCartClosed(true)}
                      title="Close Cart temporarily"
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center transition-all active:scale-90 cursor-pointer text-white"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </button>
                  </div>

                  {/* Item preview list — compact height on mobile (max 3 items when collapsed) */}
                  <div className={`space-y-1 mb-2 sm:mb-3 scrollbar-none ${showAllMobileCartItems ? 'max-h-[200px] overflow-y-auto' : 'max-h-[125px] sm:max-h-[145px] xl:max-h-[220px] overflow-hidden xl:overflow-y-auto'}`}>
                    {cartItems.map((item, index) => (
                      <div key={item.productId} className={`items-center justify-between gap-2 bg-white/10 rounded-xl px-2 py-1 sm:px-2.5 sm:py-1.5 backdrop-blur-sm ${index >= 3 && !showAllMobileCartItems ? 'hidden xl:flex' : 'flex'}`}>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <img
                            src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60'}
                            alt={item.name}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shrink-0 shadow-sm"
                          />
                          <span className="text-white text-[11px] sm:text-xs font-bold truncate">{item.name}</span>
                          <span className="shrink-0 bg-white/20 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full">
                            ×{item.quantity}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCart(item.productId);
                          }}
                          title={`Remove ${item.name}`}
                          className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-white/10 hover:bg-red-500/80 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Interactive toggle button on mobile to expand / scroll all items */}
                  {cartItems.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllMobileCartItems(!showAllMobileCartItems)}
                      className="w-full text-[10px] sm:text-[11px] font-extrabold text-white/95 hover:text-white text-center py-1 px-2 bg-black/20 hover:bg-black/35 rounded-xl backdrop-blur-sm xl:hidden transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-inner mb-2"
                    >
                      {showAllMobileCartItems ? (
                        <>
                          <span>Show fewer items</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>+ {cartItems.length - 3} more {cartItems.length - 3 === 1 ? 'item' : 'items'} in cart</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}

                  {/* Clear All Items Button */}
                  <button
                    onClick={clearCart}
                    className="w-full mb-2 sm:mb-3 py-1 sm:py-1.5 rounded-xl bg-black/25 hover:bg-red-600/80 text-white text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-inner"
                    title="Clear all items from cart"
                  >
                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    Clear Cart
                  </button>

                  {/* Divider */}
                  <div className="h-px bg-white/20 mb-2 sm:mb-3" />

                  {/* Total + CTA */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white/70 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Total</p>
                      <p className="text-white font-black text-base sm:text-lg leading-tight">
                        {APP_SETTINGS.currency} {formatPrice(cartTotal)}
                      </p>
                    </div>
                    <button
                      onClick={handleCheckout}
                      className="flex items-center gap-1.5 sm:gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-white text-primary rounded-2xl font-extrabold text-xs sm:text-sm shadow-lg hover:bg-white/90 active:scale-95 transition-all cursor-pointer"
                    >
                      Checkout
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

          {/* Re-open collapsed cart button when temporarily closed */}
          {hasItems && isCartClosed && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="fixed bottom-20 xl:bottom-6 right-3 xl:right-6 z-50 flex items-stretch gap-2"
            >
              <button
                onClick={() => setIsCartClosed(false)}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-black hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
              >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <ShoppingCart className="w-3.5 h-3.5 text-white" />
                </div>
                <span>Open Cart ({cartItems.length})</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-extrabold">{APP_SETTINGS.currency} {formatPrice(cartTotal)}</span>
              </button>
              <button
                onClick={clearCart}
                title="Clear all items from cart"
                className="self-stretch px-3.5 rounded-full bg-card text-destructive hover:bg-destructive hover:text-white border border-border shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </ContentContainer>
    </PageContainer>
  );
};
