import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationsStore } from '../hooks/useNotificationsStore';
import { AppNotification, NotificationType } from '../services/notificationService';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import {
  Bell, Package, Truck, MessageSquare, Tag, CreditCard,
  Star, Info, X, CheckCheck, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const notifIcon: Record<NotificationType, React.ReactNode> = {
  order_update: <Package className="w-4 h-4 text-indigo-500" />,
  delivery_update: <Truck className="w-4 h-4 text-emerald-500" />,
  message: <MessageSquare className="w-4 h-4 text-sky-500" />,
  promotion: <Tag className="w-4 h-4 text-amber-500" />,
  payment_confirmed: <CreditCard className="w-4 h-4 text-green-500" />,
  review_reply: <Star className="w-4 h-4 text-yellow-500" />,
  system: <Info className="w-4 h-4 text-slate-400" />,
};

const notifBg: Record<NotificationType, string> = {
  order_update: 'bg-indigo-50 dark:bg-indigo-950/30',
  delivery_update: 'bg-emerald-50 dark:bg-emerald-950/30',
  message: 'bg-sky-50 dark:bg-sky-950/30',
  promotion: 'bg-amber-50 dark:bg-amber-950/30',
  payment_confirmed: 'bg-green-50 dark:bg-green-950/30',
  review_reply: 'bg-yellow-50 dark:bg-yellow-950/30',
  system: 'bg-slate-50 dark:bg-slate-900',
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, initialize, markRead, markAllRead, dismiss, getUnreadCount } =
    useNotificationsStore();

  useEffect(() => {
    initialize('user_current');
  }, [initialize]);

  const unreadCount = getUnreadCount();

  const handleClick = (notif: AppNotification) => {
    markRead(notif.id);
    if (notif.deepLink) navigate(notif.deepLink);
  };

  return (
    <PageWrapper className="py-6 px-4 max-w-2xl mx-auto flex flex-col min-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
            Activity Center
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-3 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary text-white text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-full animate-bounce">
                {unreadCount}
              </Badge>
            )}
          </h1>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            className="text-xs font-bold"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">All Caught Up!</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            No notifications right now. We'll alert you when something needs your attention.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                layout
              >
                <Card
                  className={`relative flex items-start gap-3.5 p-4 border cursor-pointer transition-all group shadow-sm hover:shadow-md ${
                    notif.isRead
                      ? 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                      : `${notifBg[notif.type]} border-l-4 border-l-primary`
                  }`}
                  onClick={() => handleClick(notif)}
                >
                  {/* Icon */}
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {notifIcon[notif.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-xs font-extrabold leading-snug ${notif.isRead ? 'text-slate-700 dark:text-slate-300' : 'text-slate-950 dark:text-white'}`}>
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                          {notif.body}
                        </p>
                      </div>

                      {/* Dismiss button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded-full transition-all flex-shrink-0"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {timeAgo(notif.createdAt)}
                      </span>

                      {notif.deepLink && (
                        <span className="text-[9px] font-extrabold text-primary flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                          View <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <span className="absolute top-4 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </PageWrapper>
  );
};
