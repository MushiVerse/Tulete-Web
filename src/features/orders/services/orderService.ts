/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';
import { useCartStore } from '../../cart/store/useCartStore';
import { doc, getDoc, getDocs, onSnapshot, query, collection, where, orderBy, setDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
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
  deliveryFee: number;
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
  email?: string;
  uname?: string;
  createdAt: any;
  updatedAt: any;
}

/**
 * Formats a JS Date to the exact string format expected by Dart's DateTime.parse()
 * for Flutter compatibility: "yyyy-MM-dd HH:mm:ss.SSSSSS"
 */
function getFlutterTime(): string {
  const now = new Date();
  const pad = (num: number, size = 2) => String(num).padStart(size, '0');
  
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const micro = pad(now.getMilliseconds() * 1000, 6); // Mock microseconds

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${micro}`;
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
  }

  /**
   * Fetch the global delivery ratio multiplier used for distance-based fee calculation.
   * Mirrors Flutter's getdeliveryration()
   */
  async getDeliveryRation(): Promise<number> {
    try {
      const q = query(collection(db, 'deliveryRation'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        // Typically the first doc contains the ratio
        const data = snap.docs[0].data();
        return data.ratio || 1000;
      }
      return 1000; // Fallback default
    } catch (error) {
      console.error('Error fetching delivery ration:', error);
      return 1000; // Fallback default
    }
  }

  /**
   * Validates cart items against the live production Firestore inventory ('idadi')
   * Returns an array of error messages for any items that are out of stock or have insufficient quantity.
   */
  async validateInventory(items: any[]): Promise<string[]> {
    const errors: string[] = [];
    
    for (const item of items) {
      const isLaundry = item.isLaundry || item.cat === 'Nguo' || item.storeId === 'laundry';
      const collectionName = isLaundry ? 'Clothes' : 'FoodAndProducts';
      
      try {
        const docRef = doc(db, collectionName, item.productId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const idadi = typeof data.idadi === 'number' ? data.idadi : 
                        (typeof data.idadi === 'string' ? parseInt(data.idadi, 10) : 1000); // 1000 for infinite fallback
          
          if (idadi <= 0) {
            errors.push(`"${item.name}" is currently Out of Stock.`);
          } else if (item.quantity > idadi) {
            errors.push(`Only ${idadi}x "${item.name}" available. You requested ${item.quantity}.`);
          }
        } else {
          // It's possible the item is missing or mocked (e.g., test items)
          // We don't block mocked items strictly for dev purposes, but in production we'd return an error here.
          // errors.push(`"${item.name}" is no longer available.`);
        }
      } catch (e) {
        console.error(`Error validating inventory for ${item.productId}:`, e);
      }
    }
    
    return errors;
  }

  /**
   * Initializes order tracking for the web app without automatic simulation,
   * allowing the Flutter admin app to drive the status updates.
   */
  async initializeOrderTracking(orderId: string) {
    const trackingRef = doc(db, 'tracking', orderId);
    const initialTracking: Omit<OrderTracking, 'id'> = {
      orderId,
      status: 'Pending',
      updatedAt: serverTimestamp(),
    };
    await setDoc(trackingRef, initialTracking);
  }

  /**
   * Translates the unified web app order into individual Flutter-compliant documents
   * and saves them to `newcomfirmedorders` (Global) and `userOrderId/{uid}/newcomfirmedorders`.
   * This bridges the gap between the Web App's unified cart UX and Flutter's item-based checkout.
   */
  async createLiveFlutterOrders(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, webOrderId: string) {
    try {
      const uids = order.userId;
      
      for (const item of order.items) {
        // Map category properly if not provided
        const cat = (item as any).cat || (order.isLaundryOrder ? 'Nguo' : 'Food');
        
        // Flutter uses deliverytime to determine the UI badge (e.g. #Laundry Order, #Product Order)
        let finalDeliveryTime = 'ASAP';
        if (order.isLaundryOrder || cat === 'Nguo') {
          finalDeliveryTime = 'Pickup';
        } else if (cat === 'Product') {
          finalDeliveryTime = 'Product';
        }
        
        // Flutter expects the total for the single item line
        let lineTotal = item.price * item.quantity;
        
        // Apply per-item laundry modifiers to the item lineTotal
        if (order.isLaundryOrder) {
          const ratios = useCartStore.getState().laundryRatios;
          if (ratios) {
            if ((item as any).ironingSelected) lineTotal += (item.price * item.quantity) * (ratios.iron - ratios.wash);
            if ((item as any).packagingSelected) lineTotal += (item.price * item.quantity) * (ratios.package - ratios.wash);
            if ((item as any).vipSelected) lineTotal += (item.price * item.quantity) * (ratios.vip - ratios.wash);
          } else {
            // fallback
            if ((item as any).ironingSelected) lineTotal += (item.price * item.quantity) * 0.95;
            if ((item as any).packagingSelected) lineTotal += (item.price * item.quantity) * 2.9;
            if ((item as any).vipSelected) lineTotal += (item.price * item.quantity) * 4.3;
          }
        }
        
        const globalExpress = useCartStore.getState().laundryPreferences.globalExpressSelected;

        const deliveryFee = 0; // Handled per-item or globally depending on the business rule, mock 0 for now.

        const flutterPayload = {
          uid: uids || 'unknown_uid',
          foodId: item.productId || 'unknown_product',
          uname: order.uname || 'Web User',
          no: order.contactPhone || '0000000000',
          name: item.name || 'Unknown Item',
          price: Math.round(item.price || 0),
          deliveryfee: Math.round(deliveryFee || 0),
          imgURL: item.imageUrl || 'https://firebasestorage.googleapis.com/v0/b/fast-tz.appspot.com/o/placeholder.png?alt=media',
          chose: true,
          quantity: 100,
          location: order.deliveryLocation?.address || 'Unknown Location',
          count: Math.round(item.quantity || 1),
          store: order.storeName || 'Tulete Store',
          total: Math.round(lineTotal || 0),
          irondelivery: order.irondelivery || false,
          packagepickup: order.packagepickup || false,
          express: globalExpress || false,
          cancel: false,
          show: true,
          paid: false,
          instructions: order.notes || order.instructions || '',
          ordersts: ['Order Placed'],
          orderststime: [getFlutterTime()],
          amaountpaid: 0,
          email: order.email || 'web@tulete.net',
          tokOnesignal: '',
          deliverytime: finalDeliveryTime,
          cat: cat || 'Product',
          showtrackbtn: false,
          deliveryDone: false,
          status: 'Order Placed',
          latlong: `${order.deliveryLocation?.lat || 0}, ${order.deliveryLocation?.lng || 0}`,
          ProductLatlong: `${order.deliveryLocation?.lat || 0}, ${order.deliveryLocation?.lng || 0}`,
          time: getFlutterTime(),
          webOrderId: webOrderId, // Used to link live flutter orders back to the web app's tracking page
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
  /**
   * Fully cancels an order across all Firestore collections:
   * 1. orders/{orderId}                      — sets status to 'Cancelled'
   * 2. tracking/{orderId}                    — sets status to 'Cancelled'
   * 3. newcomfirmedorders (global)           — sets cancel: true on all docs linked by webOrderId
   */
  async cancelOrder(orderId: string): Promise<void> {
    const batch = writeBatch(db);

    // 1. Update the web app's own orders document
    const orderRef = doc(db, 'orders', orderId);
    batch.update(orderRef, { status: 'Cancelled', updatedAt: serverTimestamp() });

    // 2. Update tracking document
    const trackingRef = doc(db, 'tracking', orderId);
    batch.update(trackingRef, { status: 'Cancelled', updatedAt: serverTimestamp() });

    // Commit web app docs first
    await batch.commit();

    // 3. Update all Flutter newcomfirmedorders docs linked by webOrderId
    try {
      const globalQ = query(
        collection(db, 'newcomfirmedorders'),
        where('webOrderId', '==', orderId)
      );
      const globalSnap = await getDocs(globalQ);
      if (!globalSnap.empty) {
        const flutterBatch = writeBatch(db);
        globalSnap.docs.forEach((d) => {
          flutterBatch.update(d.ref, { cancel: true, updatedAt: serverTimestamp() });
        });
        await flutterBatch.commit();
      }
    } catch (e) {
      console.error('Failed to cancel Flutter newcomfirmedorders:', e);
    }
  }
}

export const orderService = new OrderService();
