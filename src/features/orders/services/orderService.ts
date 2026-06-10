import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';
import { doc, onSnapshot, query, collection, where, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';

export type OrderStatus = 
  | 'Pending'
  | 'Confirmed'
  | 'Preparing'
  | 'Picked Up'
  | 'On The Way'
  | 'Delivered'
  | 'Cancelled'
  | 'Failed';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  cat?: string;
}

export interface OrderLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface Order extends BaseDocument {
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  storeId: string;
  storeName: string;
  deliveryLocation: OrderLocation;
  paymentMethod: 'M-Pesa' | 'Cash';
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  contactPhone?: string;
  no?: string; // Legacy field for Flutter backward compatibility
  notes?: string;
  // Laundry-specific fields (mirrors Flutter reorder.dart / cartsHome.dart)
  isLaundryOrder?: boolean;
  irondelivery?: boolean;    // Iron after washing
  packagepickup?: boolean;   // Package & pickup service
  express?: boolean;         // Express 24h turnaround
  deliverytime?: string;     // Preferred pickup date/time
  instructions?: string;     // Special garment instructions
  createdAt: any;
  updatedAt: any;
}

export interface DriverLocation {
  lat: number;
  lng: number;
  bearing?: number;
}

export interface OrderTracking extends BaseDocument {
  orderId: string;
  status: OrderStatus;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverLocation?: DriverLocation;
  estimatedDeliveryTime?: any; // Firestore Timestamp
  routePoints?: { lat: number; lng: number }[];
  updatedAt: any;
}

class OrderService extends BaseFirestoreService<Order> {
  constructor() {
    super('orders');
  }

  /**
   * Subscribe to real-time updates for a single order
   */
  subscribeToOrder(orderId: string, callback: (order: Order | null) => void): () => void {
    const docRef = doc(db, 'orders', orderId);
    return onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        callback(null);
      } else {
        callback({ id: docSnap.id, ...docSnap.data() } as Order);
      }
    }, (error) => {
      console.error(`Error subscribing to order ${orderId}:`, error);
    });
  }

  /**
   * Subscribe to real-time updates for user orders list
   */
  subscribeToUserOrders(userId: string, callback: (orders: Order[]) => void): () => void {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Order[];
      callback(orders);
    }, (error) => {
      console.error(`Error subscribing to user orders for ${userId}:`, error);
    });
  }

  /**
   * Subscribe to real-time updates for a single order's tracking information
   */
  subscribeToTracking(orderId: string, callback: (tracking: OrderTracking | null) => void): () => void {
    const docRef = doc(db, 'tracking', orderId); // tracking document shares the orderId
    return onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        callback(null);
      } else {
        callback({ id: docSnap.id, ...docSnap.data() } as OrderTracking);
      }
    }, (error) => {
      console.error(`Error subscribing to tracking ${orderId}:`, error);
    });
  }

  /**
   * Simulate a background driver/order progress simulation.
   * This is run locally on checkout to mimic driver picking up and moving in real-time,
   * updating Firestore so that multiple browser tabs or anyone listening gets actual live updates.
   */
  simulateOrderLifecycle(orderId: string, storeLocation: { lat: number; lng: number }, deliveryLocation: { lat: number; lng: number }) {
    const trackingRef = doc(db, 'tracking', orderId);
    const orderRef = doc(db, 'orders', orderId);

    // Initial tracking payload
    const initialTracking: Omit<OrderTracking, 'id'> = {
      orderId,
      status: 'Pending',
      updatedAt: serverTimestamp(),
    };

    setDoc(trackingRef, initialTracking).then(() => {
      const steps: { status: OrderStatus; delay: number }[] = [
        { status: 'Confirmed', delay: 4000 },
        { status: 'Preparing', delay: 8000 },
        { status: 'Picked Up', delay: 14000 },
        { status: 'On The Way', delay: 18000 },
        { status: 'Delivered', delay: 35000 },
      ];

      // Route points between store and user (simple straight-line path interpolation for demo)
      const generateRoutePoints = (start: typeof storeLocation, end: typeof deliveryLocation, count = 20) => {
        const points = [];
        for (let i = 0; i <= count; i++) {
          const t = i / count;
          points.push({
            lat: start.lat + (end.lat - start.lat) * t,
            lng: start.lng + (end.lng - start.lng) * t,
          });
        }
        return points;
      };

      const routePoints = generateRoutePoints(storeLocation, deliveryLocation, 20);

      steps.forEach((step) => {
        setTimeout(async () => {
          try {
            const updates: Partial<Order> = { status: step.status };
            
            // Check if cancelled before applying next status
            // (We can read from local snapshot or DB if needed, but simple update is fine for mock)
            await setDoc(orderRef, updates, { merge: true });

            const trackingUpdates: Partial<OrderTracking> = {
              status: step.status,
              updatedAt: serverTimestamp(),
            };

            if (step.status === 'Picked Up') {
              trackingUpdates.driverId = 'driver_101';
              trackingUpdates.driverName = 'Mwangi Kamau';
              trackingUpdates.driverPhone = '+254712345678';
              trackingUpdates.driverLocation = {
                lat: storeLocation.lat,
                lng: storeLocation.lng,
                bearing: 90,
              };
            }

            if (step.status === 'On The Way') {
              trackingUpdates.estimatedDeliveryTime = new Date(Date.now() + 15 * 60000); // 15 mins
              trackingUpdates.routePoints = routePoints;

              // Animate driver along route points
              let pointIndex = 0;
              const interval = setInterval(async () => {
                if (pointIndex >= routePoints.length) {
                  clearInterval(interval);
                  return;
                }
                const pt = routePoints[pointIndex];
                const prevPt = pointIndex > 0 ? routePoints[pointIndex - 1] : pt;
                // Calculate bearing
                const dy = pt.lat - prevPt.lat;
                const dx = pt.lng - prevPt.lng;
                const bearing = Math.atan2(dy, dx) * (180 / Math.PI);

                await setDoc(trackingRef, {
                  driverLocation: {
                    lat: pt.lat,
                    lng: pt.lng,
                    bearing: bearing || 0,
                  },
                  updatedAt: serverTimestamp(),
                }, { merge: true });
                pointIndex++;
              }, 800); // Step every 800ms
            }

            await setDoc(trackingRef, trackingUpdates, { merge: true });
          } catch (err) {
            console.error('Lifecycle simulation update error:', err);
          }
        }, step.delay);
      });
    });
  /**
   * Translates the unified web app order into individual Flutter-compliant documents
   * and saves them to `newcomfirmedorders` (Global) and `userOrderId/{uid}/newcomfirmedorders`.
   * This bridges the gap between the Web App's unified cart UX and Flutter's item-based checkout.
   */
  async createLiveFlutterOrders(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const uids = order.userId;
      
      for (const item of order.items) {
        // Map category properly if not provided
        const cat = (item as any).cat || (order.isLaundryOrder ? 'Nguo' : 'Food');
        
        // Flutter expects the total for the single item line
        const lineTotal = item.price * item.quantity;
        const deliveryFee = 0; // Handled per-item or globally depending on the business rule, mock 0 for now.

        const flutterPayload = {
          uid: uids,
          foodId: item.productId,
          uname: 'Web User', // Could pull from auth
          no: order.contactPhone || '0000000000',
          name: item.name,
          price: item.price,
          deliveryfee: deliveryFee,
          imgURL: item.imageUrl,
          chose: true,
          quantity: 100, // Stock remaining (mock large number)
          location: order.deliveryLocation.address,
          count: item.quantity, // Ordered amount
          store: order.storeName,
          total: lineTotal,
          irondelivery: order.irondelivery || false,
          packagepickup: order.packagepickup || false,
          express: order.express || false,
          cancel: false,
          show: true,
          paid: false,
          instructions: order.notes || order.instructions || '',
          ordersts: ['Order Placed'],
          orderststime: [new Date().toString()],
          amaountpaid: 0,
          email: 'web@tulete.net',
          tokOnesignal: '',
          deliverytime: order.deliverytime || 'ASAP',
          cat: cat,
          showtrackbtn: false,
          deliveryDone: false,
          status: 'Order Placed',
          latlong: `${order.deliveryLocation.lat},${order.deliveryLocation.lng}`,
          ProductLatlong: '0.0,0.0',
          time: new Date().toString(),
        };

        // 1. Add to global `newcomfirmedorders` (Admin/Driver feed)
        const globalRef = collection(db, 'newcomfirmedorders');
        await setDoc(doc(globalRef), flutterPayload);

        // 2. Add to user's personal `userOrderId/{uid}/newcomfirmedorders` (User feed)
        const userOrdersRef = doc(db, 'userOrderId', uids, 'newcomfirmedorders', item.productId);
        await setDoc(userOrdersRef, flutterPayload);
      }
    } catch (e) {
      console.error('Failed to create live flutter orders:', e);
    }
  }
}

export const orderService = new OrderService();
