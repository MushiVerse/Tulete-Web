import { useState, useEffect } from 'react';
import { db } from '../../../core/firebase/config';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, setDoc 
} from 'firebase/firestore';
import { useAuthStore } from '../../../core/auth/useAuthStore';

export interface FirebaseOrderNotification {
  id: string;
  orderId: string;
  storeName: string;
  itemName: string;
  status: string;
  ordersts: string[];
  orderststime: string[];
  isRead: boolean;
  time?: string;
  total: number;
  cat?: string;
  imgUrl?: string;
  deepLink: string;
  createdAt: Date;
}

export const useNotificationsRealtime = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<FirebaseOrderNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const ordersRef = collection(db, 'newcomfirmedorders');
    const q = query(
      ordersRef,
      where('uid', '==', user.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: FirebaseOrderNotification[] = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();

          // Check if show is false (boolean false or string "false") or if order is cancelled
          const isShowFalse = data.show === false || String(data.show).toLowerCase() === 'false' || data.cancel === true;
          const isShowTrue = data.show === true || String(data.show).toLowerCase() === 'true';

          // If order is completed / hidden from active order list (show === false or "false"),
          // set notiOpened to true in Firestore so unopened notifications don't linger, and exclude from active notifications
          if (isShowFalse) {
            if (data.notiOpened !== true) {
              updateDoc(docSnap.ref, { notiOpened: true }).catch(() => {});
            }
            return;
          }

          // Skip if show is explicitly set to anything other than true
          if (data.show !== undefined && !isShowTrue) {
            return;
          }

          const ordersts: string[] = Array.isArray(data.ordersts) ? data.ordersts : [];
          const orderststime: string[] = Array.isArray(data.orderststime) ? data.orderststime : [];

          // Mirror Flutter Orders.dart notification criteria
          const hasNotiOpenedField = Object.prototype.hasOwnProperty.call(data, 'notiOpened');
          const hasNotification =
            hasNotiOpenedField ||
            ordersts.length > 1 ||
            (ordersts.length > 0 && ordersts.some((s: any) => String(s) !== 'Order Placed'));

          if (hasNotification) {
            const isRead = data.notiOpened === true;
            
            // Parse time
            let createdAtDate = new Date();
            if (data.time) {
              const p = new Date(data.time).getTime();
              if (!isNaN(p)) createdAtDate = new Date(p);
            } else if (orderststime.length > 0) {
              const p = new Date(orderststime[orderststime.length - 1]).getTime();
              if (!isNaN(p)) createdAtDate = new Date(p);
            }

            list.push({
              id: docSnap.id,
              orderId: docSnap.id,
              storeName: data.store || 'Tulete Store',
              itemName: data.name || 'Order Item',
              status: data.status || (ordersts.length > 0 ? ordersts[ordersts.length - 1] : 'Order Placed'),
              ordersts,
              orderststime,
              isRead,
              time: data.time,
              total: Math.round(data.total || 0),
              cat: data.cat,
              imgUrl: data.imgURL || data.imgUrl,
              deepLink: `/tracking/${docSnap.id}`,
              createdAt: createdAtDate,
            });
          }
        });

        // Sort descending by date
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setNotifications(list);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error in realtime notifications snapshot:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  const markAsRead = async (orderId: string) => {
    try {
      // 1. Update newcomfirmedorders document in Firestore
      const orderDocRef = doc(db, 'newcomfirmedorders', orderId);
      await updateDoc(orderDocRef, { notiOpened: true });

      // 2. Update notifications collection document if present (matching Flutter _hideOrderInFirestore)
      try {
        const notifDocRef = doc(db, 'notifications', orderId);
        await setDoc(notifDocRef, { show: false }, { merge: true });
      } catch (e) {
        // Ignore if document does not exist
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => markAsRead(n.orderId)));
  };

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.isRead).length,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
};
