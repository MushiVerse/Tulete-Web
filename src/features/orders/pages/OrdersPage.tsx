import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderListRealtime } from '../hooks/useOrderRealtime';
import { orderService, Order, OrderStatus } from '../services/orderService';
import { useCartStore } from '../../cart/store/useCartStore';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { Badge } from '../../../shared/components/ui/Badge';
import { 
  Search, Calendar, Clock, ShoppingBag, Eye, 
  RotateCcw, AlertCircle, Phone, XCircle, ArrowRight, Sparkles, ChevronDown, ChevronUp, Layers, Shirt, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';
import { useThemeStore } from '../../../core/theme/useThemeStore';

const STATUS_CONFIGS: Record<string, { color: string; dotColor: string; label: string; progress: number }> = {
  'Order Placed': { color: 'bg-amber-100 text-black border-amber-300 dark:bg-slate-900 dark:text-white dark:border-slate-700', dotColor: 'text-amber-500', label: 'Order Placed', progress: 15 },
  Pending: { color: 'bg-amber-100 text-black border-amber-300 dark:bg-slate-900 dark:text-white dark:border-slate-700', dotColor: 'text-amber-500', label: 'Pending', progress: 15 },
  Confirmed: { color: 'bg-sky-100 text-black border-sky-300 dark:bg-slate-900 dark:text-white dark:border-sky-700', dotColor: 'text-sky-500', label: 'Confirmed', progress: 30 },
  Preparing: { color: 'bg-indigo-100 text-black border-indigo-300 dark:bg-slate-900 dark:text-white dark:border-indigo-700', dotColor: 'text-indigo-500', label: 'Preparing', progress: 50 },
  'Picked Up': { color: 'bg-purple-100 text-black border-purple-300 dark:bg-slate-900 dark:text-white dark:border-purple-700', dotColor: 'text-purple-500', label: 'Picked Up', progress: 70 },
  'On The Way': { color: 'bg-orange-100 text-black border-orange-300 dark:bg-slate-900 dark:text-white dark:border-orange-700', dotColor: 'text-orange-500', label: 'On The Way', progress: 85 },
  Delivered: { color: 'bg-emerald-100 text-black border-emerald-300 dark:bg-slate-900 dark:text-white dark:border-emerald-700', dotColor: 'text-emerald-500', label: 'Delivered', progress: 100 },
  Cancelled: { color: 'bg-rose-100 text-black border-rose-300 dark:bg-slate-900 dark:text-white dark:border-rose-700', dotColor: 'text-rose-500', label: 'Cancelled', progress: 0 },
  Failed: { color: 'bg-red-100 text-black border-red-300 dark:bg-slate-900 dark:text-white dark:border-red-700', dotColor: 'text-red-500', label: 'Failed', progress: 0 },
};

function getStatusConfig(status: string): { color: string; dotColor: string; label: string; progress: number } {
  if (!status) {
    return STATUS_CONFIGS['Pending'];
  }
  const normalized = status.toLowerCase().trim();
  if (normalized === 'received' || normalized === 'order placed') return STATUS_CONFIGS['Order Placed'];
  if (normalized === 'pending') return STATUS_CONFIGS['Pending'];
  if (normalized === 'confirmed') return STATUS_CONFIGS['Confirmed'];
  if (normalized === 'preparing') return STATUS_CONFIGS['Preparing'];
  if (normalized === 'picked up' || normalized === 'pickedup') return STATUS_CONFIGS['Picked Up'];
  if (normalized === 'on the way' || normalized === 'ontheway') return STATUS_CONFIGS['On The Way'];
  if (normalized === 'delivered') return STATUS_CONFIGS['Delivered'];
  if (normalized === 'cancelled' || normalized === 'canceled') return STATUS_CONFIGS['Cancelled'];
  if (normalized === 'failed') return STATUS_CONFIGS['Failed'];

  return STATUS_CONFIGS[status] || {
    color: 'bg-slate-100 text-black border-slate-300 dark:bg-slate-900 dark:text-white dark:border-slate-700',
    dotColor: 'text-slate-500',
    label: status,
    progress: 0,
  };
}

function getStatusBadgeStyle(status: string, isDark: boolean) {
  const cfg = getStatusConfig(status);
  if (isDark) {
    return {
      className: 'bg-slate-900 text-white border-slate-700',
      dotColor: cfg.dotColor,
      label: cfg.label,
      progress: cfg.progress,
    };
  }

  let lightBg = 'bg-slate-100 text-black border-slate-300';
  const norm = (status || '').toLowerCase().trim();

  if (norm === 'received' || norm === 'order placed' || norm === 'pending') {
    lightBg = 'bg-amber-100 text-black border-amber-300';
  } else if (norm === 'confirmed') {
    lightBg = 'bg-sky-100 text-black border-sky-300';
  } else if (norm === 'preparing') {
    lightBg = 'bg-indigo-100 text-black border-indigo-300';
  } else if (norm === 'picked up' || norm === 'pickedup') {
    lightBg = 'bg-purple-100 text-black border-purple-300';
  } else if (norm === 'on the way' || norm === 'ontheway') {
    lightBg = 'bg-orange-100 text-black border-orange-300';
  } else if (norm === 'delivered') {
    lightBg = 'bg-emerald-100 text-black border-emerald-300';
  } else if (norm === 'cancelled' || norm === 'canceled' || norm === 'failed') {
    lightBg = 'bg-rose-100 text-black border-rose-300';
  }

  return {
    className: lightBg,
    dotColor: cfg.dotColor,
    label: cfg.label,
    progress: cfg.progress,
  };
}

/**
 * Opens WhatsApp chat via +255757449734 with pre-filled order details
 * Modeled directly after Flutter client contactUs.dart
 */
export function openWhatsAppSupport(orderId?: string, storeName?: string) {
  const phone = '255757449734';
  const orderRef = orderId ? `#${orderId.slice(-8).toUpperCase()}` : '';
  const storeRef = storeName ? ` from ${storeName}` : '';
  const message = `Hey!, I need your help with my Tulete order${orderRef}${storeRef}`;
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

/**
 * Parses a combined laundry order name string into individual laundry items
 * e.g. "Suit (Iron, VIP) x2, Shirt (Wash) x3 [EXPRESS SERVICE]"
 * Modeled directly after Flutter client parseLaundryItems
 */
export function parseLaundryItems(nameField: string) {
  const items: { name: string; qty: number; services: string[] }[] = [];
  if (!nameField) return { items, isExpress: false };

  const isExpress = nameField.toUpperCase().includes('[EXPRESS SERVICE]');
  const cleanName = nameField.replace(/\s*\[EXPRESS SERVICE\]/gi, '');
  
  let depth = 0;
  let current = '';
  const parts: string[] = [];
  for (let i = 0; i < cleanName.length; i++) {
    const char = cleanName[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      if (i + 1 < cleanName.length && cleanName[i + 1] === ' ') i++;
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const qtyMatch = trimmed.match(/x(\d+)$/i);
    let qty = 1;
    let nameAndServices = trimmed;
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1], 10) || 1;
      nameAndServices = trimmed.substring(0, qtyMatch.index).trim();
    }

    const servicesMatch = nameAndServices.match(/\(([^)]+)\)/);
    let services: string[] = [];
    let itemName = nameAndServices;
    if (servicesMatch) {
      services = servicesMatch[1].split(',').map(s => s.trim());
      itemName = nameAndServices.substring(0, servicesMatch.index).trim();
    }

    items.push({
      name: itemName || 'Laundry Item',
      qty,
      services,
    });
  }

  return { items, isExpress };
}

/**
 * Determines whether an order is eligible for cancellation.
 * An order can be cancelled if:
 * 1. Its status is active (not already Cancelled, Delivered, or Failed).
 * 2. Less than 30 minutes have elapsed since the order was placed.
 */
function isOrderCancelable(order: Order): boolean {
  if (['Cancelled', 'Delivered', 'Failed'].includes(order.status)) {
    return false;
  }

  let orderTimeMs = 0;
  if (order.createdAt?.seconds) {
    orderTimeMs = order.createdAt.seconds * 1000;
  } else if ((order as any).createdAt?.toDate) {
    orderTimeMs = (order as any).createdAt.toDate().getTime();
  } else if (order.createdAt) {
    const parsed = new Date(order.createdAt).getTime();
    if (!isNaN(parsed)) orderTimeMs = parsed;
  } else if ((order as any).time) {
    const parsed = new Date((order as any).time).getTime();
    if (!isNaN(parsed)) orderTimeMs = parsed;
  }

  if (!orderTimeMs) return true;

  const thirtyMinutesMs = 30 * 60 * 1000;
  const elapsedMs = Date.now() - orderTimeMs;

  return elapsedMs < thirtyMinutesMs;
}

export type OrderType = 'laundry' | 'product' | 'food' | 'pickup';

export function getOrderCategoryDetails(order: Order): {
  type: OrderType;
  badgeLabel: string;
  badgeEmoji: string;
  badgeClass: string;
} {
  const catName = (order as any).cat || (order as any).category || '';
  const catStr = String(catName).trim();
  const catLower = catStr.toLowerCase();

  const deliveryTime = String((order as any).deliverytime || '').trim().toLowerCase();

  // Item-level categories
  const itemCats = (order.items || []).map(i => String(i.cat || (i as any).category || '').toLowerCase().trim());

  // 1. LAUNDRY
  const isLaundry = 
    catStr === 'nguo' || 
    catLower.includes('nguo') || 
    catLower.includes('laund') || 
    Boolean(order.isLaundryOrder) ||
    itemCats.some(c => c === 'nguo' || c.includes('laund'));

  if (isLaundry) {
    return {
      type: 'laundry',
      badgeLabel: 'Laundry Pack',
      badgeEmoji: '✨',
      badgeClass: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    };
  }

  // 2. PICKUP
  const isPickup = deliveryTime === 'pickup' || (order as any).packagepickup === true;

  // 3. FOOD
  const foodKeywords = ['food', 'chakula', 'diko', 'restaurant', 'meal', 'lunch', 'dinner', 'asap', 'mchana', 'usiku'];
  const isExplicitFoodCat = foodKeywords.includes(catLower);
  const isFoodDeliveryTime = ['asap', 'lunch', 'dinner', 'mchana', 'usiku'].includes(deliveryTime);
  const hasFoodItem = itemCats.some(c => foodKeywords.includes(c));

  const isFood = isExplicitFoodCat || isFoodDeliveryTime || hasFoodItem;

  // 4. PRODUCT
  const productKeywords = ['product', 'bidhaa', 'electronics', 'supermarket', 'groceries', 'pharmacy', 'cosmetics', 'beauty', 'fashion', 'hardware', 'general', 'store'];
  const isExplicitProductCat = productKeywords.includes(catLower) || catLower === 'product';
  const isProductDeliveryTime = deliveryTime === 'product';
  const hasProductItem = itemCats.some(c => productKeywords.includes(c) || c === 'product');

  const isProduct = isExplicitProductCat || isProductDeliveryTime || hasProductItem;

  if (isPickup) {
    return {
      type: 'pickup',
      badgeLabel: 'Pickup Order',
      badgeEmoji: '📦',
      badgeClass: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };
  }

  if (isProduct && !isExplicitFoodCat && !isFoodDeliveryTime) {
    return {
      type: 'product',
      badgeLabel: 'Product Order',
      badgeEmoji: '🛍️',
      badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    };
  }

  if (isFood) {
    return {
      type: 'food',
      badgeLabel: 'Food Order',
      badgeEmoji: '🍕',
      badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    };
  }

  // Default fallback: treat non-food, non-laundry orders as Product Order
  return {
    type: 'product',
    badgeLabel: 'Product Order',
    badgeEmoji: '🛍️',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };
}

export const OrdersPage = () => {
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const { orders, isLoading } = useOrderListRealtime();
  const { addToCart } = useCartStore();

  const [, setNow] = React.useState(Date.now());

  // Periodically refresh current time every 30 seconds so 30-minute cancel window updates live
  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [supportOrder, setSupportOrder] = useState<Order | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const getOrderStatusGroup = (status: string): 'active' | 'completed' | 'cancelled' => {
    switch (status) {
      case 'Delivered':
        return 'completed';
      case 'Cancelled':
      case 'Failed':
        return 'cancelled';
      default:
        return 'active';
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancellingId(orderId);
    try {
      await orderService.cancelOrder(orderId);
    } catch (err) {
      console.error('Failed to cancel order:', err);
      alert('Could not cancel the order. Please try again or contact support.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReorder = (order: Order) => {
    (order.items || []).forEach((item) => {
      addToCart({
        productId: item.productId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        storeId: order.storeId,
        storeName: order.storeName,
      });
    });
    navigate('/cart');
  };

  // Filtering
  const filteredOrders = orders.filter((order) => {
    const tabMatch = getOrderStatusGroup(order.status) === activeTab;
    const orderIdStr = (order.id || '').toLowerCase();
    const storeNameStr = (order.storeName || '').toLowerCase();
    const queryStr = searchQuery.toLowerCase();
    const searchMatch = orderIdStr.includes(queryStr) || storeNameStr.includes(queryStr);
    return tabMatch && searchMatch;
  });

  return (
    <PageContainer>
      <ContentContainer size="md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">Your Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your service and delivery requests.</p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by store or ID..."
            className="pl-9 bg-card border-border focus-visible:ring-primary focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6 mb-6">
        {(['active', 'completed', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-semibold text-sm capitalize relative transition-all ${
              activeTab === tab 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab} Requests
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTabIndicator" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Loading States */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 border border-border animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-4"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        /* No Order yet component */
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 px-6 bg-card rounded-3xl border border-border shadow-sm my-4"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5 text-primary">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">No Order yet</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8 leading-relaxed">
            You haven't placed any orders yet. Discover top local stores and services around you and get started today!
          </p>
          <Button onClick={() => navigate('/stores')} size="lg" className="rounded-full px-8 font-extrabold shadow-md hover:shadow-lg">
            Discover Stores <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      ) : filteredOrders.length === 0 ? (
        /* Empty Tab / Search State */
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 px-4 bg-muted/50 rounded-2xl border border-border"
        >
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No Orders Found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
            We couldn't find any orders in the "{activeTab}" tab.
          </p>
          <Button onClick={() => navigate('/stores')}>Discover Stores</Button>
        </motion.div>
      ) : (
        /* Order Cards */
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => {
              const statusCfg = getStatusBadgeStyle(order.status, isDark);
              const dateStr = order.createdAt?.seconds 
                ? new Date(order.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

              const categoryDetails = getOrderCategoryDetails(order);
              const isLaundry = categoryDetails.type === 'laundry';
              const isFood = categoryDetails.type === 'food';
              const isExpanded = !!expandedOrders[order.id];

              // Parse laundry items if this is a laundry order pack
              const laundryNameField = (order as any).name || (order.items || []).map(i => i.name).join(', ');
              const { items: laundryBreakdown, isExpress } = parseLaundryItems(laundryNameField);

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="p-6 border border-border hover:border-slate-200 dark:hover:border-slate-700 bg-card shadow-sm hover:shadow-md transition-all">
                    {/* Header: Use actual store name without Dobi/Diko hardcoded categorization */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-muted-foreground">Order ID: #{order.id.slice(-8).toUpperCase()}</span>
                          <Badge className={`${categoryDetails.badgeClass} text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1`}>
                            {isLaundry && <Sparkles className="w-3 h-3" />}
                            {categoryDetails.badgeEmoji} {categoryDetails.badgeLabel}
                          </Badge>
                          {isExpress && (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                              ⚡ Express
                            </Badge>
                          )}
                        </div>

                        {/* Actual store or service provider name */}
                        <h3 className="notranslate font-extrabold text-foreground text-lg flex items-center gap-2" translate="no">
                          {order.storeName || 'Tulete Service'}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`${statusCfg.className} font-extrabold px-3 py-1 rounded-full text-xs shadow-2xs border inline-flex items-center gap-1.5 shrink-0`}>
                          <span className={`w-2 h-2 rounded-full bg-current ${statusCfg.dotColor} animate-pulse shrink-0`} />
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar (Only for active orders) */}
                    {activeTab === 'active' && statusCfg.progress > 0 && (
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-5">
                        <motion.div 
                          className="bg-primary h-full rounded-full" 
                          initial={{ width: 0 }}
                          animate={{ width: `${statusCfg.progress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    )}

                    {/* LAUNDRY ITEM BREAKDOWN LIST (Only for Laundry Orders cat === "Nguo") */}
                    {isLaundry && laundryBreakdown.length > 0 ? (
                      <div className="bg-muted/50 border border-border/70 rounded-2xl p-4 mb-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Shirt className="w-4 h-4 text-sky-500" /> Item Breakdown ({laundryBreakdown.reduce((acc, i) => acc + i.qty, 0)} items)
                          </span>
                          {laundryBreakdown.length > 4 && (
                            <button
                              onClick={() => toggleExpand(order.id)}
                              className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1"
                            >
                              {isExpanded ? 'Hide' : 'Show All'}
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(isExpanded ? laundryBreakdown : laundryBreakdown.slice(0, 4)).map((item, idx) => (
                            <div key={idx} className="bg-card border border-border/50 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-500 font-extrabold text-xs flex items-center justify-center shrink-0">
                                  ×{item.qty}
                                </span>
                                <span className="notranslate font-bold text-xs text-foreground" translate="no">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap justify-end">
                                {item.services.map((srv, sIdx) => (
                                  <span key={sIdx} className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                                    {srv}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Non-laundry item summary: Food and Product items treated independently */
                      <div className="bg-muted/40 border border-border/50 rounded-2xl p-3.5 mb-4 space-y-2">
                        {(order.items || []).map((i, idx) => {
                          const rawItemCat = String(i.cat || (i as any).category || '').toLowerCase().trim();
                          const isItemFood = ['food', 'chakula', 'diko', 'restaurant', 'meal', 'lunch', 'dinner', 'asap', 'mchana', 'usiku'].includes(rawItemCat) || (isFood && !['product', 'bidhaa', 'electronics', 'supermarket', 'groceries', 'pharmacy', 'cosmetics', 'beauty', 'fashion', 'hardware', 'general', 'store'].includes(rawItemCat));
                          const itemEmoji = isItemFood ? '🍕 Food Item' : '🛍️ Product Item';

                          return (
                            <div key={idx} className="flex items-center justify-between text-xs bg-card border border-border/40 p-2.5 rounded-xl shadow-2xs">
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="notranslate font-bold text-foreground truncate" translate="no">{i.name}</span>
                                <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                  {itemEmoji} • Qty: {i.quantity}
                                </span>
                              </div>
                              <span className="font-extrabold text-foreground shrink-0">{formatPrice(i.price * i.quantity)} {APP_SETTINGS.currency}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Items Info Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-b border-border py-3 mb-4 gap-4">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dateStr}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {(order.items || []).reduce((sum, i) => sum + i.quantity, 0)} {(order.items || []).reduce((sum, i) => sum + i.quantity, 0) === 1 ? 'item' : 'items'}
                        </div>
                      </div>

                      <div className="font-bold text-foreground text-base">
                        {formatPrice(order.totalAmount)} {APP_SETTINGS.currency}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isOrderCancelable(order) && (
                          <Button
                            variant="ghost"
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={cancellingId === order.id}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold disabled:opacity-60"
                          >
                            <XCircle className="w-4 h-4 mr-1.5" />
                            {cancellingId === order.id ? 'Cancelling…' : 'Cancel Order'}
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => openWhatsAppSupport(order.id, order.storeName)}
                          className="px-3.5 py-2 rounded-xl text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 hover:text-emerald-700 dark:hover:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          WhatsApp Support
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeTab === 'active' ? (
                          <Button
                            onClick={() => navigate(`/tracking/${order.id}?hideProgress=true`, { state: { hideProgress: true } })}
                            size="sm"
                            className="font-bold text-xs shadow-md hover:shadow-lg flex items-center gap-1 group"
                          >
                            Track Live
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleReorder(order)}
                            size="sm"
                            variant="secondary"
                            className="font-bold text-xs flex items-center gap-1 hover:bg-accent"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reorder
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Support Dialog */}
      {supportOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 text-emerald-500">
              <MessageCircle className="w-6 h-6 animate-bounce" />
            </div>
            <h3 className="text-lg font-extrabold text-foreground mb-2">Tulete WhatsApp Support</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Need assistance with your order <strong>#{supportOrder.id.slice(-8).toUpperCase()}</strong>? Chat directly with our team on WhatsApp (+255 757 449 734).
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  openWhatsAppSupport(supportOrder.id, supportOrder.storeName);
                  setSupportOrder(null);
                }}
                className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm shadow-sm transition-all"
              >
                <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => setSupportOrder(null)}
                className="w-full py-2.5 font-bold text-xs"
              >
                Close Window
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      </ContentContainer>
    </PageContainer>
  );
};
