import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { motion } from 'framer-motion';
import { 
  Users, Search, Eye, Heart, ShoppingCart, Star, 
  TrendingUp, Calendar, ArrowUpRight, Clock, RefreshCw, BarChart2, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [overviewData, setOverviewData] = useState<any>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [dailyTimeline, setDailyTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = getTodayDateString();

  useEffect(() => {
    setLoading(true);

    // 1. Subscribe to analytics/overview doc
    const unsubOverview = onSnapshot(doc(db, 'analytics', 'overview'), (snap) => {
      if (snap.exists()) {
        setOverviewData(snap.data());
      }
      setLoading(false);
    }, (err) => {
      console.warn('Overview snap error:', err);
      setLoading(false);
    });

    // 2. Subscribe to today's daily doc analytics_daily/YYYY-MM-DD
    const unsubToday = onSnapshot(doc(db, 'analytics_daily', todayStr), (snap) => {
      if (snap.exists()) {
        setTodayData(snap.data());
      }
    }, (err) => console.warn('Today snap error:', err));

    // 3. Subscribe to recent daily timeline docs for chart (last 14 days)
    const dailyRef = collection(db, 'analytics_daily');
    const unsubDaily = onSnapshot(dailyRef, (snap) => {
      const list: any[] = [];
      snap.docs.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      list.sort((a, b) => (a.date || a.id).localeCompare(b.date || b.id));
      setDailyTimeline(list.slice(-14));
    }, (err) => console.warn('Daily timeline snap error:', err));

    // 4. Subscribe to latest analytics_events
    const eventsRef = collection(db, 'analytics_events');
    const eventsQuery = query(eventsRef, limit(10));
    const unsubEvents = onSnapshot(eventsQuery, (snap) => {
      const list: any[] = [];
      snap.docs.forEach(d => list.push({ id: d.id, ...d.data() }));
      setRecentEvents(list);
    }, (err) => console.warn('Events snap error:', err));

    return () => {
      unsubOverview();
      unsubToday();
      unsubDaily();
      unsubEvents();
    };
  }, [todayStr]);

  const totalVisitors = overviewData?.totalVisitors || 0;
  const todayVisitors = todayData?.visitors || 0;
  const totalSearches = overviewData?.totalSearches || 0;
  const todaySearches = todayData?.searches || 0;
  const totalItemViews = overviewData?.totalItemViews || 0;
  const todayItemViews = todayData?.itemViews || 0;
  const totalFavorites = overviewData?.totalFavorites || 0;
  const totalOrders = overviewData?.totalOrders || 0;
  const totalRatings = overviewData?.totalRatings || 0;

  // Max value for bar chart normalization
  const maxVisitorsInTimeline = Math.max(...dailyTimeline.map(d => d.visitors || 0), 10);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 rounded-3xl border border-slate-800/80 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Intelligence Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Platform Analytics & Usage CMS
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Live telemetry aggregated across visitor activity, search queries, item views, and conversions.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={() => window.location.reload()}
            className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Visitors */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-sky-400 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              +{todayVisitors} Today
            </span>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{totalVisitors.toLocaleString()}</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Total Visitors
            </p>
          </div>
        </motion.div>

        {/* Card 2: Searches */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-purple-400 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              +{todaySearches} Today
            </span>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{totalSearches.toLocaleString()}</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Search Queries
            </p>
          </div>
        </motion.div>

        {/* Card 3: Item Views */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-amber-400 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              +{todayItemViews} Today
            </span>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{totalItemViews.toLocaleString()}</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Item Views
            </p>
          </div>
        </motion.div>

        {/* Card 4: Favorites */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-rose-400 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{totalFavorites.toLocaleString()}</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Wishlist Favorites
            </p>
          </div>
        </motion.div>

        {/* Card 5: Orders */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-emerald-400 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{totalOrders.toLocaleString()}</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Orders Tracked
            </p>
          </div>
        </motion.div>

        {/* Card 6: Ratings */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-yellow-400 mb-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{totalRatings.toLocaleString()}</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Ratings Received
            </p>
          </div>
        </motion.div>
      </div>

      {/* Daily Visitor Trend Chart Section */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
              <BarChart2 className="w-4 h-4" />
              <span>Daily Traffic Timeline</span>
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1">Visitor Activity (Last 14 Days)</h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-sky-500" />
              <span>Daily Visitors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-purple-500" />
              <span>Search Queries</span>
            </div>
          </div>
        </div>

        {dailyTimeline.length === 0 ? (
          <div className="h-48 flex items-center justify-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs font-semibold">
            No daily traffic recordings available yet.
          </div>
        ) : (
          <div className="h-56 flex items-end gap-2 sm:gap-4 pt-8 pb-2 px-2 overflow-x-auto scrollbar-none border-b border-slate-800">
            {dailyTimeline.map((day) => {
              const visitorHeight = Math.max(12, Math.round(((day.visitors || 0) / maxVisitorsInTimeline) * 160));
              const searchHeight = Math.max(8, Math.round(((day.searches || 0) / maxVisitorsInTimeline) * 160));

              return (
                <div key={day.id} className="flex-1 min-w-[36px] flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-700 pointer-events-none z-20 shadow-lg whitespace-nowrap">
                    {day.id}: {day.visitors || 0} visitors, {day.searches || 0} searches
                  </div>

                  <div className="w-full flex items-end justify-center gap-1 h-[170px]">
                    <div 
                      style={{ height: `${visitorHeight}px` }} 
                      className="w-1/2 max-w-[16px] bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-md group-hover:brightness-125 transition-all shadow-sm shadow-sky-500/20" 
                    />
                    <div 
                      style={{ height: `${searchHeight}px` }} 
                      className="w-1/2 max-w-[16px] bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-md group-hover:brightness-125 transition-all shadow-sm shadow-purple-500/20" 
                    />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-slate-200 transition-colors">
                    {day.id.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Links & Preview Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Analytics Quick Access */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                <Search className="w-4 h-4" />
                <span>Search Intelligence</span>
              </div>
              <button
                onClick={() => navigate('/admin/searches')}
                className="text-xs font-extrabold text-purple-400 hover:text-purple-300 flex items-center gap-1 group cursor-pointer"
              >
                <span>View Full Ranking</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            <h3 className="text-lg font-black text-white">Top Searched Keywords & Demand</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Explore customer search queries across all pages to identify high-demand products and missing inventory.
            </p>
          </div>

          <button
            onClick={() => navigate('/admin/searches')}
            className="w-full h-12 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Open Search Analytics Portal</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Item Analytics Quick Access */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Eye className="w-4 h-4" />
                <span>Item Performance</span>
              </div>
              <button
                onClick={() => navigate('/admin/items')}
                className="text-xs font-extrabold text-amber-400 hover:text-amber-300 flex items-center gap-1 group cursor-pointer"
              >
                <span>View Product Insights</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            <h3 className="text-lg font-black text-white">Most Viewed & Conversion Leaderboard</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Track item view counts, wishlist additions, and purchase conversions to optimize product highlights.
            </p>
          </div>

          <button
            onClick={() => navigate('/admin/items')}
            className="w-full h-12 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Open Item Performance Portal</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
