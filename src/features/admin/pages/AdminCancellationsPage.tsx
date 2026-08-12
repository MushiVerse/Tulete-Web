import React, { useEffect, useState } from 'react';
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
  const [startDate, setStartDate] = useState<string>('2026-08-12');
  const [endDate, setEndDate] = useState<string>('');
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
                createdAt: data.createdAt || data.updatedAt || null,
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
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (typeof a.createdAt === 'number' ? a.createdAt : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (typeof b.createdAt === 'number' ? b.createdAt : 0);
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
    const val = record.createdAt || record.timestamp || record.time || record.date || record.updatedAt;
    if (!val) return 0;
    if (typeof val === 'object') {
      if (typeof val.toDate === 'function') return val.toDate().getTime();
      if (typeof val.toMillis === 'function') return val.toMillis();
      if (typeof val.seconds === 'number') return val.seconds * 1000;
    }
    if (typeof val === 'number') return val < 10000000000 ? val * 1000 : val;
    if (typeof val === 'string') {
      const p = new Date(val).getTime();
      if (!isNaN(p) && p > 0) return p;
      const formatted = val.replace(' ', 'T');
      const pf = new Date(formatted).getTime();
      if (!isNaN(pf) && pf > 0) return pf;
    }
    return 0;
  };

  const filteredCancellations = cancellations.filter((c) => {
    // 1. Date Range Filter (From startDate To endDate)
    if (startDate || endDate) {
      const itemTime = getRecordTimestamp(c);
      if (itemTime > 0) {
        if (startDate) {
          const startTimestamp = new Date(`${startDate}T00:00:00`).getTime();
          if (itemTime < startTimestamp) return false;
        }
        if (endDate) {
          const endTimestamp = new Date(`${endDate}T23:59:59.999`).getTime();
          if (itemTime > endTimestamp) return false;
        }
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

      {/* Controls: Search, Date Range Filter & Initiator Filter */}
      <div className={`p-4 rounded-3xl border shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 ${cardBg}`}>
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

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
          {/* Date Range Picker (From & To) */}
          <div className="flex flex-wrap items-center gap-2 bg-muted/60 border border-border px-3.5 py-1.5 rounded-2xl">
            <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`h-9 px-2 rounded-xl text-xs font-extrabold focus:outline-none ${inputBg}`}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`h-9 px-2 rounded-xl text-xs font-extrabold focus:outline-none ${inputBg}`}
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-[10px] font-extrabold text-rose-500 hover:underline px-1 cursor-pointer"
                title="Clear date range to view all time"
              >
                Reset
              </button>
            )}
          </div>

          <select
            value={whoFilter}
            onChange={(e) => setWhoFilter(e.target.value)}
            className={`h-11 px-4 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${inputBg}`}
          >
            <option value="all">All Initiators</option>
            <option value="customer">Cancelled by Customer</option>
            <option value="merchant">Cancelled by Store</option>
            <option value="admin">Cancelled by Admin</option>
            <option value="driver">Cancelled by Driver</option>
          </select>
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
          <div className="divide-y divide-border/40 overflow-x-auto">
            {filteredCancellations.map((c) => {
              const dateStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : 'Recent';
              const itemsList = c.items || [];
              const storeNames = Array.from(new Set(itemsList.map((i: any) => i.storeName || i.store).filter(Boolean)));
              const primaryStore = storeNames.join(', ') || 'Store / Kitchen';

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedOrder(c)}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors cursor-pointer hover:bg-rose-500/5 ${
                    isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
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
                      <div className="flex items-center gap-1.5 font-extrabold text-sm text-foreground">
                        <Users className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="notranslate" translate="no">
                          Customer: <strong className={textPrimary}>{c.userName || 'Customer'}</strong> ({c.userEmail || c.userId || 'guest_user'})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-bold text-xs text-muted-foreground">
                        <Store className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="notranslate" translate="no">
                          Store: <strong className="text-amber-500 font-extrabold">{primaryStore}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Reason & Item Snippet */}
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 pt-1">
                      <span className="italic text-rose-400">"{c.reason || 'No reason specified'}"</span>
                      <span>•</span>
                      <span>{itemsList.length} items ({itemsList.slice(0, 2).map((i: any) => i.name).join(', ')}{itemsList.length > 2 ? '...' : ''})</span>
                    </div>
                  </div>

                  {/* Right Column: Amount, Date & Preview Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="text-base font-black text-rose-500 block">
                        {APP_SETTINGS.currency} {formatPrice(c.totalAmount || 0)}
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 inline-block" /> {dateStr}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 ${cardBg}`}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 border-b pb-4 border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-widest">
                      CANCELLED ORDER PREVIEW
                    </span>
                  </div>
                  <h2 className={`text-xl font-black mt-2 ${textPrimary}`}>
                    Order #{selectedOrder.orderId || selectedOrder.id}
                  </h2>
                  <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                    Cancelled on {selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toLocaleString() : 'Recent'}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-all cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. Who Info: Customer Details & Store Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Box */}
                <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                  <div className="flex items-center gap-2 text-rose-500 font-extrabold text-xs uppercase tracking-wider">
                    <Users className="w-4 h-4" />
                    <span>Customer Details (Who Ordered)</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className={`font-black text-sm ${textPrimary}`}>{selectedOrder.userName || 'Customer'}</p>
                    <p className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-rose-400" /> {selectedOrder.userEmail || 'No email registered'}
                    </p>
                    <p className="text-muted-foreground font-medium">
                      User ID: <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-bold text-foreground">{selectedOrder.userId || 'guest_user'}</code>
                    </p>
                  </div>
                </div>

                {/* Store Box */}
                <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                  <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xs uppercase tracking-wider">
                    <Store className="w-4 h-4" />
                    <span>Store / Kitchen Details</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className={`font-black text-sm text-amber-500`}>
                      {(selectedOrder.storeNames || Array.from(new Set((selectedOrder.items || []).map((i: any) => i.storeName || i.store).filter(Boolean)))).join(', ') || 'Store'}
                    </p>
                    <p className="text-muted-foreground font-medium">
                      Item Count: <strong className="text-foreground">{selectedOrder.itemCount || (selectedOrder.items || []).length} items</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Cancellation Reason & Who Cancelled */}
              <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Cancellation Context</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    Initiated by: {selectedOrder.cancelledBy || 'customer'}
                  </span>
                </div>
                <p className="text-xs text-foreground font-semibold italic bg-background p-3 rounded-xl border border-border/60">
                  "{selectedOrder.reason || 'Customer requested order cancellation'}"
                </p>
              </div>

              {/* 3. Items List Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Order Items Breakdown</h4>
                <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
                  {(selectedOrder.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className={`font-extrabold truncate ${textPrimary}`}>{item.name || 'Item'}</p>
                          <p className="text-[11px] text-muted-foreground font-medium">Store: {item.storeName || item.store || 'Store'}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-foreground">
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
