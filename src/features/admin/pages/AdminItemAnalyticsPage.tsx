import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { Eye, Download, Search, Heart, ShoppingCart, Star, TrendingUp, Layers, Package } from 'lucide-react';
import { motion } from 'framer-motion';

export const AdminItemAnalyticsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const itemsRef = collection(db, 'analytics_items');
    const q = query(itemsRef, limit(250));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.docs.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });

      // Sort descending by viewCount
      list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      setItems(list);
      setLoading(false);
    }, (err) => {
      console.warn('Analytics items snap error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredItems = items.filter((item) => {
    if (categoryFilter !== 'all') {
      const cat = String(item.category || item.cat || '').toLowerCase();
      if (!cat.includes(categoryFilter.toLowerCase())) return false;
    }
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase().trim();
    const nameStr = String(item.name || item.id || '').toLowerCase();
    return nameStr.includes(q);
  });

  const totalViewsRecorded = items.reduce((acc, curr) => acc + (curr.viewCount || 0), 0);
  const totalFavoritesRecorded = items.reduce((acc, curr) => acc + (curr.favoriteCount || 0), 0);
  const totalOrdersRecorded = items.reduce((acc, curr) => acc + (curr.orderCount || 0), 0);

  const exportCSV = () => {
    if (items.length === 0) return;
    const headers = ['Item ID', 'Item Name', 'Category', 'Views', 'Favorites', 'Orders', 'Conversion Rate %'];
    const rows = items.map((i) => {
      const views = i.viewCount || 0;
      const orders = i.orderCount || 0;
      const conversionRate = views > 0 ? ((orders / views) * 100).toFixed(1) : '0';
      return [
        `"${i.itemId || i.id}"`,
        `"${i.name || 'Unnamed Item'}"`,
        `"${i.category || 'General'}"`,
        views,
        i.favoriteCount || 0,
        orders,
        `"${conversionRate}%"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tulete_Item_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Eye className="w-4 h-4" />
            <span>Product Conversion Telemetry</span>
          </div>
          <h1 className="text-2xl font-black text-white">Item Performance & Engagement</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Track views, wishlist favorites, and order conversion metrics for each item in store.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={items.length === 0}
          className="h-11 px-5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-600/20 shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Item CSV Report</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-2xl font-black text-white">{totalViewsRecorded.toLocaleString()}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Total Item Impressions
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-2xl font-black text-white">{totalFavoritesRecorded.toLocaleString()}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Total Favorites Added
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-2xl font-black text-white">{totalOrdersRecorded.toLocaleString()}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Total Orders Converted
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter item name..."
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-extrabold text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Categories</option>
          <option value="food">Food</option>
          <option value="product">Shopping Products</option>
          <option value="laundry">Laundry</option>
        </select>
      </div>

      {/* Item Performance Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Most Viewed Items Leaderboard</h2>
          <span className="text-xs font-bold text-slate-400">
            Showing {filteredItems.length} items
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            Loading item analytics performance data from Firestore...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            No item analytics matching current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Item</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6 text-center">Views</th>
                  <th className="py-3.5 px-6 text-center">Wishlists</th>
                  <th className="py-3.5 px-6 text-center">Orders</th>
                  <th className="py-3.5 px-6 text-center">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                {filteredItems.map((item, idx) => {
                  const views = item.viewCount || 0;
                  const orders = item.orderCount || 0;
                  const favs = item.favoriteCount || 0;
                  const conversionRate = views > 0 ? ((orders / views) * 100).toFixed(1) : '0';

                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 text-slate-300 font-bold">
                            <Package className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="font-bold text-white leading-tight">
                              {item.name || item.itemId || 'Unnamed Item'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              ID: {item.itemId || item.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-semibold">
                        <span className="px-2.5 py-1 rounded-md bg-slate-800/60 text-slate-300 text-[11px]">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-black text-amber-400">
                        {views.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-center font-black text-rose-400">
                        {favs.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-center font-black text-emerald-400">
                        {orders.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-slate-200">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          Number(conversionRate) > 10
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {conversionRate}%
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
