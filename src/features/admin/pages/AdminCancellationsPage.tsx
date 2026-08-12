import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { 
  XCircle, Search, Download, Users, Store, DollarSign, Clock, Mail, 
  Phone, ArrowUpRight, AlertCircle, ShoppingBag, Eye, X, Package, ShieldAlert, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminTheme } from '../context/AdminThemeContext';
import { APP_SETTINGS } from '@/core/config/settings';
import { formatPrice } from '../../../shared/utils/formatPrice';

export const AdminCancellationsPage: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';

  const [cancellations, setCancellations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [whoFilter, setWhoFilter] = useState('all');

  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const openFromPicker = () => {
    const input = fromInputRef.current;
    if (!input) return;
    try {
      if (typeof (input as any).showPicker === 'function') {
        (input as any).showPicker();
      } else {
        input.focus();
      }
    } catch {
      input.focus();
    }
  };

  const openToPicker = () => {
    const input = toInputRef.current;
    if (!input) return;
    try {
      if (typeof (input as any).showPicker === 'function') {
        (input as any).showPicker();
      } else {
        input.focus();
      }
    } catch {
      input.focus();
    }
  };

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getNDaysAgoString = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState<string>('2026-08-12');
  const [endDate, setEndDate] = useState<string>(getTodayDateString());
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);

    // 1. Listen to analytics_cancellations collection
    const cancelRef = collection(db, 'analytics_cancellations');
    const qCancel = query(cancelRef, limit(200));

    const unsubscribeCancel = onSnapshot(qCancel, async (snap) => {
      const list: any[] = [];
      snap.docs.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });

      // 2. Also fetch cancelled orders from newcomfirmedorders & orders for fallback coverage
      try {
        const [ncSnap, ordersSnap] = await Promise.all([
          getDocs(collection(db, 'newcomfirmedorders')).catch(() => null),
          getDocs(collection(db, 'orders')).catch(() => null),
        ]);

        const existingIds = new Set(list.map((c) => c.orderId || c.id));

        const addFallback = (docSnap: any, collectionName: string) => {
          if (!docSnap) return;
          docSnap.docs.forEach((d: any) => {
            const data = d.data();
            const isCancelled = data.status === 'Cancelled' || data.cancel === true || data.cancel === 'true';
            if (isCancelled && !existingIds.has(d.id) && !existingIds.has(data.webOrderId)) {
              existingIds.add(d.id);
              const items = data.items || data.cartItems || [];
              const stores = Array.from(new Set(items.map((i: any) => i.storeName || i.store || data.storeName || data.store || '').filter(Boolean)));

              list.push({
                id: d.id,
                orderId: d.id,
                userId: data.userId || data.uid || 'guest_user',
                userName: data.userName || data.name || data.customerName || 'Customer',
                userEmail: data.userEmail || data.email || '',
                userPhone: data.userPhone || data.phone || data.phoneNumber || '',
                cancelledBy: data.cancelledBy || 'customer',
                reason: data.reason || data.cancelReason || 'Order cancelled',
                totalAmount: Number(data.total || data.price || data.totalAmount || 0),
                itemCount: items.length,
                items: items.map((i: any) => ({
                  productId: i.productId || i.id || '',
                  name: i.name || i.title || 'Item',
                  price: Number(i.price) || 0,
                  quantity: Number(i.quantity) || 1,
                  storeId: i.storeId || data.storeId || '',
                  storeName: i.storeName || i.store || data.storeName || data.store || 'Store',
                })),
                storeNames: stores,
                createdAt: data.createdAt || data.timestamp || data.time || data.date || data.orderDate || data.updatedAt || null,
                collectionSource: collectionName,
              });
            }
          });
        };

        addFallback(ncSnap, 'newcomfirmedorders');
        addFallback(ordersSnap, 'orders');
      } catch (err) {
        console.warn('Fallback cancelled orders fetch error:', err);
      }

      // Sort descending by timestamp / createdAt
      list.sort((a, b) => {
        const timeA = getRecordTimestamp(a);
        const timeB = getRecordTimestamp(b);
        return timeB - timeA;
      });

      setCancellations(list);
      setLoading(false);
    }, (err) => {
      console.warn('Cancellations snap error:', err);
      setLoading(false);
    });

    return () => unsubscribeCancel();
  }, []);

  const getRecordTimestamp = (record: any): number => {
    if (!record) return 0;
    const val = record.createdAt ?? record.timestamp ?? record.time ?? record.date ?? record.updatedAt ?? record.orderDate ?? record.created_at ?? record.dateCreated;
    
    if (val !== null && val !== undefined) {
      if (typeof val === 'object') {
        if (typeof val.toDate === 'function') {
          try { return val.toDate().getTime(); } catch {}
        }
        if (typeof val.toMillis === 'function') {
          try { return val.toMillis(); } catch {}
        }
        if (typeof val.seconds === 'number') {
          return val.seconds * 1000;
        }
        if (typeof val._seconds === 'number') {
          return val._seconds * 1000;
        }
        if (val instanceof Date) {
          return val.getTime();
        }
      }
      
      if (typeof val === 'number') {
        return val < 10000000000 ? val * 1000 : val;
      }
      
      if (typeof val === 'string') {
        const trimmed = val.trim();
        const p = new Date(trimmed).getTime();
        if (!isNaN(p) && p > 0) return p;
        
        const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
        if (ddmmyyyyMatch) {
          const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = ddmmyyyyMatch;
          const parsedDate = new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hours),
            Number(minutes),
            Number(seconds)
          );
          if (!isNaN(parsedDate.getTime())) return parsedDate.getTime();
        }

        const pf = new Date(trimmed.replace(' ', 'T')).getTime();
        if (!isNaN(pf) && pf > 0) return pf;
      }
    }

    if (typeof record.id === 'string') {
      const numId = Number(record.id);
      if (!isNaN(numId) && numId > 1600000000000) return numId;
    }

    return 0;
  };

  const filteredCancellations = cancellations.filter((c) => {
    // 1. Date Range Filter (From startDate To endDate)
    if (startDate || endDate) {
      const itemTime = getRecordTimestamp(c);
      if (itemTime === 0) return false;

      if (startDate) {
        const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
        const startTimestamp = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0).getTime();
        if (itemTime < startTimestamp) return false;
      }

      if (endDate) {
        const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
        const endTimestamp = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999).getTime();
        if (itemTime > endTimestamp) return false;
      }
    }

    if (whoFilter !== 'all') {
      const cancelledBy = String(c.cancelledBy || 'customer').toLowerCase();
      if (!cancelledBy.includes(whoFilter.toLowerCase())) return false;
    }
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase().trim();
    const userStr = `${c.userName || ''} ${c.userEmail || ''} ${c.userId || ''} ${c.orderId || ''} ${c.reason || ''}`.toLowerCase();
    const itemStr = (c.items || []).map((i: any) => `${i.name || ''} ${i.storeName || ''}`).join(' ').toLowerCase();
    const storeStr = (c.storeNames || []).join(' ').toLowerCase();
    return userStr.includes(q) || itemStr.includes(q) || storeStr.includes(q);
  });

  const totalCancelledRevenue = filteredCancellations.reduce((sum, c) => sum + (c.totalAmount || 0), 0);

  const exportCSV = () => {
    if (filteredCancellations.length === 0) return;
    const headers = ['Order ID', 'Customer Name', 'User ID', 'Email', 'Cancelled By', 'Reason', 'Total Amount (TZS)', 'Items', 'Stores', 'Date'];
    const rows = filteredCancellations.map((c) => {
      const itemNames = (c.items || []).map((i: any) => `${i.name} (x${i.quantity || 1}) - ${i.storeName || 'Store'}`).join('; ');
      const stores = (c.storeNames || Array.from(new Set((c.items || []).map((i: any) => i.storeName).filter(Boolean)))).join(', ');
      const dateStr = c.createdAt?.toDate?.() ? c.createdAt.toDate().toISOString() : '';
      return [
        `"${c.orderId || c.id}"`,
        `"${c.userName || 'Customer'}"`,
        `"${c.userId || 'guest_user'}"`,
        `"${c.userEmail || 'N/A'}"`,
        `"${c.cancelledBy || 'customer'}"`,
        `"${c.reason || 'Cancelled'}"`,
        c.totalAmount || 0,
        `"${itemNames}"`,
        `"${stores}"`,
        `"${dateStr}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tulete_Cancelled_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <XCircle className="w-4 h-4" />
            <span>Order Cancellation Telemetry & Audit</span>
          </div>
          <h1 className={`text-2xl font-black ${textPrimary}`}>Canceled Orders Log</h1>
          <p className={`text-xs font-medium mt-1 ${textMuted}`}>
            Inspect canceled orders in real-time with full customer names, store names, order item previews, and cancellation reasons.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={filteredCancellations.length === 0}
          className="h-11 px-5 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={`p-5 rounded-3xl border shadow-xl flex items-center justify-between ${cardBg}`}>
          <div>
            <span className={`text-xs font-bold ${textMuted}`}>Total Cancelled Orders</span>
            <h3 className={`text-2xl font-black mt-1 ${textPrimary}`}>{filteredCancellations.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-3xl border shadow-xl flex items-center justify-between ${cardBg}`}>
          <div>
            <span className={`text-xs font-bold ${textMuted}`}>Cancelled Revenue Volume</span>
            <h3 className={`text-2xl font-black mt-1 text-rose-500`}>
              {APP_SETTINGS.currency} {formatPrice(totalCancelledRevenue)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-3xl border shadow-xl flex items-center justify-between ${cardBg}`}>
          <div>
            <span className={`text-xs font-bold ${textMuted}`}>Affected Kitchens & Stores</span>
            <h3 className={`text-2xl font-black mt-1 ${textPrimary}`}>
              {Array.from(new Set(filteredCancellations.flatMap(c => (c.items || []).map((i: any) => i.storeName).filter(Boolean)))).length}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Modern Date Range Picker & Search Toolbar */}
      <div className={`p-5 rounded-3xl border shadow-xl space-y-4 ${cardBg}`}>
        {/* Top Row: Search & Filters */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by customer name, store name, order ID, reason, or item..."
              className={`w-full h-11 pl-10 pr-4 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${inputBg}`}
            />
          </div>

          {/* Initiator Filter */}
          <select
            value={whoFilter}
            onChange={(e) => setWhoFilter(e.target.value)}
            className={`h-11 px-4 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/50 shrink-0 w-full lg:w-auto ${inputBg}`}
          >
            <option value="all">All Initiators</option>
            <option value="customer">Cancelled by Customer</option>
            <option value="merchant">Cancelled by Store</option>
            <option value="admin">Cancelled by Admin</option>
            <option value="driver">Cancelled by Driver</option>
          </select>
        </div>

        {/* Bottom Row: Modern Date Range Picker & Quick Presets */}
        <div className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}>
          {/* Custom Date Pickers */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center gap-3 px-3.5 py-1.5 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-100 border-slate-200'}`}>
              {/* From Pill */}
              <div 
                onClick={openFromPicker}
                className="flex items-center gap-1.5 text-xs font-extrabold cursor-pointer group hover:text-rose-500 transition-colors"
                title="Click to open calendar picker panel"
              >
                <Calendar className={`w-4 h-4 shrink-0 group-hover:scale-110 transition-transform ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                <span className={textMuted}>From:</span>
                <input
                  ref={fromInputRef}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => {
                    e.stopPropagation();
                    openFromPicker();
                  }}
                  style={{ colorScheme: isDark ? 'dark' : 'light' }}
                  className={`h-8 px-2 rounded-xl text-xs font-black focus:outline-none cursor-pointer ${inputBg}`}
                />
              </div>

              <span className={`font-bold ${textMuted}`}>—</span>

              {/* To Pill */}
              <div 
                onClick={openToPicker}
                className="flex items-center gap-1.5 text-xs font-extrabold cursor-pointer group hover:text-rose-500 transition-colors"
                title="Click to open calendar picker panel"
              >
                <Calendar className={`w-4 h-4 shrink-0 group-hover:scale-110 transition-transform ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                <span className={textMuted}>To:</span>
                <input
                  ref={toInputRef}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => {
                    e.stopPropagation();
                    openToPicker();
                  }}
                  style={{ colorScheme: isDark ? 'dark' : 'light' }}
                  className={`h-8 px-2 rounded-xl text-xs font-black focus:outline-none cursor-pointer ${inputBg}`}
                />
              </div>
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[11px] font-bold mr-1 ${textMuted}`}>Presets:</span>
            <button
              onClick={() => { setStartDate('2026-08-12'); setEndDate(getTodayDateString()); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border ${
                startDate === '2026-08-12' && endDate === getTodayDateString()
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                  : isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Default (12 Aug – Today)
            </button>

            <button
              onClick={() => { setStartDate(getTodayDateString()); setEndDate(getTodayDateString()); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border ${
                startDate === getTodayDateString() && endDate === getTodayDateString()
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                  : isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Today
            </button>

            <button
              onClick={() => { setStartDate(getNDaysAgoString(7)); setEndDate(getTodayDateString()); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border ${
                startDate === getNDaysAgoString(7) && endDate === getTodayDateString()
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                  : isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Last 7 Days
            </button>

            <button
              onClick={() => { setStartDate(getNDaysAgoString(30)); setEndDate(getTodayDateString()); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border ${
                startDate === getNDaysAgoString(30) && endDate === getTodayDateString()
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                  : isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Last 30 Days
            </button>

            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border ${
                !startDate && !endDate
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                  : isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Cancellations Stream Table / List */}
      <div className={`border rounded-3xl shadow-xl overflow-hidden ${cardBg}`}>
        <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <h2 className={`text-lg font-black ${textPrimary}`}>Cancellations Timeline</h2>
          <span className={`text-xs font-bold ${textMuted}`}>
            Showing {filteredCancellations.length} records {startDate || endDate ? `(${startDate || 'Earliest'} to ${endDate || 'Latest'})` : '(all time)'}
          </span>
        </div>

        {loading ? (
          <div className={`p-12 text-center text-xs font-semibold ${textMuted}`}>
            Loading canceled orders telemetry...
          </div>
        ) : filteredCancellations.length === 0 ? (
          <div className={`p-12 text-center text-xs font-semibold ${textMuted}`}>
            No canceled orders matching current search filter.
          </div>
        ) : (
          <div className={`divide-y overflow-x-auto ${isDark ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
            {filteredCancellations.map((c) => {
              const itemTs = getRecordTimestamp(c);
              const dateStr = itemTs > 0 ? new Date(itemTs).toLocaleString() : (c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : 'Recent');
              const itemsList = c.items || [];
              const storeNames = Array.from(new Set(itemsList.map((i: any) => i.storeName || i.store).filter(Boolean)));
              const primaryStore = storeNames.join(', ') || 'Store / Kitchen';

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedOrder(c)}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800/60' : 'hover:bg-rose-50/50'
                  }`}
                >
                  {/* Left Column: Customer & Order Details */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        Order #{String(c.orderId || c.id).slice(-8)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        By {c.cancelledBy || 'customer'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 font-extrabold text-sm">
                        <Users className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="notranslate" translate="no">
                          Customer: <strong className={textPrimary}>{c.userName || 'Customer'}</strong> <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>({c.userId || 'guest_user'})</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Store className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="notranslate" translate="no">
                          Store: <strong className={isDark ? 'text-amber-400 font-extrabold' : 'text-amber-600 font-extrabold'}>{primaryStore}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Reason & Item Snippet */}
                    <div className="text-xs flex flex-wrap items-center gap-3 pt-1">
                      <span className={`italic font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>"{c.reason || 'No reason specified'}"</span>
                      <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>•</span>
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{itemsList.length} items ({itemsList.slice(0, 2).map((i: any) => i.name).join(', ')}{itemsList.length > 2 ? '...' : ''})</span>
                    </div>
                  </div>

                  {/* Right Column: Amount, Date & Preview Action */}
                  <div className={`flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="text-left sm:text-right">
                      <span className={`text-base font-black block ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                        {APP_SETTINGS.currency} {formatPrice(c.totalAmount || 0)}
                      </span>
                      <span className={`text-[11px] font-bold flex items-center gap-1 justify-end ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <Clock className="w-3.5 h-3.5 inline-block text-rose-500" /> {dateStr}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(c);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border border-rose-500/20 shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL CANCELED ORDER PREVIEW MODAL */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 ${cardBg}`}
            >
              {/* Modal Header */}
              <div className={`flex items-start justify-between gap-4 border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-widest">
                      CANCELLED ORDER PREVIEW
                    </span>
                  </div>
                  <h2 className={`text-xl font-black mt-2 ${textPrimary}`}>
                    Order #{selectedOrder.orderId || selectedOrder.id}
                  </h2>
                  <p className={`text-xs font-semibold mt-0.5 ${textMuted}`}>
                    Cancelled on {selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toLocaleString() : 'Recent'}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. Who Info: Customer Details & Store Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Box */}
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50/80 border-rose-200'} space-y-2`}>
                  <div className="flex items-center gap-2 text-rose-500 font-extrabold text-xs uppercase tracking-wider">
                    <Users className="w-4 h-4" />
                    <span>Customer Details (Who Ordered)</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className={`font-black text-sm ${textPrimary}`}>{selectedOrder.userName || 'Customer'}</p>
                    <p className={`font-medium flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <Mail className="w-3.5 h-3.5 text-rose-500" /> {selectedOrder.userEmail || 'No email registered'}
                    </p>
                    <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      User ID: <code className={`px-1.5 py-0.5 rounded font-mono font-bold border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>{selectedOrder.userId || 'guest_user'}</code>
                    </p>
                  </div>
                </div>

                {/* Store Box */}
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50/80 border-amber-200'} space-y-2`}>
                  <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xs uppercase tracking-wider">
                    <Store className="w-4 h-4" />
                    <span>Store / Kitchen Details</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-black text-sm text-amber-500">
                      {(selectedOrder.storeNames || Array.from(new Set((selectedOrder.items || []).map((i: any) => i.storeName || i.store).filter(Boolean)))).join(', ') || 'Store'}
                    </p>
                    <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Item Count: <strong className={textPrimary}>{selectedOrder.itemCount || (selectedOrder.items || []).length} items</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Cancellation Reason & Who Cancelled */}
              <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-extrabold flex items-center gap-1.5 uppercase tracking-wider ${textPrimary}`}>
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Cancellation Context</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    Initiated by: {selectedOrder.cancelledBy || 'customer'}
                  </span>
                </div>
                <p className={`text-xs font-bold italic p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800 text-rose-300' : 'bg-white border-rose-100 text-rose-700'}`}>
                  "{selectedOrder.reason || 'Customer requested order cancellation'}"
                </p>
              </div>

              {/* 3. Items List Breakdown */}
              <div className="space-y-3">
                <h4 className={`text-xs font-black uppercase tracking-wider ${textMuted}`}>Order Items Breakdown</h4>
                <div className={`border rounded-2xl overflow-hidden divide-y ${isDark ? 'border-slate-800 divide-slate-800' : 'border-slate-200 divide-slate-200'}`}>
                  {(selectedOrder.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                          <Package className={`w-4 h-4 ${textMuted}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`font-extrabold truncate ${textPrimary}`}>{item.name || 'Item'}</p>
                          <p className={`text-[11px] font-semibold ${textMuted}`}>Store: {item.storeName || item.store || 'Store'}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-extrabold ${textPrimary}`}>
                          {item.quantity || 1} x {APP_SETTINGS.currency} {formatPrice(item.price || 0)}
                        </span>
                        <span className="block font-black text-rose-500 text-xs">
                          {APP_SETTINGS.currency} {formatPrice((item.price || 0) * (item.quantity || 1))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Total */}
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Canceled Order Total</span>
                  <span className="text-2xl font-black text-rose-500 block">
                    {APP_SETTINGS.currency} {formatPrice(selectedOrder.totalAmount || 0)}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
