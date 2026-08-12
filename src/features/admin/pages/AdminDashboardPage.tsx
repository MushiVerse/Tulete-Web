import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, limit } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { motion } from 'framer-motion';
import { 
  Users, Search, Eye, Heart, ShoppingCart, ShoppingBag, Star, 
  TrendingUp, Calendar, ArrowUpRight, Clock, RefreshCw, BarChart2, ShieldCheck, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminTheme } from '../context/AdminThemeContext';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type MetricKey = 'visitors' | 'searches' | 'itemViews' | 'favorites' | 'ratings' | 'orders' | 'cartAbandoned';

interface MetricConfig {
  key: MetricKey;
  label: string;
  color: string;
  gradient: string;
  border: string;
  bgChip: string;
}

const METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  visitors: {
    key: 'visitors',
    label: 'Visitors',
    color: 'text-sky-400',
    gradient: 'from-sky-600 to-sky-400',
    border: 'border-sky-500/30',
    bgChip: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  },
  searches: {
    key: 'searches',
    label: 'Searches',
    color: 'text-purple-400',
    gradient: 'from-purple-600 to-purple-400',
    border: 'border-purple-500/30',
    bgChip: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  },
  itemViews: {
    key: 'itemViews',
    label: 'Item Views',
    color: 'text-amber-400',
    gradient: 'from-amber-600 to-amber-400',
    border: 'border-amber-500/30',
    bgChip: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  },
  favorites: {
    key: 'favorites',
    label: 'Favorites',
    color: 'text-rose-400',
    gradient: 'from-rose-600 to-rose-400',
    border: 'border-rose-500/30',
    bgChip: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  },
  ratings: {
    key: 'ratings',
    label: 'Ratings',
    color: 'text-yellow-400',
    gradient: 'from-yellow-600 to-yellow-400',
    border: 'border-yellow-500/30',
    bgChip: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  },
  orders: {
    key: 'orders',
    label: 'Orders',
    color: 'text-emerald-400',
    gradient: 'from-emerald-600 to-emerald-400',
    border: 'border-emerald-500/30',
    bgChip: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  },
  cartAbandoned: {
    key: 'cartAbandoned',
    label: 'Abandoned Carts',
    color: 'text-rose-500',
    gradient: 'from-rose-600 to-rose-400',
    border: 'border-rose-500/30',
    bgChip: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  },
};

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';

  const [overviewData, setOverviewData] = useState<any>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [dailyTimeline, setDailyTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active series toggles for the daily timeline chart
  const [activeMetrics, setActiveMetrics] = useState<Record<MetricKey, boolean>>({
    visitors: true,
    searches: true,
    itemViews: true,
    favorites: true,
    ratings: true,
    orders: true,
    cartAbandoned: true,
  });

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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

    return () => {
      unsubOverview();
      unsubToday();
      unsubDaily();
    };
  }, [todayStr]);

  const totalVisitors = overviewData?.totalVisitors || 0;
  const todayVisitors = todayData?.visitors || 0;
  const totalSearches = overviewData?.totalSearches || 0;
  const todaySearches = todayData?.searches || 0;
  const totalItemViews = overviewData?.totalItemViews || 0;
  const todayItemViews = todayData?.itemViews || 0;
  const totalFavorites = overviewData?.totalFavorites || 0;
  const todayFavorites = todayData?.favorites || 0;
  const totalOrders = overviewData?.totalOrders || 0;
  const todayOrders = todayData?.orders || 0;
  const totalRatings = overviewData?.totalRatings || 0;
  const todayRatings = todayData?.ratings || 0;
  const totalCartAbandoned = overviewData?.totalCartAbandoned || overviewData?.abandonedCartUserIds?.length || 0;
  const todayCartAbandoned = todayData?.cartAbandoned || 0;

  // Calculate max metric value in timeline across active metrics for bar normalization
  const selectedMetricKeys = (Object.keys(activeMetrics) as MetricKey[]).filter(k => activeMetrics[k]);
  const maxValInTimeline = Math.max(
    ...dailyTimeline.flatMap(d => selectedMetricKeys.map(k => Number(d[k]) || 0)),
    10
  );

  const cardBg = isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border shadow-xl relative overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border-slate-800/80' 
          : 'bg-gradient-to-r from-slate-100 via-white to-slate-50 border-slate-200 shadow-md'
      }`}>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Intelligence Overview</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${textPrimary}`}>
            Platform Analytics & Usage CMS
          </h1>
          <p className={`text-xs font-medium mt-1 ${textMuted}`}>
            Live telemetry aggregated across visitor activity, search queries, item views, wishlist favorites, ratings, and orders.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={() => window.location.reload()}
            className={`h-10 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer border ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Visitors */}
        <motion.div whileHover={{ y: -2 }} className={`p-5 rounded-2xl border shadow-md flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between text-sky-400 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
              +{todayVisitors} Today
            </span>
          </div>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>{totalVisitors.toLocaleString()}</p>
            <p className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Total Visitors
            </p>
          </div>
        </motion.div>

        {/* Card 2: Searches */}
        <motion.div whileHover={{ y: -2 }} className={`p-5 rounded-2xl border shadow-md flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between text-purple-400 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
              +{todaySearches} Today
            </span>
          </div>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>{totalSearches.toLocaleString()}</p>
            <p className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Search Queries
            </p>
          </div>
        </motion.div>

        {/* Card 3: Item Views */}
        <motion.div whileHover={{ y: -2 }} className={`p-5 rounded-2xl border shadow-md flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between text-amber-400 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              +{todayItemViews} Today
            </span>
          </div>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>{totalItemViews.toLocaleString()}</p>
            <p className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Item Views
            </p>
          </div>
        </motion.div>

        {/* Card 4: Favorites */}
        <motion.div whileHover={{ y: -2 }} className={`p-5 rounded-2xl border shadow-md flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between text-rose-400 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
              +{todayFavorites} Today
            </span>
          </div>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>{totalFavorites.toLocaleString()}</p>
            <p className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Wishlist Favorites
            </p>
          </div>
        </motion.div>

        {/* Card 5: Orders */}
        <motion.div whileHover={{ y: -2 }} className={`p-5 rounded-2xl border shadow-md flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between text-emerald-400 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              +{todayOrders} Today
            </span>
          </div>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>{totalOrders.toLocaleString()}</p>
            <p className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Orders Tracked
            </p>
          </div>
        </motion.div>

        {/* Card 6: Ratings */}
        <motion.div whileHover={{ y: -2 }} className={`p-5 rounded-2xl border shadow-md flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between text-yellow-400 mb-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              +{todayRatings} Today
            </span>
          </div>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>{totalRatings.toLocaleString()}</p>
            <p className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Ratings Received
            </p>
          </div>
        </motion.div>
      </div>

      {/* Expanded Multi-Series Daily Traffic Timeline Graph */}
      <div className={`p-6 rounded-3xl border shadow-xl space-y-6 ${cardBg}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <BarChart2 className="w-4 h-4" />
              <span>Multi-Metric Daily Breakdown</span>
            </div>
            <h2 className={`text-xl font-extrabold mt-1 ${textPrimary}`}>
              Daily Traffic & Engagement Timeline (Last 14 Days)
            </h2>
            <p className={`text-xs font-medium mt-0.5 ${textMuted}`}>
              Toggle metrics below to compare daily performance across visitors, searches, item views, wishlists, ratings, and orders.
            </p>
          </div>

          {/* Metric Toggle Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((key) => {
              const cfg = METRIC_CONFIGS[key];
              const isSelected = activeMetrics[key];

              return (
                <button
                  key={key}
                  onClick={() => toggleMetric(key)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected 
                      ? `${cfg.bgChip} shadow-xs scale-105` 
                      : isDark
                        ? 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                        : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.gradient.split(' ')[0].replace('from-', 'bg-')}`} />
                  <span>{cfg.label}</span>
                  {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {dailyTimeline.length === 0 ? (
          <div className={`h-48 flex items-center justify-center border border-dashed rounded-2xl text-xs font-semibold ${
            isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}>
            No daily traffic recordings available yet.
          </div>
        ) : (
          <div className={`h-64 flex items-end gap-2 sm:gap-4 pt-10 pb-2 px-2 overflow-x-auto scrollbar-none border-b ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            {dailyTimeline.map((day) => {
              return (
                <div key={day.id} className="flex-1 min-w-[50px] sm:min-w-[70px] flex flex-col items-center gap-2 group relative">
                  {/* Hover Detail Tooltip */}
                  <div className={`absolute -top-24 opacity-0 group-hover:opacity-100 transition-opacity p-2.5 rounded-xl border pointer-events-none z-30 shadow-xl whitespace-nowrap text-[10px] font-bold ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}>
                    <p className="border-b pb-1 mb-1 border-slate-700/50 font-black text-xs text-primary">{day.id}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {activeMetrics.visitors && <p className="text-sky-400">Visitors: {day.visitors || 0}</p>}
                      {activeMetrics.searches && <p className="text-purple-400">Searches: {day.searches || 0}</p>}
                      {activeMetrics.itemViews && <p className="text-amber-400">Views: {day.itemViews || 0}</p>}
                      {activeMetrics.favorites && <p className="text-rose-400">Favorites: {day.favorites || 0}</p>}
                      {activeMetrics.ratings && <p className="text-yellow-400">Ratings: {day.ratings || 0}</p>}
                      {activeMetrics.orders && <p className="text-emerald-400">Orders: {day.orders || 0}</p>}
                      {activeMetrics.cartAbandoned && <p className="text-rose-500">Carts: {day.cartAbandoned || 0}</p>}
                    </div>
                  </div>

                  {/* Multi-Bar Graph Series Column */}
                  <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-[190px]">
                    {selectedMetricKeys.map((k) => {
                      const val = Number(day[k]) || 0;
                      const heightPx = Math.max(6, Math.round((val / maxValInTimeline) * 180));
                      const cfg = METRIC_CONFIGS[k];

                      return (
                        <div
                          key={k}
                          style={{ height: `${heightPx}px` }}
                          title={`${cfg.label}: ${val}`}
                          className={`flex-1 max-w-[12px] bg-gradient-to-t ${cfg.gradient} rounded-t-sm group-hover:brightness-125 transition-all shadow-xs`}
                        />
                      );
                    })}
                  </div>

                  <span className={`text-[10px] font-extrabold group-hover:text-primary transition-colors ${textMuted}`}>
                    {day.id.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Links & Preview Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Search Analytics Quick Access */}
        <div className={`p-6 rounded-3xl border shadow-xl flex flex-col justify-between gap-6 ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                <Search className="w-4 h-4" />
                <span>Search Intelligence</span>
              </div>
              <button
                onClick={() => navigate('/admin/searches')}
                className="text-xs font-extrabold text-purple-500 hover:text-purple-400 flex items-center gap-1 group cursor-pointer"
              >
                <span>View Full Ranking</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            <h3 className={`text-lg font-black ${textPrimary}`}>Top Searched Keywords & Demand</h3>
            <p className={`text-xs font-medium mt-1 ${textMuted}`}>
              Explore customer search queries across all pages to identify high-demand products and missing inventory.
            </p>
          </div>

          <button
            onClick={() => navigate('/admin/searches')}
            className="w-full h-12 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-500 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Open Search Analytics</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Item Analytics Quick Access */}
        <div className={`p-6 rounded-3xl border shadow-xl flex flex-col justify-between gap-6 ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Eye className="w-4 h-4" />
                <span>Item Performance</span>
              </div>
              <button
                onClick={() => navigate('/admin/items')}
                className="text-xs font-extrabold text-amber-500 hover:text-amber-400 flex items-center gap-1 group cursor-pointer"
              >
                <span>View Product Insights</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            <h3 className={`text-lg font-black ${textPrimary}`}>Most Viewed & Conversion Leaderboard</h3>
            <p className={`text-xs font-medium mt-1 ${textMuted}`}>
              Track item view counts, wishlist additions, and purchase conversions to optimize product highlights.
            </p>
          </div>

          <button
            onClick={() => navigate('/admin/items')}
            className="w-full h-12 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Open Item Performance</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Abandoned Cart Analytics Quick Access */}
        <div className={`p-6 rounded-3xl border shadow-xl flex flex-col justify-between gap-6 ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-500 text-xs font-bold uppercase tracking-wider">
                <ShoppingBag className="w-4 h-4" />
                <span>Abandoned Carts</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  +{todayCartAbandoned} Today
                </span>
              </div>
              <button
                onClick={() => navigate('/admin/abandoned-carts')}
                className="text-xs font-extrabold text-rose-500 hover:text-rose-400 flex items-center gap-1 group cursor-pointer"
              >
                <span>View Uncheckout Carts</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            <h3 className={`text-lg font-black ${textPrimary}`}>Revenue Recovery & Uncheckout Carts</h3>
            <p className={`text-xs font-medium mt-1 ${textMuted}`}>
              Analyze carts left uncompleted by users to calculate potential recoverable revenue and send checkout reminders.
            </p>
          </div>

          <button
            onClick={() => navigate('/admin/abandoned-carts')}
            className="w-full h-12 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Open Abandoned Carts</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
