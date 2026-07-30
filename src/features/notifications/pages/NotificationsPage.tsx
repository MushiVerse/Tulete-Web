import { formatPrice } from '../../../shared/utils/formatPrice';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationsRealtime, FirebaseOrderNotification } from '../hooks/useNotificationsRealtime';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { 
  Bell, Package, Truck, CheckCheck, ChevronRight, 
  Sparkles, Clock, MapPin, ChevronDown, ChevronUp 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotificationsRealtime();
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNotificationClick = async (notif: FirebaseOrderNotification) => {
    await markAsRead(notif.orderId);
    navigate(notif.deepLink);
  };

  return (
    <PageContainer>
      <ContentContainer size="sm" className="flex flex-col min-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
              Activity Center
            </span>
            <h1 className="text-2xl font-extrabold text-foreground mt-3 flex items-center gap-2">
              Order Notifications
              {unreadCount > 0 && (
                <Badge className="bg-primary text-white text-xs font-extrabold px-2 py-0.5 rounded-full animate-bounce">
                  {unreadCount} New
                </Badge>
              )}
            </h1>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs font-bold rounded-full"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 border border-border animate-pulse flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3 rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          /* Empty Notifications State */
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-card border border-border/80 rounded-3xl my-4 shadow-sm"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
              <Bell className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">No notifications yet!</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-6">
              When your order status updates (e.g. Confirmed, Preparing, Picked Up, Delivered), alerts will appear right here.
            </p>
            <Button onClick={() => navigate('/orders')} size="sm" className="rounded-full px-6 font-bold">
              View Your Orders
            </Button>
          </motion.div>
        ) : (
          /* Real-time Order Notifications List */
          <div className="space-y-3">
            <AnimatePresence>
              {notifications.map((notif) => {
                const isExpanded = !!expandedIds[notif.id];

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    layout
                  >
                    <Card
                      className={`relative p-4 border cursor-pointer transition-all group shadow-sm hover:shadow-md ${
                        !notif.isRead
                          ? 'border-primary/40 bg-primary/5 border-l-4 border-l-primary'
                          : 'border-border bg-card'
                      }`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Icon */}
                        <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                          !notif.isRead ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {notif.status === 'Delivered' ? (
                            <CheckCheck className="w-5 h-5" />
                          ) : notif.status === 'On The Way' || notif.status === 'Picked Up' ? (
                            <Truck className="w-5 h-5 animate-pulse" />
                          ) : (
                            <Package className="w-5 h-5" />
                          )}
                        </div>

                        {/* Content Header */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                #{notif.orderId.slice(-8).toUpperCase()}
                              </span>
                              {!notif.isRead && (
                                <Badge className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase shadow-xs">
                                  NEW
                                </Badge>
                              )}
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                                {notif.status}
                              </Badge>
                            </div>

                            <span className="text-[10px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {timeAgo(notif.createdAt)}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-sm text-foreground truncate">
                            {notif.storeName}
                          </h3>

                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 font-medium">
                            {notif.itemName} • Total: {formatPrice(notif.total)} {APP_SETTINGS.currency}
                          </p>

                          {/* Stepper Timeline Preview (if multiple status updates exist) */}
                          {notif.ordersts.length > 1 && (
                            <div className="mt-3 pt-2 border-t border-border/50">
                              <button
                                type="button"
                                onClick={(e) => toggleExpand(notif.id, e)}
                                className="text-[11px] font-extrabold text-primary hover:underline flex items-center gap-1"
                              >
                                {isExpanded ? 'Hide Status History' : `View Status History (${notif.ordersts.length} updates)`}
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              {isExpanded && (
                                <div className="mt-2.5 space-y-2 pl-2 border-l-2 border-primary/30 text-xs">
                                  {notif.ordersts.map((sts, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[11px]">
                                      <span className={`font-bold ${idx === notif.ordersts.length - 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {sts}
                                      </span>
                                      {notif.orderststime[idx] && (
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          {notif.orderststime[idx].slice(11, 16)}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40 text-[11px]">
                            <span className="text-muted-foreground font-semibold flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-primary" /> Track live delivery progress
                            </span>
                            <span className="font-extrabold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                              Track Order <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </ContentContainer>
    </PageContainer>
  );
};
