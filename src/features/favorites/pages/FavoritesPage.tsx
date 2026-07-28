import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavoritesStore } from '../hooks/useFavoritesStore';
import { useCartStore } from '../../cart/store/useCartStore';
import { productService } from '../../products/services/productService';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { Badge } from '../../../shared/components/ui/Badge';
import { 
  Heart, HeartCrack, Search, FolderHeart, Plus, 
  Trash2, ShoppingCart, Star, Eye, ExternalLink, Sparkles, X, Store as StoreIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';

export const FavoritesPage = () => {
  const navigate = useNavigate();
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'favorites' | 'wishlists'>('favorites');
  const [favoriteTypeFilter, setFavoriteTypeFilter] = useState<'all' | 'store' | 'item'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'price_low' | 'price_high'>('recent');

  // Modal / Input states for Wishlist creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [newWishlistDesc, setNewWishlistDesc] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  const { 
    favorites, 
    wishlists, 
    initialize, 
    toggleFavorite, 
    createWishlist, 
    deleteWishlist,
    removeFromWishlist 
  } = useFavoritesStore();

  const { addToCart } = useCartStore();

  // Initialize
  useEffect(() => {
    initialize('user_current');
  }, [initialize]);

  // Handle toggle remove
  const handleRemove = (itemId: string, type: 'store' | 'product' | 'service', name: string) => {
    toggleFavorite('user_current', {
      itemId,
      type,
      name,
      description: '',
      imageUrl: '',
    });
  };

  // Filter & Sort favorites
  const filteredFavorites = favorites
    .filter((fav) => {
      // Category type filter
      if (favoriteTypeFilter === 'store' && fav.type !== 'store') return false;
      if (favoriteTypeFilter === 'item' && fav.type === 'store') return false;

      // Search query
      const nameMatch = fav.name.toLowerCase().includes(searchQuery.toLowerCase());
      const descMatch = fav.description.toLowerCase().includes(searchQuery.toLowerCase());
      return nameMatch || descMatch;
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
      // 'recent' fallback
      return 1; // standard list order
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
      <ContentContainer size="md" className="flex flex-col min-h-[85vh]">
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
      <div className="flex border-b border-border gap-6 mb-6 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('favorites')}
          className={`pb-3 font-bold text-xs uppercase tracking-wider relative transition-all whitespace-nowrap ${
            activeTab === 'favorites' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
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
          className={`pb-3 font-bold text-xs uppercase tracking-wider relative transition-all whitespace-nowrap ${
            activeTab === 'wishlists' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
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

      {/* Filter / Search HUD Bar (only for Favorites tab) */}
      {activeTab === 'favorites' && (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved items or stores..."
              className="pl-10 bg-card border-border text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Type selector */}
            <div className="flex border border-border rounded-lg p-0.5 bg-muted text-[10px] font-bold">
              <button
                onClick={() => setFavoriteTypeFilter('all')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  favoriteTypeFilter === 'all' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-muted-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFavoriteTypeFilter('store')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  favoriteTypeFilter === 'store' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-muted-foreground'
                }`}
              >
                Stores
              </button>
              <button
                onClick={() => setFavoriteTypeFilter('item')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  favoriteTypeFilter === 'item' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-muted-foreground'
                }`}
              >
                Items
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
      )}

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
                  <Button onClick={() => navigate('/explore?category=Food')} variant="outline" size="sm" className="bg-white">Hot Meals 🔥</Button>
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
                      <Card className="p-4 border border-border bg-card shadow-sm flex gap-4 items-center relative overflow-hidden group">
                        <img 
                          src={fav.imageUrl} 
                          alt={fav.name} 
                          className="w-20 h-20 rounded-xl object-cover bg-muted flex-shrink-0"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge className="bg-primary/10 text-primary border-0 text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0">
                              {fav.type}
                            </Badge>
                            {fav.rating && (
                              <span className="text-[10px] font-bold text-foreground flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                                {fav.rating}
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-sm text-foreground truncate mb-0.5">
                            {fav.name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">
                            {fav.description || 'Saved service shortcut'}
                          </p>

                          <div className="flex justify-between items-center">
                            {fav.price ? (
                              <span className="font-extrabold text-xs text-foreground">
                                {formatPrice(fav.price)} {APP_SETTINGS.currency}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-500">
                                Dodoma Hub Verified
                              </span>
                            )}

                            <div className="flex gap-1.5">
                              {/* Quick navigation shortcut */}
                              <button
                                onClick={() => {
                                  if (fav.type === 'store') {
                                    navigate(`/store/${fav.itemId}`);
                                  } else {
                                    const catalog = productService.getMockProducts('all');
                                    const item = catalog.find((c) => c.id === fav.itemId);
                                    if (item) {
                                      setQuickViewProduct(item);
                                    } else {
                                      navigate(`/product/${fav.itemId}`);
                                    }
                                  }
                                }}
                                className="p-2 bg-muted dark:bg-slate-800 text-muted-foreground hover:text-primary rounded-full transition-colors"
                                title="View details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Quick Cart button */}
                              {fav.type !== 'store' && (
                                <button
                                  onClick={() => {
                                    const catalog = productService.getMockProducts('all');
                                    const item = catalog.find((c) => c.id === fav.itemId);
                                    addToCart({
                                      productId: fav.itemId,
                                      baseProductId: fav.itemId,
                                      name: fav.name,
                                      price: fav.price || 0,
                                      imageUrl: fav.imageUrl,
                                      storeId: item?.storeId || 's1', 
                                      storeName: item?.store || 'Verified Partner',
                                      cat: item?.category || '',
                                      location: item?.location,
                                      idadi: item?.idadi,
                                      isLaundry: item?.category === 'Laundry' || item?.category === 'Nguo' || item?.category?.toLowerCase().includes('cloth') || (item as any)?._collection === 'cloths'
                                    });
                                    alert(`${fav.name} added to cart!`);
                                  }}
                                  className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-full transition-all"
                                  title="Add to cart"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Remove Bookmark */}
                              <button
                                onClick={() => handleRemove(fav.itemId, fav.type, fav.name)}
                                className="p-1.5 sm:p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-full transition-all shrink-0"
                                title="Remove favorite"
                              >
                                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </Card>
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

                          return (
                            <div key={itemId} className="flex items-center justify-between gap-4 p-2 bg-muted rounded-lg text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <img src={item.imgUrl} alt={item.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                <span className="font-bold text-foreground truncate">{item.name}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-foreground shrink-0">{formatPrice(item.price)} {APP_SETTINGS.currency}</span>
                                
                                <button
                                  onClick={() => {
                                    addToCart({
                                      productId: item.id,
                                      baseProductId: item.id,
                                      name: item.name,
                                      price: item.price,
                                      imageUrl: item.imgUrl,
                                      storeId: item.storeId,
                                      storeName: item.store,
                                      cat: item.category || '',
                                      location: item.location,
                                      idadi: item.idadi,
                                      isLaundry: item.category === 'Laundry' || item.category === 'Nguo' || item.category?.toLowerCase().includes('cloth') || (item as any)._collection === 'cloths'
                                    });
                                    alert(`${item.name} added to cart!`);
                                  }}
                                  className="p-1.5 text-primary hover:bg-primary/10 rounded-full"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                </button>

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
              <Card key={rec.id} className="p-3 bg-card border border-border flex flex-col justify-between h-full group">
                <div>
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-3">
                    <img src={rec.imgUrl} alt={rec.name} className="w-full h-full object-cover" />
                  </div>

                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-primary">{rec.category}</span>
                  <h4 className="font-extrabold text-xs text-foreground mt-1 group-hover:text-primary transition-colors line-clamp-1">
                    {rec.name}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{rec.description}</p>
                </div>

                <div className="flex justify-between items-center mt-3 pt-2 border-t border-border">
                  <span className="font-extrabold text-xs text-foreground">{formatPrice(rec.price)} {APP_SETTINGS.currency}</span>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        toggleFavorite('user_current', {
                          itemId: rec.id,
                          type: 'product',
                          name: rec.name,
                          description: rec.description,
                          imageUrl: rec.imgUrl,
                          price: rec.price,
                          rating: rec.rating,
                        });
                        alert(`Bookmarked ${rec.name}!`);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-red-500 rounded-full"
                    >
                      <Heart className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        addToCart({
                          productId: rec.id,
                          baseProductId: rec.id,
                          name: rec.name,
                          price: rec.price,
                          imageUrl: rec.imgUrl,
                          storeId: rec.storeId,
                          storeName: rec.store,
                          cat: rec.category || '',
                          location: rec.location,
                          idadi: rec.idadi,
                          isLaundry: rec.category === 'Laundry' || rec.category === 'Nguo' || rec.category?.toLowerCase().includes('cloth') || (rec as any)._collection === 'cloths'
                        });
                        alert(`${rec.name} added to cart!`);
                      }}
                      className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-full transition-colors"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
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
                 <img src={quickViewProduct.imgUrl} alt={quickViewProduct.name} className="w-full h-full object-cover" />
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
                 
                 <div className="mt-8 flex gap-3">
                   <Button 
                     onClick={() => { 
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
                          idadi: quickViewProduct.idadi,
                          isLaundry: quickViewProduct.category === 'Laundry' || quickViewProduct.category === 'Nguo' || quickViewProduct.category?.toLowerCase().includes('cloth') || quickViewProduct._collection === 'cloths'
                        });
                       setQuickViewProduct(null); 
                     }} 
                     className="flex-1 py-6 text-lg font-bold rounded-2xl shadow-lg shadow-primary/25"
                   >
                     Add to Cart
                   </Button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </ContentContainer>
    </PageContainer>
  );
};
