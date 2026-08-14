import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { Eye, Download, Search, Heart, ShoppingCart, Star, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAdminTheme } from '../context/AdminThemeContext';
import { AdminPagination } from '../components/AdminPagination';

export const AdminItemAnalyticsPage: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setLoading(true);
    const itemsRef = collection(db, 'analytics_items');
    const q = query(itemsRef, limit(250));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.docs.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });

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

  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery, categoryFilter]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const cardBg = isDark ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border shadow-xl ${cardBg}`}>
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider mb-1">
            <Eye className="w-4 h-4" />
            <span>Product Conversion Telemetry</span>
          </div>
          <h1 className={`text-2xl font-black ${textPrimary}`}>Item Performance & Engagement</h1>
          <p className={`text-xs font-medium mt-1 ${textMuted}`}>
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
        <div className={`p-5 rounded-2xl border shadow-md flex items-center justify-between ${cardBg}`}>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>{totalViewsRecorded.toLocaleString()}</p>
            <p className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Total Item Impressions
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-md flex items-center justify-between ${cardBg}`}>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>{totalFavoritesRecorded.toLocaleString()}</p>
            <p className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Total Favorites Added
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-md flex items-center justify-between ${cardBg}`}>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>{totalOrdersRecorded.toLocaleString()}</p>
            <p className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Total Orders Placed
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter item name..."
            className={`w-full h-11 pl-11 pr-4 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 transition-all ${inputBg}`}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={`h-11 px-4 rounded-xl text-xs font-extrabold focus:outline-none focus:border-amber-500 ${inputBg}`}
        >
          <option value="all">All Categories</option>
          <option value="food">Food</option>
          <option value="product">Shopping Products</option>
          <option value="laundry">Laundry</option>
        </select>
      </div>

      {/* Item Performance Table */}
      <div className={`border rounded-3xl shadow-xl overflow-hidden ${cardBg}`}>
        <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <h2 className={`text-lg font-black ${textPrimary}`}>Most Viewed Items Leaderboard</h2>
          <span className={`text-xs font-bold ${textMuted}`}>
            Showing {filteredItems.length} items
          </span>
        </div>

        {loading ? (
          <div className={`p-12 text-center text-xs font-semibold ${textMuted}`}>
            Loading item analytics performance data from Firestore...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={`p-12 text-center text-xs font-semibold ${textMuted}`}>
            No item analytics matching current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                  isDark ? 'border-slate-800 bg-slate-950/50 text-slate-400' : 'border-slate-200 bg-slate-100/70 text-slate-600'
                }`}>
                  <th className="py-3.5 px-6">Item</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6 text-center">Views</th>
                  <th className="py-3.5 px-6 text-center">Wishlists</th>
                  <th className="py-3.5 px-6 text-center">Orders</th>
                  <th className="py-3.5 px-6 text-center">Conversion</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-medium ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {paginatedItems.map((item, idx) => {
                  const views = item.viewCount || 0;
                  const orders = item.orderCount || 0;
                  const favs = item.favoriteCount || 0;
                  const conversionRate = views > 0 ? ((orders / views) * 100).toFixed(1) : '0';

                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.015 }}
                      className={isDark ? 'hover:bg-slate-800/40 transition-colors' : 'hover:bg-slate-50 transition-colors'}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border font-bold ${
                            isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}>
                            <Package className="w-4 h-4 text-amber-500" />
                          </div>
                          <div>
                            <p className={`font-bold leading-tight ${textPrimary}`}>
                              {item.name || item.itemId || 'Unnamed Item'}
                            </p>
                            <p className={`text-[10px] font-mono mt-0.5 ${textMuted}`}>
                              ID: {item.itemId || item.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`py-4 px-6 font-semibold ${textMuted}`}>
                        <span className={`px-2.5 py-1 rounded-md text-[11px] ${
                          isDark ? 'bg-slate-800/60 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-black text-amber-500">
                        {views.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-center font-black text-rose-500">
                        {favs.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-center font-black text-emerald-500">
                        {orders.toLocaleString()}
                      </td>
                      <td className={`py-4 px-6 text-center font-bold ${textPrimary}`}>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          Number(conversionRate) > 10
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
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

        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredItems.length}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => setPageSize(size)}
        />
      </div>
    </div>
  );
};
