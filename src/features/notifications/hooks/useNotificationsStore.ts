import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notificationService, AppNotification } from '../services/notificationService';

interface NotificationsStore {
  notifications: AppNotification[];
  initialized: boolean;

  initialize: (userId: string) => void;
  markRead: (notifId: string) => void;
  markAllRead: () => void;
  dismiss: (notifId: string) => void;
  getUnreadCount: () => number;
}

export const useNotificationsStore = create<NotificationsStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      initialized: false,

      initialize: (userId) => {
        if (get().initialized) return;
        const mock = notificationService.getMockNotifications(userId);
        set({ notifications: mock, initialized: true });
      },

      markRead: (notifId) => {
        const updated = get().notifications.map((n) =>
          n.id === notifId ? { ...n, isRead: true } : n
        );
        set({ notifications: updated });
      },

      markAllRead: () => {
        const updated = get().notifications.map((n) => ({ ...n, isRead: true }));
        set({ notifications: updated });
      },

      dismiss: (notifId) => {
        set({ notifications: get().notifications.filter((n) => n.id !== notifId) });
      },

      getUnreadCount: () => get().notifications.filter((n) => !n.isRead).length,
    }),
    { name: 'tulete_notifications_storage' }
  )
);
