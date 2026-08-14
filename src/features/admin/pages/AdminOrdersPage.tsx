import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { 
  ShoppingBag, Search, Download, Calendar, Filter, Clock, Users, Store, 
  DollarSign, CheckCircle, XCircle, AlertCircle, Eye, X, Package, ShieldAlert,
  Globe, Building2, ChevronRight, RefreshCw, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminTheme } from '../context/AdminThemeContext';
import { AdminPagination } from '../components/AdminPagination';
import { APP_SETTINGS } from '@/core/config/settings';
import { formatPrice } from '../../../shared/utils/formatPrice';

export interface AdminOrderRecord {
  id: string;
  orderId: string;
  source: 'online' | 'pos'; // 'online' = newcomfirmedorders, 'pos' = orders
  sourceLabel: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  storeId?: string;
  storeName: string;
  status: string;
  totalAmount: number;
  items: any[];
  itemCount: number;
  rawTimestamp: any;
  timestampMs: number;
  dateStr: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  rawDoc: any;
}

export const AdminOrdersPage: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';

  // Order data & loading states
  const [onlineOrders, setOnlineOrders] = useState<AdminOrderRecord[]>([]);
  const [posOrders, setPosOrders] = useState<AdminOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: 'all' | 'online' | 'pos'
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'pos'>('all');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Date Range Picker - CRITICAL REQUIREMENT: NO DEFAULT START DATE ("")
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Selected order for detailed modal
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRecord | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  // Helper to extract timestamp ms from various Firestore date formats
  const parseTimestampMs = (val: any, docId?: string, rawDoc?: any): number => {
    if (val !== null && val !== undefined) {
      // 1. Objects (Firestore Timestamp, Date, etc.)
      if (typeof val === 'object') {
        if (typeof val.toDate === 'function') {
          try {
            const t = val.toDate().getTime();
            if (!isNaN(t) && t > 0) return t;
          } catch {}
        }
        if (typeof val.toMillis === 'function') {
          try {
            const t = val.toMillis();
            if (!isNaN(t) && t > 0) return t;
          } catch {}
        }
        if (typeof val.seconds === 'number') {
          return val.seconds * 1000;
        }
        if (typeof val._seconds === 'number') {
          return val._seconds * 1000;
        }
        if (val instanceof Date) {
          const t = val.getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        // Nested object containing time / timestamp properties
        if (val.time || val.timestamp || val.date || val.createdAt || val.seconds || val._seconds) {
          const sub = parseTimestampMs(val.time || val.timestamp || val.date || val.createdAt || val.seconds || val._seconds, docId, rawDoc);
          if (sub > 0) return sub;
        }
      }

      // 2. Numbers (epoch ms or seconds)
      if (typeof val === 'number' && !isNaN(val) && val > 0) {
        return val < 10000000000 ? val * 1000 : val;
      }

      // 3. Strings
      if (typeof val === 'string') {
        let trimmed = val.trim();
        if (trimmed) {
          // Fix Flutter DateTime microseconds format e.g. "2026-08-13 05:19:12.345678" -> "2026-08-13 05:19:12.345"
          trimmed = trimmed.replace(/(\.\d{3})\d+/, '$1');

          // Pure numeric epoch string e.g. "1739414389123" or "1739414389"
          if (/^\d{9,13}$/.test(trimmed)) {
            const num = Number(trimmed);
            if (!isNaN(num) && num > 0) {
              return num < 10000000000 ? num * 1000 : num;
            }
          }

          // Try parsing ISO formatted string with 'T'
          const isoFormatted = trimmed.replace(' ', 'T');
          const pIso = new Date(isoFormatted).getTime();
          if (!isNaN(pIso) && pIso > 0) return pIso;

          // Standard JS Date parse
          const pDirect = new Date(trimmed).getTime();
          if (!isNaN(pDirect) && pDirect > 0) return pDirect;

          // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
          const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(?:at\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:\s*(AM|PM))?)?$/i);
          if (ddmmyyyyMatch) {
            const [, day, month, year, hoursStr = '0', minutes = '0', seconds = '0', ampm] = ddmmyyyyMatch;
            let hours = Number(hoursStr);
            if (ampm) {
              if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
              if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
            }
            const parsedDate = new Date(
              Number(year),
              Number(month) - 1,
              Number(day),
              hours,
              Number(minutes),
              Number(seconds)
            );
            if (!isNaN(parsedDate.getTime())) return parsedDate.getTime();
          }

          // Extract embedded 9 to 13 digit epoch numbers inside string
          const embeddedMatch = trimmed.match(/(1[5-9]\d{8,11})/);
          if (embeddedMatch) {
            const num = Number(embeddedMatch[1]);
            if (!isNaN(num) && num > 0) {
              return num < 10000000000 ? num * 1000 : num;
            }
          }
        }
      }
    }

    // Fallback: extract epoch number from docId, orderId, or webOrderId
    const idsToCheck = [docId, rawDoc?.id, rawDoc?.orderId, rawDoc?.webOrderId].filter(Boolean);
    for (const idStr of idsToCheck) {
      const str = String(idStr).trim();
      const numId = Number(str);
      if (!isNaN(numId) && numId > 1500000000) {
        return numId < 10000000000 ? numId * 1000 : numId;
      }
      const embeddedMatch = str.match(/(1[5-9]\d{8,11})/);
      if (embeddedMatch) {
        const num = Number(embeddedMatch[1]);
        if (!isNaN(num) && num > 0) {
          return num < 10000000000 ? num * 1000 : num;
        }
      }
    }

    return 0;
  };

  // Helper to check if an order is cancelled
  const isOrderCancelled = (order: AdminOrderRecord): boolean => {
    const statusStr = String(order.status || '').toLowerCase();
    const raw = order.rawDoc || {};
    return (
      statusStr.includes('cancel') ||
      raw.cancel === true ||
      raw.cancel === 'true' ||
      raw.isCancelled === true ||
      raw.isCancelled === 'true'
    );
  };

  // Helper to map document to AdminOrderRecord
  const mapDocToRecord = (d: any, source: 'online' | 'pos'): AdminOrderRecord => {
    const data = d.data() || {};
    const rawTime =
      data.time ||
      data.timestamp ||
      data.date ||
      data.createdAt ||
      data.created_at ||
      data.orderDate ||
      data.order_date ||
      data.updatedAt ||
      data.updated_at ||
      (Array.isArray(data.orderststime) && data.orderststime.length > 0 ? data.orderststime[0] : null) ||
      (Array.isArray(data.orderstsTime) && data.orderstsTime.length > 0 ? data.orderstsTime[0] : null) ||
      data.time1 ||
      data.time_stamp ||
      data.dateTime ||
      data.datetime ||
      data.placedAt ||
      data.placed_at ||
      data.dateCreated ||
      data.date_created ||
      (Array.isArray(data.history) && data.history.length > 0 ? (data.history[0].time || data.history[0].timestamp || data.history[0].date) : null);

    let tsMs = parseTimestampMs(rawTime, d.id, data);
    if (tsMs === 0) {
      tsMs = parseTimestampMs(d.id, d.id, data);
    }

    let dateStr = '';
    if (tsMs > 0) {
      dateStr = new Date(tsMs).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (typeof rawTime === 'string' && rawTime.trim().length > 0 && rawTime.trim().toLowerCase() !== 'n/a') {
      dateStr = rawTime.trim();
    } else if (typeof data.date === 'string' && data.date.trim().length > 0 && data.date.trim().toLowerCase() !== 'n/a') {
      dateStr = data.date.trim();
    } else if (typeof data.time === 'string' && data.time.trim().length > 0 && data.time.trim().toLowerCase() !== 'n/a') {
      dateStr = data.time.trim();
    } else if (typeof data.orderDate === 'string' && data.orderDate.trim().length > 0) {
      dateStr = data.orderDate.trim();
    } else {
      dateStr = 'N/A';
    }

    const items = data.items || data.cartItems || data.products || [];
    const storeNames = Array.from(new Set(items.map((i: any) => i.storeName || i.store || data.storeName || data.store || '').filter(Boolean)));
    const primaryStore = storeNames.join(', ') || data.storeName || data.store || data.branch || (source === 'pos' ? 'POS Physical Branch' : 'Online Store');

    // Use field "total" from Firestore document for Total (TZS) column & order total
    let totalVal = 0;
    if (data.total !== undefined && data.total !== null && data.total !== '') {
      totalVal = Number(data.total);
    } else if (data.totalAmount !== undefined && data.totalAmount !== null && data.totalAmount !== '') {
      totalVal = Number(data.totalAmount);
    } else if (data.price !== undefined && data.price !== null && data.price !== '') {
      totalVal = Number(data.price);
    } else if (data.grandTotal !== undefined && data.grandTotal !== null && data.grandTotal !== '') {
      totalVal = Number(data.grandTotal);
    }
    if (isNaN(totalVal)) totalVal = 0;

    return {
      id: d.id,
      orderId: data.webOrderId || data.orderId || data.id || d.id,
      source,
      sourceLabel: source === 'online' ? 'Online (App/Web)' : 'POS Physical Laundry Office',
      userId: data.userId || data.uid || data.customerId || 'guest_user',
      userName: data.userName || data.name || data.customerName || data.clientName || 'Customer',
      userEmail: data.userEmail || data.email || '',
      userPhone: data.userPhone || data.phone || data.phoneNumber || '',
      storeId: data.storeId || '',
      storeName: primaryStore,
      status: data.status || (data.completed ? 'Completed' : 'Pending'),
      totalAmount: totalVal,
      items: items.map((i: any) => ({
        name: i.name || i.title || i.itemName || 'Item',
        price: Number(i.price || i.rate || 0),
        quantity: Number(i.quantity || i.qty || 1),
        storeName: i.storeName || i.store || primaryStore,
      })),
      itemCount: items.length || 1,
      rawTimestamp: rawTime,
      timestampMs: tsMs,
      dateStr,
      deliveryAddress: data.deliveryAddress || data.address || data.location || '',
      paymentMethod: data.paymentMethod || data.paymentMode || data.payMode || 'N/A',
      rawDoc: data,
    };
  };

  useEffect(() => {
    setLoading(true);

    // 1. Subscribe to 'newcomfirmedorders' (Online orders)
    const onlineRef = collection(db, 'newcomfirmedorders');
    const unsubOnline = onSnapshot(onlineRef, (snap) => {
      const list: AdminOrderRecord[] = snap.docs.map((d) => mapDocToRecord(d, 'online'));
      list.sort((a, b) => b.timestampMs - a.timestampMs);
      setOnlineOrders(list);
      setLoading(false);
    }, (err) => {
      console.warn('Online orders snapshot error:', err);
      setLoading(false);
    });

    // 2. Subscribe to 'orders' (POS physical laundry office orders)
    const posRef = collection(db, 'orders');
    const unsubPos = onSnapshot(posRef, (snap) => {
      const list: AdminOrderRecord[] = snap.docs.map((d) => mapDocToRecord(d, 'pos'));
      list.sort((a, b) => b.timestampMs - a.timestampMs);
      setPosOrders(list);
    }, (err) => {
      console.warn('POS orders snapshot error:', err);
    });

    return () => {
      unsubOnline();
      unsubPos();
    };
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, storeFilter, statusFilter, startDate, endDate]);

  // Combine or filter orders by selected source tab
  const getTabOrders = (): AdminOrderRecord[] => {
    if (activeTab === 'online') return onlineOrders;
    if (activeTab === 'pos') return posOrders;
    
    // Combined View
    const combined = [...onlineOrders, ...posOrders];
    combined.sort((a, b) => b.timestampMs - a.timestampMs);
    return combined;
  };

  const tabOrders = getTabOrders();

  // All unique store names for dropdown filter
  const allStoreNames = Array.from(new Set(
    [...onlineOrders, ...posOrders].map((o) => o.storeName).filter(Boolean)
  )).sort();

  // All unique statuses for dropdown filter
  const allStatuses = Array.from(new Set(
    [...onlineOrders, ...posOrders].map((o) => o.status).filter(Boolean)
  )).sort();

  // Helper to check if an order has invalid N/A date
  const isInvalidNaOrder = (order: AdminOrderRecord): boolean => {
    return !order.dateStr || order.dateStr.trim().toUpperCase() === 'N/A';
  };

  // Filter pipeline
  const filteredOrders = tabOrders.filter((order) => {
    // 0. Exclude orders with "N/A" date & time
    if (isInvalidNaOrder(order)) return false;

    // 1. Date Range Filter (NO DEFAULT START DATE - if startDate is empty, returns all past orders!)
    if (startDate || endDate) {
      if (order.timestampMs > 0) {
        if (startDate) {
          const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
          const startTs = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0).getTime();
          if (order.timestampMs < startTs) return false;
        }

        if (endDate) {
          const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
          const endTs = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999).getTime();
          if (order.timestampMs > endTs) return false;
        }
      }
    }

    // 2. Store Filter
    if (storeFilter !== 'all') {
      if (order.storeName !== storeFilter) return false;
    }

    // 3. Status Filter
    if (statusFilter !== 'all') {
      if (order.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    }

    // 4. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const userStr = `${order.userName} ${order.userEmail} ${order.userPhone} ${order.userId} ${order.orderId}`.toLowerCase();
      const storeStr = order.storeName.toLowerCase();
      const itemStr = order.items.map((i) => i.name).join(' ').toLowerCase();

      if (!userStr.includes(q) && !storeStr.includes(q) && !itemStr.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Calculate Metrics - Exclude N/A date orders and cancelled orders from revenue sums
  const validOnlineOrders = onlineOrders.filter((o) => !isInvalidNaOrder(o));
  const validPosOrders = posOrders.filter((o) => !isInvalidNaOrder(o));

  const totalOnlineCount = validOnlineOrders.length;
  const totalPosCount = validPosOrders.length;
  const totalCombinedCount = totalOnlineCount + totalPosCount;

  const totalOnlineRevenue = validOnlineOrders
    .filter((o) => !isOrderCancelled(o))
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalPosRevenue = validPosOrders
    .filter((o) => !isOrderCancelled(o))
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalFilteredRevenue = filteredOrders
    .filter((o) => !isInvalidNaOrder(o) && !isOrderCancelled(o))
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Pagination slicing
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // CSV Export
  const exportCSV = () => {
    if (filteredOrders.length === 0) return;
    const headers = ['Order Source', 'Order ID', 'Customer Name', 'User ID', 'Email', 'Phone', 'Store/Branch', 'Status', 'Total Amount (TZS)', 'Items', 'Date'];
    const rows = filteredOrders.map((o) => {
      const itemNames = o.items.map((i) => `${i.name} (x${i.quantity})`).join('; ');
      return [
        `"${o.sourceLabel}"`,
        `"${o.orderId}"`,
        `"${o.userName}"`,
        `"${o.userId}"`,
        `"${o.userEmail || 'N/A'}"`,
        `"${o.userPhone || 'N/A'}"`,
        `"${o.storeName}"`,
        `"${o.status}"`,
        o.totalAmount,
        `"${itemNames}"`,
        `"${o.dateStr}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tulete_Orders_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
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
      {/* Header Banner */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border shadow-xl ${cardBg}`}>
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span>Master Order Management & History</span>
          </div>
          <h1 className={`text-2xl font-black ${textPrimary}`}>Orders Intelligence Dashboard</h1>
          <p className={`text-xs font-medium mt-1 ${textMuted}`}>
            Monitor all historical orders placed online (App/Web) and POS orders from physical laundry offices.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={filteredOrders.length === 0}
          className="h-11 px-5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Filtered Orders CSV</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-3xl border shadow-xl flex items-center justify-between ${cardBg}`}>
          <div>
            <span className={`text-xs font-bold ${textMuted}`}>Total Historical Orders</span>
            <h3 className={`text-2xl font-black mt-1 ${textPrimary}`}>{totalCombinedCount.toLocaleString()}</h3>
            <span className="text-[11px] font-bold text-purple-400 mt-1 block">Ever since creation</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-3xl border shadow-xl flex items-center justify-between ${cardBg}`}>
          <div>
            <span className={`text-xs font-bold ${textMuted}`}>Online Orders (App/Web)</span>
            <h3 className={`text-2xl font-black mt-1 text-sky-500`}>{totalOnlineCount.toLocaleString()}</h3>
            <span className="text-[11px] font-bold text-sky-400 mt-1 block">
              {APP_SETTINGS.currency} {formatPrice(totalOnlineRevenue)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-3xl border shadow-xl flex items-center justify-between ${cardBg}`}>
          <div>
            <span className={`text-xs font-bold ${textMuted}`}>POS Laundry Office Orders</span>
            <h3 className={`text-2xl font-black mt-1 text-amber-500`}>{totalPosCount.toLocaleString()}</h3>
            <span className="text-[11px] font-bold text-amber-400 mt-1 block">
              {APP_SETTINGS.currency} {formatPrice(totalPosRevenue)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-3xl border shadow-xl flex items-center justify-between ${cardBg}`}>
          <div>
            <span className={`text-xs font-bold ${textMuted}`}>Filtered Volume Revenue</span>
            <h3 className={`text-2xl font-black mt-1 text-emerald-500`}>
              {APP_SETTINGS.currency} {formatPrice(totalFilteredRevenue)}
            </h3>
            <span className="text-[11px] font-bold text-emerald-400 mt-1 block">
              Showing {filteredOrders.length} orders
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs / Document Filter Chips: Online vs POS vs All */}
      <div className={`p-2.5 sm:p-2 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${cardBg}`}>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between sm:justify-center gap-2 transition-all cursor-pointer border w-full sm:w-auto ${
              activeTab === 'all'
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                : isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>All Orders</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 text-white border border-white/20 font-black">
              {totalCombinedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('online')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between sm:justify-start gap-2 transition-all cursor-pointer border w-full sm:w-auto ${
              activeTab === 'online'
                ? 'bg-sky-600 text-white border-sky-600 shadow-lg shadow-sky-600/20'
                : isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 shrink-0" />
              <span>Online Orders</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-white border border-sky-400/30 font-black">
              {totalOnlineCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between sm:justify-start gap-2 transition-all cursor-pointer border w-full sm:w-auto ${
              activeTab === 'pos'
                ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20'
                : isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>POS Laundry Office</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-white border border-amber-400/30 font-black">
              {totalPosCount}
            </span>
          </button>
        </div>

        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border text-center sm:text-left w-full sm:w-auto ${isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
          Collection: <strong className="text-primary font-black">{activeTab === 'online' ? 'newcomfirmedorders' : activeTab === 'pos' ? 'orders' : 'newcomfirmedorders + orders'}</strong>
        </div>
      </div>

      {/* Date Range Picker & Search Toolbar */}
      <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl space-y-4 ${cardBg}`}>
        {/* Top Row: Search & Select Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name, email, phone, store/branch, order ID, or item..."
              className={`w-full h-11 pl-10 pr-4 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 ${inputBg}`}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Store Filter */}
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className={`h-11 px-4 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-auto min-w-0 max-w-full shrink-0 ${inputBg}`}
            >
              <option value="all">All Stores & POS Branches</option>
              {allStoreNames.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`h-11 px-4 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-auto min-w-0 max-w-full shrink-0 ${inputBg}`}
            >
              <option value="all">All Statuses</option>
              {allStatuses.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Picker & Presets */}
        <div className={`flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200/80'}`}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto">
            <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-2.5 sm:px-3.5 sm:py-1.5 rounded-2xl border w-full sm:w-auto ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-100 border-slate-200'}`}>
              {/* From Pill */}
              <div 
                onClick={openFromPicker}
                className="flex items-center justify-between sm:justify-start gap-1.5 text-xs font-extrabold cursor-pointer group hover:text-primary transition-colors w-full sm:w-auto"
                title="Click to select custom start date"
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 shrink-0 text-primary" />
                  <span className={textMuted}>From:</span>
                </div>
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
                  className={`h-8 px-2 rounded-xl text-xs font-black focus:outline-none cursor-pointer w-full sm:w-auto ${inputBg}`}
                />
              </div>

              <span className={`hidden sm:inline font-bold ${textMuted}`}>—</span>

              {/* To Pill */}
              <div 
                onClick={openToPicker}
                className="flex items-center justify-between sm:justify-start gap-1.5 text-xs font-extrabold cursor-pointer group hover:text-primary transition-colors w-full sm:w-auto"
                title="Click to select custom end date"
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 shrink-0 text-primary" />
                  <span className={textMuted}>To:</span>
                </div>
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
                  className={`h-8 px-2 rounded-xl text-xs font-black focus:outline-none cursor-pointer w-full sm:w-auto ${inputBg}`}
                />
              </div>
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="px-3 py-2 sm:py-1.5 rounded-xl text-xs font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer w-full sm:w-auto text-center"
              >
                Clear Dates
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 w-full xl:w-auto">
            <span className={`text-[11px] font-bold mr-1 ${textMuted} w-full sm:w-auto mb-1 sm:mb-0`}>Presets:</span>
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border flex-1 sm:flex-none text-center ${
                !startDate && !endDate
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                  : isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>

            <button
              onClick={() => { setStartDate(getTodayDateString()); setEndDate(getTodayDateString()); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border flex-1 sm:flex-none text-center ${
                startDate === getTodayDateString() && endDate === getTodayDateString()
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                  : isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Today
            </button>

            <button
              onClick={() => { setStartDate(getNDaysAgoString(7)); setEndDate(getTodayDateString()); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border flex-1 sm:flex-none text-center ${
                startDate === getNDaysAgoString(7) && endDate === getTodayDateString()
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                  : isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Last 7 Days
            </button>

            <button
              onClick={() => { setStartDate(getNDaysAgoString(30)); setEndDate(getTodayDateString()); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border flex-1 sm:flex-none text-center ${
                startDate === getNDaysAgoString(30) && endDate === getTodayDateString()
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                  : isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Orders Data Table */}
      <div className={`border rounded-3xl shadow-xl overflow-hidden ${cardBg}`}>
        <div className={`p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <h2 className={`text-lg font-black ${textPrimary}`}>Orders List</h2>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {activeTab === 'online' ? 'Online App/Web' : activeTab === 'pos' ? 'POS Office' : 'All Combined'}
            </span>
          </div>

          <span className={`text-xs font-bold ${textMuted}`}>
            Found {filteredOrders.length.toLocaleString()} orders {startDate || endDate ? `(${startDate || 'Earliest'} to ${endDate || 'Latest'})` : '(ever since)'}
          </span>
        </div>

        {loading ? (
          <div className={`p-12 text-center text-xs font-semibold ${textMuted}`}>
            Loading orders telemetry from Firestore...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className={`p-12 text-center text-xs font-semibold ${textMuted}`}>
            No orders found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                  isDark ? 'border-slate-800 bg-slate-950/50 text-slate-400' : 'border-slate-200 bg-slate-100/70 text-slate-600'
                }`}>
                  <th className="py-3.5 px-6">Source</th>
                  <th className="py-3.5 px-6">Order ID</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Store / POS Office</th>
                  <th className="py-3.5 px-6">Items Summary</th>
                  <th className="py-3.5 px-6 text-right">Total (TZS)</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-center">Date & Time</th>
                  <th className="py-3.5 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-medium ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {paginatedOrders.map((order, idx) => {
                  const isOnline = order.source === 'online';
                  const cancelled = isOrderCancelled(order);

                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.015 }}
                      onClick={() => setSelectedOrder(order)}
                      className={`cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Source Tag */}
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit border ${
                          isOnline
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {isOnline ? <Globe className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                          <span>{isOnline ? 'Online' : 'POS Office'}</span>
                        </span>
                      </td>

                      {/* Order ID */}
                      <td className={`py-4 px-6 font-mono font-bold ${textPrimary}`}>
                        #{String(order.orderId).slice(-8)}
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-6">
                        <div>
                          <p className={`font-bold ${textPrimary}`}>{order.userName}</p>
                          <p className={`text-[10px] font-mono ${textMuted}`}>
                            {order.userEmail || order.userPhone || order.userId}
                          </p>
                        </div>
                      </td>

                      {/* Store / Branch */}
                      <td className={`py-4 px-6 font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        {order.storeName}
                      </td>

                      {/* Items Summary */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5 max-w-xs">
                          <span className={`font-extrabold block ${textPrimary}`}>
                            {order.itemCount} item{order.itemCount > 1 ? 's' : ''}
                          </span>
                          <span className={`text-[11px] truncate block ${textMuted}`}>
                            {order.items.slice(0, 2).map((i) => i.name).join(', ')}
                            {order.items.length > 2 ? '...' : ''}
                          </span>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className={`py-4 px-6 text-right font-black ${cancelled ? 'text-rose-500/80 line-through opacity-75' : 'text-emerald-500'}`}>
                        {APP_SETTINGS.currency} {formatPrice(order.totalAmount)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap inline-block border ${
                          order.status.toLowerCase().includes('cancel')
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            : order.status.toLowerCase().includes('complet') || order.status.toLowerCase().includes('deliver')
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {order.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className={`py-4 px-6 text-center text-[11px] font-semibold ${textMuted}`}>
                        {order.dateStr}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer"
                          title="Preview Full Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Global Pagination */}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredOrders.length}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => setPageSize(size)}
        />
      </div>

      {/* FULL ORDER PREVIEW MODAL */}
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
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                      selectedOrder.source === 'online'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {selectedOrder.sourceLabel}
                    </span>
                  </div>
                  <h2 className={`text-xl font-black mt-2 ${textPrimary}`}>
                    Order #{selectedOrder.orderId}
                  </h2>
                  <p className={`text-xs font-semibold mt-0.5 ${textMuted}`}>
                    Placed on {selectedOrder.dateStr}
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

              {/* Customer & Store Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                  <div className="flex items-center gap-2 text-primary font-extrabold text-xs uppercase tracking-wider">
                    <Users className="w-4 h-4" />
                    <span>Customer Details</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className={`font-black text-sm ${textPrimary}`}>{selectedOrder.userName}</p>
                    {selectedOrder.userEmail && (
                      <p className={`font-medium ${textMuted}`}>Email: {selectedOrder.userEmail}</p>
                    )}
                    {selectedOrder.userPhone && (
                      <p className={`font-medium ${textMuted}`}>Phone: {selectedOrder.userPhone}</p>
                    )}
                    <p className={`font-medium ${textMuted}`}>
                      User ID: <code className={`px-1.5 py-0.5 rounded font-mono border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>{selectedOrder.userId}</code>
                    </p>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                  <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xs uppercase tracking-wider">
                    <Store className="w-4 h-4" />
                    <span>Store / Branch Location</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-black text-sm text-amber-500">{selectedOrder.storeName}</p>
                    <p className={`font-medium ${textMuted}`}>Status: <strong className={textPrimary}>{selectedOrder.status}</strong></p>
                    {selectedOrder.paymentMethod && (
                      <p className={`font-medium ${textMuted}`}>Payment: <strong className={textPrimary}>{selectedOrder.paymentMethod}</strong></p>
                    )}
                    {selectedOrder.deliveryAddress && (
                      <p className={`font-medium ${textMuted}`}>Address: <strong className={textPrimary}>{selectedOrder.deliveryAddress}</strong></p>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-3">
                <h4 className={`text-xs font-black uppercase tracking-wider ${textMuted}`}>Order Items Breakdown</h4>
                <div className={`border rounded-2xl overflow-hidden divide-y ${isDark ? 'border-slate-800 divide-slate-800' : 'border-slate-200 divide-slate-200'}`}>
                  {selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                          <Package className={`w-4 h-4 ${textMuted}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`font-extrabold truncate ${textPrimary}`}>{item.name}</p>
                          <p className={`text-[11px] font-semibold ${textMuted}`}>Store: {item.storeName}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-extrabold ${textPrimary}`}>
                          {item.quantity} x {APP_SETTINGS.currency} {formatPrice(item.price)}
                        </span>
                        <span className="block font-black text-emerald-500 text-xs">
                          {APP_SETTINGS.currency} {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Financial Summary */}
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Grand Total Amount</span>
                  <span className="text-2xl font-black text-primary block">
                    {APP_SETTINGS.currency} {formatPrice(selectedOrder.totalAmount)}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer"
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
