import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import {
  Activity, Users, Search, Eye, Heart, ShoppingCart, Star, Clock, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminTheme } from '../context/AdminThemeContext';
import { AdminPagination } from '../components/AdminPagination';

export const AdminLiveActivityPage: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const fetchUserNames = async () => {
      try {
        const map: Record<string, string> = {};
        const [analyticsUsersSnap, usersAndRolesSnap] = await Promise.all([
          getDocs(collection(db, 'analytics_users')).catch(() => null),
          getDocs(collection(db, 'UsersandRoles')).catch(() => null),
        ]);

        if (analyticsUsersSnap) {
          analyticsUsersSnap.docs.forEach((d) => {
            const data = d.data();
            const name = data.userName || data.name || data.displayName || data.userEmail || data.email;
            if (name) map[d.id] = name;
            if (data.userId && name) map[data.userId] = name;
          });
        }

        if (usersAndRolesSnap) {
          usersAndRolesSnap.docs.forEach((d) => {
            const data = d.data();
            const name = data.displayName || data.name || data.uname || data.email;
            const uid = data.uid || d.id;
            if (name && uid) map[uid] = name;
          });
        }

        setUserNamesMap(map);
      } catch (e) {
        // Fallback silently
      }
    };

    fetchUserNames();
  }, []);

  useEffect(() => {
    setLoading(true);
    const eventsRef = collection(db, 'analytics_events');

    const sortEvents = (snapDocs: any[]) => {
      const list: any[] = [];
      snapDocs.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });

      list.sort((a, b) => {
        const getTs = (item: any) => {
          if (item.timestamp?.toDate) return item.timestamp.toDate().getTime();
          if (typeof item.timestamp?.seconds === 'number') return item.timestamp.seconds * 1000;
          if (item.createdAtIso) {
            const t = new Date(item.createdAtIso).getTime();
            if (!isNaN(t)) return t;
          }
          if (item.timestamp) {
            const t = new Date(item.timestamp).getTime();
            if (!isNaN(t)) return t;
          }
          const parts = String(item.id).split('_');
          if (parts.length > 0 && !isNaN(Number(parts[0]))) {
            return Number(parts[0]);
          }
          return 0;
        };
        return getTs(b) - getTs(a);
      });

      return list;
    };

    // Attempt ordered query first
    const primaryQ = query(eventsRef, limit(200));

    const unsubscribe = onSnapshot(
      primaryQ,
      (snap) => {
        setEvents(sortEvents(snap.docs));
        setLoading(false);
      },
      (err) => {
        console.warn('Events snap error, retrying fallback snapshot:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredEvents = events.filter((ev) => {
    if (eventTypeFilter === 'all') return true;
    return ev.eventType === eventTypeFilter;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [eventTypeFilter]);

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'visit':
        return { icon: Users, label: 'Web Visit', color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' };
      case 'search':
        return { icon: Search, label: 'Search Query', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
      case 'item_view':
        return { icon: Eye, label: 'Item View', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
      case 'favorite':
        return { icon: Heart, label: 'Wishlist Fav', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
      case 'order':
        return { icon: ShoppingCart, label: 'Order Placed', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
      case 'order_cancelled':
        return { icon: XCircle, label: 'Order Cancelled', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
      case 'rating':
        return { icon: Star, label: 'Rating Given', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
      default:
        return { icon: Activity, label: type, color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const cardBg = isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border shadow-xl ${cardBg}`}>
        <div>
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Real-Time Customer Stream</span>
          </div>
          <h1 className={`text-2xl font-black ${textPrimary}`}>Live Activity Stream</h1>
          <p className={`text-xs font-medium mt-1 ${textMuted}`}>
            Watch customer interactions in real-time as they visit the app, execute search queries, view items, and place orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className={`h-11 px-4 rounded-xl text-xs font-extrabold focus:outline-none focus:border-primary ${inputBg}`}
          >
            <option value="all">All Event Types</option>
            <option value="visit">Visits</option>
            <option value="search">Searches</option>
            <option value="item_view">Item Views</option>
            <option value="favorite">Favorites</option>
            <option value="order">Orders Placed</option>
            <option value="order_cancelled">Cancelled Orders</option>
            <option value="rating">Ratings</option>
          </select>
        </div>
      </div>

      {/* Stream List */}
      <div className={`border rounded-3xl shadow-xl p-6 ${cardBg}`}>
        <div className={`flex items-center justify-between mb-6 pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <h2 className={`text-lg font-black ${textPrimary}`}>Latest Customer Events Log</h2>
          <span className={`text-xs font-bold ${textMuted}`}>
            Showing {filteredEvents.length} events
          </span>
        </div>

        {loading ? (
          <div className={`p-12 text-center text-xs font-semibold ${textMuted}`}>
            Connecting to live event stream in Firestore...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className={`p-12 text-center text-xs font-semibold ${textMuted}`}>
            No recent activity events matching current filter.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {paginatedEvents.map((ev, idx) => {
                const config = getEventBadge(ev.eventType);
                const Icon = config.icon;

                let dateObj: Date | null = null;
                if (ev.timestamp?.toDate) {
                  dateObj = ev.timestamp.toDate();
                } else if (typeof ev.timestamp?.seconds === 'number') {
                  dateObj = new Date(ev.timestamp.seconds * 1000);
                } else if (ev.timestamp) {
                  const d = new Date(ev.timestamp);
                  if (!isNaN(d.getTime())) dateObj = d;
                }

                let datePart = '';
                let yearPart = '';
                let timeOnly = '';

                if (dateObj) {
                  datePart = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  yearPart = dateObj.getFullYear().toString();
                  timeOnly = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                }

                const timeStr = dateObj
                  ? `${datePart}, ${yearPart}, ${timeOnly}`
                  : 'Just now';

                const uId = ev.userId || ev.uid || 'guest_user';
                const userEmail = ev.userEmail || ev.email;
                const rawName = ev.userName || ev.name || ev.displayName || userEmail || userNamesMap[uId];
                const displayName = rawName && rawName !== uId ? rawName : (uId === 'guest_user' ? 'Guest' : uId);

                return (
                  <motion.div
                    key={ev.id || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: idx * 0.015 }}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-colors ${isDark ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${config.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${config.color}`}>
                            {config.label}
                          </span>
                          <span className={`text-xs font-bold truncate ${textPrimary}`}>
                            User: {displayName} {userEmail && userEmail !== displayName ? `(${userEmail})` : ''} (<span className="font-mono opacity-80">{uId}</span>)
                          </span>
                        </div>
                        <p className={`text-xs font-medium mt-1 truncate ${textMuted}`}>
                          {ev.eventType === 'search' && (
                            <span>Queried: <strong className="text-purple-500 font-mono">"{ev.searchQuery}"</strong> ({ev.context || 'general'})</span>
                          )}
                          {ev.eventType === 'item_view' && (
                            <span>Viewed: <strong className="text-amber-500">"{ev.itemName || ev.itemId}"</strong></span>
                          )}
                          {ev.eventType === 'favorite' && (
                            <span>Added to Wishlist: <strong className="text-rose-500">"{ev.itemName || ev.itemId}"</strong></span>
                          )}
                          {ev.eventType === 'rating' && (
                            <span>Rated: <strong className="text-yellow-500">"{ev.itemName || ev.itemId}"</strong> ({ev.ratingStars} Stars)</span>
                          )}
                          {ev.eventType === 'visit' && (
                            <span>Opened Web Application Session</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-1.5 text-[11px] font-semibold shrink-0 ${textMuted}`}>
                      <Clock className="w-3.5 h-3.5 shrink-0 hidden sm:block" />
                      {dateObj ? (
                        <>
                          {/* Desktop View (Single row) */}
                          <span className="hidden sm:inline">
                            {timeStr}
                          </span>

                          {/* Mobile View (Shrunk into 2-3 rows to save space) */}
                          <div className="flex flex-col items-end text-right text-[10px] leading-snug font-bold sm:hidden">
                            <span>{datePart}</span>
                            <span className="text-[9px] opacity-75">{yearPart}</span>
                            <span className="text-emerald-500 font-extrabold text-[10px]">{timeOnly}</span>
                          </div>
                        </>
                      ) : (
                        <span>Just now</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredEvents.length}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => setPageSize(size)}
        />
      </div>
    </div>
  );
};
