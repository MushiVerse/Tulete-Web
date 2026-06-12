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
  RotateCcw, AlertCircle, Phone, XCircle, ArrowRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';

const STATUS_CONFIGS: Record<OrderStatus, { color: string; label: string; progress: number }> = {
  Pending: { color: 'bg-amber-500 text-white', label: 'Pending', progress: 15 },
  Confirmed: { color: 'bg-blue-500 text-white', label: 'Confirmed', progress: 30 },
  Preparing: { color: 'bg-indigo-500 text-white', label: 'Preparing', progress: 50 },
  'Picked Up': { color: 'bg-purple-500 text-white', label: 'Picked Up', progress: 70 },
  'On The Way': { color: 'bg-pink-500 text-white', label: 'On The Way', progress: 85 },
  Delivered: { color: 'bg-emerald-500 text-white', label: 'Delivered', progress: 100 },
  Cancelled: { color: 'bg-rose-500 text-white', label: 'Cancelled', progress: 0 },
  Failed: { color: 'bg-red-500 text-white', label: 'Failed', progress: 0 },
};

export const OrdersPage = () => {
  const navigate = useNavigate();
  const { orders, isLoading } = useOrderListRealtime();
  const { addToCart } = useCartStore();

  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [supportOrder, setSupportOrder] = useState<Order | null>(null);

  const getOrderStatusGroup = (status: OrderStatus): 'active' | 'completed' | 'cancelled' => {
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
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await orderService.update(orderId, { status: 'Cancelled' });
        // We also want to cancel the tracking document
        // Our Firestore listener will automatically update the UI!
      } catch (err) {
        console.error('Failed to cancel order:', err);
      }
    }
  };

  const handleReorder = (order: Order) => {
    order.items.forEach((item) => {
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
    const searchMatch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.storeName.toLowerCase().includes(searchQuery.toLowerCase());
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
      ) : filteredOrders.length === 0 ? (
        /* Empty State */
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 px-4 bg-muted rounded-2xl border border-border"
        >
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No Orders Found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
            We couldn't find any orders in the "{activeTab}" tab. Let's make your first request today!
          </p>
          <Button onClick={() => navigate('/discover')}>Discover Stores</Button>
        </motion.div>
      ) : (
        /* Order Cards */
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => {
              const statusCfg = STATUS_CONFIGS[order.status] || { color: 'bg-slate-400', label: order.status, progress: 0 };
              const dateStr = order.createdAt?.seconds 
                ? new Date(order.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

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
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-muted-foreground block">Order ID: #{order.id.slice(-8).toUpperCase()}</span>
                        <h3 className="font-extrabold text-foreground text-lg">{order.storeName}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={`${statusCfg.color} font-bold px-2.5 py-0.5 rounded-full text-xs shadow-sm border-0`}>
                          {statusCfg.label}
                        </Badge>
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

                    {/* Items Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-b border-border py-3 mb-4 gap-4">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dateStr}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {order.items.reduce((sum, i) => sum + i.quantity, 0)} {order.items.reduce((sum, i) => sum + i.quantity, 0) === 1 ? 'item' : 'items'}
                        </div>
                      </div>

                      <div className="font-bold text-foreground text-base">
                        {order.totalAmount.toLocaleString()} {APP_SETTINGS.currency}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {order.status === 'Pending' && (
                          <Button
                            variant="ghost"
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold"
                          >
                            <XCircle className="w-4 h-4 mr-1.5" />
                            Cancel Request
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          onClick={() => setSupportOrder(order)}
                          className="text-foreground hover:bg-accent text-xs font-semibold"
                        >
                          <Phone className="w-4 h-4 mr-1.5" />
                          Support
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeTab === 'active' ? (
                          <Button
                            onClick={() => navigate(`/tracking/${order.id}`)}
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
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Phone className="w-6 h-6 text-primary animate-bounce" />
            </div>
            <h3 className="text-lg font-extrabold text-foreground mb-2">Contact Tulete Support</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Need assistance with your order from <strong>{supportOrder.storeName}</strong>? Select an action below to connect.
            </p>
            <div className="space-y-2">
              <a 
                href="tel:+254712345678" 
                className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/95 text-white font-bold py-2.5 rounded-lg text-sm shadow-sm transition-all"
              >
                Call Hotline
              </a>
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
