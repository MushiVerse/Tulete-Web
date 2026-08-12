import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { 
  Activity, Users, Search, Eye, Heart, ShoppingCart, Star, 
  Clock, ShieldCheck, Filter, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminLiveActivityPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const eventsRef = collection(db, 'analytics_events');
    const q = query(eventsRef, limit(150));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.docs.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });

      // Sort descending by timestamp or id
      list.sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setEvents(list);
      setLoading(false);
    }, (err) => {
      console.warn('Events snap error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredEvents = events.filter((ev) => {
    if (eventTypeFilter === 'all') return true;
    return ev.eventType === eventTypeFilter;
  });

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'visit':
        return { icon: Users, label: 'App Visit', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' };
      case 'search':
        return { icon: Search, label: 'Search Query', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'item_view':
        return { icon: Eye, label: 'Item View', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'favorite':
        return { icon: Heart, label: 'Wishlist Fav', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      case 'order':
        return { icon: ShoppingCart, label: 'Order Placed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'rating':
        return { icon: Star, label: 'Rating Given', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
      default:
        return { icon: Activity, label: type, color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Real-Time Customer Stream</span>
          </div>
          <h1 className="text-2xl font-black text-white">Live Activity Stream</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Watch customer interactions in real-time as they visit the app, execute search queries, view items, and place orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="h-11 px-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-extrabold text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Event Types</option>
            <option value="visit">Visits</option>
            <option value="search">Searches</option>
            <option value="item_view">Item Views</option>
            <option value="favorite">Favorites</option>
            <option value="order">Orders</option>
            <option value="rating">Ratings</option>
          </select>
        </div>
      </div>

      {/* Stream List */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <h2 className="text-lg font-black text-white">Latest Customer Events Log</h2>
          <span className="text-xs font-bold text-slate-400">
            Showing {filteredEvents.length} events
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            Connecting to live event stream in Firestore...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            No recent activity events matching current filter.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((ev, idx) => {
                const config = getEventBadge(ev.eventType);
                const Icon = config.icon;
                const timeStr = ev.timestamp?.toDate ? ev.timestamp.toDate().toLocaleTimeString() : 'Just now';

                return (
                  <motion.div
                    key={ev.id || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${config.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            User: {ev.userId || 'guest_user'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-1 truncate">
                          {ev.eventType === 'search' && (
                            <span>Queried: <strong className="text-purple-300 font-mono">"{ev.searchQuery}"</strong> ({ev.context || 'general'})</span>
                          )}
                          {ev.eventType === 'item_view' && (
                            <span>Viewed: <strong className="text-amber-300">"{ev.itemName || ev.itemId}"</strong></span>
                          )}
                          {ev.eventType === 'favorite' && (
                            <span>Added to Wishlist: <strong className="text-rose-300">"{ev.itemName || ev.itemId}"</strong></span>
                          )}
                          {ev.eventType === 'rating' && (
                            <span>Rated: <strong className="text-yellow-300">"{ev.itemName || ev.itemId}"</strong> ({ev.ratingStars} Stars)</span>
                          )}
                          {ev.eventType === 'visit' && (
                            <span>Opened Application Session</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{timeStr}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
