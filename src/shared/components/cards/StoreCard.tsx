import React from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin } from 'lucide-react';
import { Store } from '../../../features/stores/services/storeService';
import { Card, CardContent } from '../ui/Card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';

interface StoreCardProps {
  store: Store;
  distanceKm?: number;
  onClick?: () => void;
}

export const StoreCard = ({ store, distanceKm, onClick }: StoreCardProps) => {
  // Category from document field "cat", falling back to "category"
  const displayCategory = (store as any).cat || store.category || 'Store';

  // Calculate average rating and count from "rates" array field if present
  const ratesList = Array.isArray((store as any).rates)
    ? (store as any).rates.map((r: any) => Number(r)).filter((n: number) => !isNaN(n))
    : [];
  const ratesCount = ratesList.length;
  const computedAvg = ratesCount > 0
    ? (ratesList.reduce((a: number, b: number) => a + b, 0) / ratesCount)
    : (typeof store.rating === 'number' ? store.rating : parseFloat(String(store.rating || 0)));
  const totalCount = ratesCount > 0 ? ratesCount : (store.reviewCount || 0);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
      onClick={onClick}
    >
      <Card className="h-full overflow-hidden flex flex-col group cursor-pointer">
        {/* Banner */}
        <div className="relative h-24 bg-muted overflow-hidden">
          <img 
            src={store.imgURL} 
            alt={`${store.store} banner`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${store.availability ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'}`}>
              {store.availability ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-3 relative flex-grow flex flex-col">
          {/* Floating Avatar */}
          <div className="absolute -top-6 left-3 p-1 bg-card rounded-full shadow-sm">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={store.imgURL} alt={store.store} />
              <AvatarFallback>{store.store.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>

          <div className="mt-5 flex flex-col flex-grow">
            <div className="flex justify-between items-start gap-2 mb-1">
              <h3 className="font-semibold text-sm line-clamp-1">{store.store}</h3>
              <div className="flex items-center gap-0.5 text-yellow-500 shrink-0 bg-yellow-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold">
                <Star className="w-3 h-3 fill-current text-yellow-500" />
                <span>{computedAvg.toFixed(1)}</span>
                {totalCount > 0 && (
                  <span className="text-muted-foreground font-semibold ml-0.5">({totalCount})</span>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 flex-grow">
              {store.description}
            </p>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-auto pt-2 border-t border-border/50">
              <span className="truncate max-w-[120px] font-medium">{displayCategory}</span>
              {distanceKm !== undefined && (
                <div className="flex items-center gap-1 shrink-0 font-medium">
                  <MapPin className="w-3 h-3" />
                  <span>{distanceKm.toFixed(1)} km</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
