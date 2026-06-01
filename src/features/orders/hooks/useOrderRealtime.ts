import { useState, useEffect } from 'react';
import { orderService, Order, OrderTracking } from '../services/orderService';
import { useAuthStore } from '../../../core/auth/useAuthStore';

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
