import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { ShoppingBag, Download, Search, DollarSign, Users, CheckCircle, Clock, Mail, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAdminTheme } from '../context/AdminThemeContext';
import { AdminPagination } from '../components/AdminPagination';
import { APP_SETTINGS } from '@/core/config/settings';
import { formatPrice } from '../../../shared/utils/formatPrice';

export const AdminAbandonedCartsPage: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';

  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setLoading(true);
    const cartRef = collection(db, 'analytics_cart_abandoned');
    const q = query(cartRef, limit(200));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.docs.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });

      // Sort descending by lastCartUpdate or totalCartValue
      list.sort((a, b) => {
        const timeA = a.lastCartUpdate?.toDate ? a.lastCartUpdate.toDate().getTime() : 0;
        const timeB = b.lastCartUpdate?.toDate ? b.lastCartUpdate.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setCarts(list);
      setLoading(false);
    }, (err) => {
      console.warn('Abandoned carts snap error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const activeCarts = carts.filter((c) => c.status === 'active' || (!c.status && c.cartItemCount > 0));
  const convertedCarts = carts.filter((c) => c.status === 'converted');
  const totalAbandonedRevenue = activeCarts.reduce((sum, c) => sum + (c.totalCartValue || 0), 0);

  const filteredCarts = carts.filter((c) => {
    if (statusFilter !== 'all') {
      const st = c.status || (c.cartItemCount > 0 ? 'active' : 'cleared');
      if (st !== statusFilter) return false;
    }
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase().trim();
    const userStr = `${c.userName || ''} ${c.userEmail || ''} ${c.userId || ''}`.toLowerCase();
    const itemStr = (c.items || []).map((i: any) => i.name || '').join(' ').toLowerCase();
    return userStr.includes(q) || itemStr.includes(q);
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery, statusFilter]);

  const totalPages = Math.ceil(filteredCarts.length / pageSize) || 1;
  const paginatedCarts = filteredCarts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportCSV = () => {
    if (carts.length === 0) return;
    const headers = ['User ID', 'Customer Name', 'Email', 'Status', 'Item Count', 'Cart Value (TZS)', 'Items', 'Last Cart Update'];
    const rows = carts.map((c) => {
      const itemNames = (c.items || []).map((i: any) => `${i.name} (x${i.quantity || 1})`).join('; ');
      return [
        `"${c.userId || c.id}"`,
        `"${c.userName || 'Guest'}"`,
        `"${c.userEmail || 'N/A'}"`,
        `"${c.status || 'active'}"`,
        c.cartItemCount || 0,
        c.totalCartValue || 0,
        `"${itemNames}"`,
        `"${c.lastCartUpdate?.toDate?.() ? c.lastCartUpdate.toDate().toISOString() : ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tulete_Abandoned_Carts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cardBg = isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border shadow-xl ${cardBg}`}>
        <div>
          <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span>Revenue Recovery Telemetry</span>
          </div>
          <h1 className={`text-2xl font-black ${textPrimary}`}>Abandoned Cart Analytics</h1>
          <p className={`text-xs font-medium mt-1 ${textMuted}`}>
            Monitor un-checkout carts, calculate potential recoverable revenue, and analyze items left behind by customers.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={carts.length === 0}
          className="h-11 px-5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/20 shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Abandoned Carts CSV</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border shadow-md flex items-center justify-between ${cardBg}`}>
          <div>
            <p className={`text-2xl font-black text-rose-500`}>{activeCarts.length.toLocaleString()}</p>
            <p className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Active Abandoned Carts
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-md flex items-center justify-between ${cardBg}`}>
          <div>
            <p className={`text-2xl font-black text-emerald-500`}>
              {APP_SETTINGS.currency} {formatPrice(totalAbandonedRevenue)}
            </p>
            <p className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Potential Recoverable Revenue
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-md flex items-center justify-between ${cardBg}`}>
          <div>
            <p className={`text-2xl font-black ${textPrimary}`}>{convertedCarts.length.toLocaleString()}</p>
            <p className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${textMuted}`}>
              Converted Checkout Carts
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
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
            placeholder="Search customer email, user ID, or item name..."
            className={`w-full h-11 pl-11 pr-4 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500 transition-all ${inputBg}`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`h-11 px-4 rounded-xl text-xs font-extrabold focus:outline-none focus:border-rose-500 ${inputBg}`}
        >
          <option value="active">Active Abandoned</option>
          <option value="converted">Converted Orders</option>
          <option value="cleared">Cleared Carts</option>
          <option value="all">All Carts</option>
        </select>
      </div>

      {/* Abandoned Carts Table */}
      <div className={`border rounded-3xl shadow-xl overflow-hidden ${cardBg}`}>
        <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <h2 className={`text-lg font-black ${textPrimary}`}>Abandoned Customer Carts Log</h2>
          <span className={`text-xs font-bold ${textMuted}`}>
            Showing {filteredCarts.length} records
          </span>
        </div>

        {loading ? (
          <div className={`p-12 text-center text-xs font-semibold ${textMuted}`}>
            Loading abandoned cart records from analytics_cart_abandoned...
          </div>
        ) : filteredCarts.length === 0 ? (
          <div className={`p-12 text-center text-xs font-semibold ${textMuted}`}>
            No cart records found matching current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                  isDark ? 'border-slate-800 bg-slate-950/50 text-slate-400' : 'border-slate-200 bg-slate-100/70 text-slate-600'
                }`}>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Cart Items Summary</th>
                  <th className="py-3.5 px-6 text-right">Total Value</th>
                  <th className="py-3.5 px-6 text-center">Last Updated</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-medium ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {paginatedCarts.map((cart, idx) => {
                  const itemsList = cart.items || [];
                  let dateObj: Date | null = null;
                  if (cart.lastCartUpdate?.toDate) {
                    dateObj = cart.lastCartUpdate.toDate();
                  } else if (typeof cart.lastCartUpdate?.seconds === 'number') {
                    dateObj = new Date(cart.lastCartUpdate.seconds * 1000);
                  } else if (cart.lastCartUpdate) {
                    const d = new Date(cart.lastCartUpdate);
                    if (!isNaN(d.getTime())) dateObj = d;
                  }

                  const timeStr = dateObj
                    ? dateObj.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : 'Recent';
                  const isConverted = cart.status === 'converted';

                  return (
                    <motion.tr
                      key={cart.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.015 }}
                      className={isDark ? 'hover:bg-slate-800/40 transition-colors' : 'hover:bg-slate-50 transition-colors'}
                    >
                      <td className="py-4 px-6">
                        <div>
                          <p className={`font-bold ${textPrimary}`}>{cart.userName || cart.userId || 'Guest User'}</p>
                          <p className={`text-[10px] font-mono ${textMuted}`}>{cart.userEmail || cart.userId}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                          isConverted
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : cart.status === 'cleared'
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}>
                          {isConverted ? 'Converted' : cart.status === 'cleared' ? 'Cleared' : 'Active Abandoned'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1 max-w-xs">
                          {itemsList.slice(0, 3).map((item: any, i: number) => (
                            <div key={i} className={`text-xs truncate flex items-center justify-between gap-2 ${textMuted}`}>
                              <span className={`truncate font-semibold ${textPrimary}`}>{item.name}</span>
                              <span className="shrink-0 font-bold">x{item.quantity || 1}</span>
                            </div>
                          ))}
                          {itemsList.length > 3 && (
                            <p className="text-[10px] text-purple-400 font-extrabold">+ {itemsList.length - 3} more items</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-emerald-500">
                        {APP_SETTINGS.currency} {formatPrice(cart.totalCartValue || 0)}
                      </td>
                      <td className={`py-4 px-6 text-center text-[11px] ${textMuted}`}>
                        {timeStr}
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
          totalItems={filteredCarts.length}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => setPageSize(size)}
        />
      </div>
    </div>
  );
};
