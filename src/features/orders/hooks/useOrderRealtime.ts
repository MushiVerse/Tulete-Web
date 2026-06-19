import { useState, useEffect } from 'react';
import { orderService, Order, OrderTracking } from '../services/orderService';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { db } from '../../../core/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const useOrderListRealtime = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = orderService.subscribeToUserOrders(user.id, (fetchedOrders) => {
      setOrders(fetchedOrders);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  return { orders, isLoading, error };
};

export const useOrderSingleRealtime = (orderId: string | undefined) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = orderService.subscribeToOrder(orderId, (fetchedOrder) => {
      setOrder(fetchedOrder);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  return { order, isLoading, error };
};

export const useOrderTrackingRealtime = (orderId: string | undefined) => {
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orderId) {
      setTracking(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = orderService.subscribeToTracking(orderId, (fetchedTracking) => {
      setTracking(fetchedTracking);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  return { tracking, isLoading, error };
};

export const useLiveFlutterOrderTracking = (userId: string | undefined, webOrderId: string | undefined) => {
  const [liveItems, setLiveItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !webOrderId) {
      setLiveItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    // Note: This listens to the global newcomfirmedorders collection
    // where the Flutter Admin App makes its live updates.
    const q = query(
      collection(db, 'newcomfirmedorders'),
      where('uid', '==', userId),
      where('webOrderId', '==', webOrderId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveItems(items);
      setIsLoading(false);
    }, (err) => {
      console.error('Error fetching live flutter orders:', err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId, webOrderId]);

  return { liveItems, isLoading };
};
