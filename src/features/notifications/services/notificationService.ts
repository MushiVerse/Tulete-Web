import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';
import { APP_SETTINGS } from '@/core/config/settings';

export type NotificationType =
  | 'order_update'
  | 'delivery_update'
  | 'message'
  | 'promotion'
  | 'payment_confirmed'
  | 'review_reply'
  | 'system';

export interface AppNotification extends BaseDocument {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  deepLink?: string; // e.g. '/orders/order_1002'
  imageUrl?: string;
}

class NotificationService extends BaseFirestoreService<AppNotification> {
  constructor() {
    super('notifications');
  }

  getMockNotifications(userId: string): AppNotification[] {
    return [
      {
        id: 'notif_1',
        userId,
        type: 'delivery_update',
        title: '🚴 Mwangi is on the way!',
        body: 'Your Chapati Combo order is 1.2 km from your location. ETA: 6 minutes.',
        isRead: false,
        deepLink: '/tracking/order_1002',
        createdAt: new Date(Date.now() - 1000 * 60 * 2),
        updatedAt: new Date(Date.now() - 1000 * 60 * 2),
      },
      {
        id: 'notif_2',
        userId,
        type: 'order_update',
        title: '✅ Order Confirmed — Mama Safi',
        body: 'Your executive suit ironing service (Order #TL-40398) has been accepted and is being processed.',
        isRead: false,
        deepLink: '/orders',
        createdAt: new Date(Date.now() - 1000 * 60 * 18),
        updatedAt: new Date(Date.now() - 1000 * 60 * 18),
      },
      {
        id: 'notif_3',
        userId,
        type: 'message',
        title: '💬 New Message from Mama Safi Laundry',
        body: 'Hi! Your executive suit is fully pressed and ready for dispatch. Please confirm delivery location.',
        isRead: true,
        deepLink: '/messages/chat/conv_mama_safi',
        createdAt: new Date(Date.now() - 1000 * 60 * 60),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60),
      },
      {
        id: 'notif_4',
        userId,
        type: 'promotion',
        title: '🎉 Weekend Deal — Kibanda Delight',
        body: 'Get 20% off all food combos this Saturday & Sunday! Use promo code: WEEKEND20.',
        isRead: true,
        deepLink: '/stores',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
      },
      {
        id: 'notif_5',
        userId,
        type: 'payment_confirmed',
        title: '💳 M-Pesa Payment Received',
        body: 'Your payment of ${APP_SETTINGS.currency} 1,200 via M-Pesa (ref: NB3478X9) has been confirmed. Order dispatched.',
        isRead: true,
        deepLink: '/orders',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        id: 'notif_6',
        userId,
        type: 'review_reply',
        title: '🌟 Mama Safi replied to your review',
        body: 'Thank you for the feedback! We are so glad you enjoyed the quick turnaround. See you next time!',
        isRead: true,
        deepLink: '/reviews',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
      },
    ];
  }
}

export const notificationService = new NotificationService();
