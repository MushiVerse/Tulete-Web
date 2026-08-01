import { useState, useEffect } from 'react';
import { orderService, Order, OrderTracking } from '../services/orderService';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { db } from '../../../core/firebase/config';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';

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
    // Safety fallback timer so loading state never hangs indefinitely
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 4000);

    const unsubscribe = orderService.subscribeToUserOrders(
      user.id,
      (fetchedOrders) => {
        clearTimeout(timer);
        setOrders(fetchedOrders);
        setIsLoading(false);
      },
      (err) => {
        clearTimeout(timer);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
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
    if (!webOrderId) {
      setLiveItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let itemsFromQuery: any[] = [];
    let itemFromDoc: any = null;

    const updateMerged = () => {
      const mergedMap = new Map<string, any>();
      itemsFromQuery.forEach((i) => mergedMap.set(i.id, i));
      if (itemFromDoc && !mergedMap.has(itemFromDoc.id)) {
        mergedMap.set(itemFromDoc.id, itemFromDoc);
      }
      setLiveItems(Array.from(mergedMap.values()));
      setIsLoading(false);
    };

    // 1. Query by webOrderId
    const q = query(
      collection(db, 'newcomfirmedorders'),
      where('webOrderId', '==', webOrderId)
    );

    const unsubQuery = onSnapshot(q, (snapshot) => {
      itemsFromQuery = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      updateMerged();
    }, (err) => {
      console.error('Error fetching live flutter orders query:', err);
      setIsLoading(false);
    });

    // 2. Direct document listener by doc ID
    const docRef = doc(db, 'newcomfirmedorders', webOrderId);
    const unsubDoc = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        itemFromDoc = { id: docSnap.id, ...docSnap.data() };
      } else {
        itemFromDoc = null;
      }
      updateMerged();
    }, (err) => {
      console.error('Error fetching live flutter order doc:', err);
      setIsLoading(false);
    });

    return () => {
      unsubQuery();
      unsubDoc();
    };
  }, [userId, webOrderId]);

  return { liveItems, isLoading };
};
