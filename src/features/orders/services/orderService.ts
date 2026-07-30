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
  specificInstructions?: string;
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

/**
 * Resolves delivery location string for Flutter document 'location' field.
 * Uses specificInstructions (landmarks) if set, otherwise extracts primary area from address.
 */
function resolveDeliveryLocationString(deliveryLocation?: OrderLocation): string {
  if (!deliveryLocation) return 'Unknown Location';

  const instructions = deliveryLocation.specificInstructions?.trim();
  if (instructions) {
    return instructions;
  }

  const addr = deliveryLocation.address;
  if (!addr || addr.includes('(Default)')) {
    return 'Unknown Location';
  }

  const cleaned = addr.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}(,\s*)?/i, '').split(',')[0].trim();
  return cleaned || addr || 'Unknown Location';
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

function mapDocToOrder(id: string, data: any): Order {
  const items = data.items || [{
    productId: data.foodId || id,
    name: data.name || 'Item',
    price: data.price || 0,
    quantity: data.count || data.quantity || 1,
    imageUrl: data.imgURL || '',
    cat: data.cat,
  }];

  return {
    id: id,
    userId: data.userId || data.uid || '',
    email: data.email || '',
    uname: data.uname || '',
    items: items,
    totalAmount: data.totalAmount ?? data.total ?? 0,
    deliveryFee: data.deliveryfee || 0,
    status: data.status || 'Order Placed',
    storeId: data.storeId || '',
    storeName: data.storeName || data.store || 'Tulete Store',
    deliveryLocation: data.deliveryLocation || {
      lat: parseFloat((data.latlong || '').split(',')[0]) || 0,
      lng: parseFloat((data.latlong || '').split(',')[1]) || 0,
      address: data.location || 'Location',
    },
    paymentMethod: data.paymentMethod || 'Cash',
    paymentStatus: data.paid ? 'Paid' : 'Pending',
    contactPhone: data.no || data.contactPhone || '',
    notes: data.instructions || data.notes || '',
    isLaundryOrder: data.cat === 'Nguo',
    createdAt: data.createdAt || data.time,
    updatedAt: data.updatedAt || data.time,
  } as Order;
}

function getTimeInMs(order: Order): number {
  if (order.createdAt?.seconds) return order.createdAt.seconds * 1000;
  if (typeof order.createdAt === 'string') {
    const parsed = new Date(order.createdAt).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

function removeUndefinedFields(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefinedFields);
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = removeUndefinedFields(value);
    }
  }
  return cleaned;
}

class OrderService extends BaseFirestoreService<Order> {
  constructor() {
    super('orders');
  }

  /**
   * Overrides base create method to ensure ONLY laundry items or laundry pack (where cat === "Nguo")
   * are sent to the 'orders' document, while other order categories (products/food)
   * are sent to 'newcomfirmedorders'.
   */
  override async create(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<Order> {
    const isLaundry = data.isLaundryOrder || (data.items && data.items.some(item => (item.cat || (item as any).category) === 'Nguo'));
    
    const targetCollection = isLaundry ? 'orders' : 'newcomfirmedorders';
    
    const docRef = customId 
      ? doc(db, targetCollection, customId) 
      : doc(collection(db, targetCollection));

    const payload = removeUndefinedFields({
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(docRef, payload);
    return { id: docRef.id, ...payload } as Order;
  }

  /**
   * Subscribe to real-time updates for a single order
   */
  subscribeToOrder(orderId: string, callback: (order: Order | null) => void): () => void {
    const docRef = doc(db, 'orders', orderId);
    let unsubNc: (() => void) | null = null;

    const unsubMain = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as Order);
      } else {
        const ncRef = doc(db, 'newcomfirmedorders', orderId);
        if (unsubNc) unsubNc();
        unsubNc = onSnapshot(ncRef, (ncSnap) => {
          if (!ncSnap.exists()) {
            callback(null);
          } else {
            callback(mapDocToOrder(ncSnap.id, ncSnap.data()));
          }
        }, (error) => {
          console.error(`Error subscribing to newcomfirmedorder ${orderId}:`, error);
          callback(null);
        });
      }
    }, (error) => {
      console.error(`Error subscribing to order ${orderId}:`, error);
    });

    return () => {
      unsubMain();
      if (unsubNc) unsubNc();
    };
  }

  /**
   * Subscribe to real-time updates for user orders list across both 'orders' (laundry)
   * and 'newcomfirmedorders' (all categories).
   */
  subscribeToUserOrders(
    userId: string,
    callback: (orders: Order[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    let ordersList: Order[] = [];
    let ncOrdersList: Order[] = [];

    const notifyCombined = () => {
      const orderMap = new Map<string, Order>();
      ncOrdersList.forEach((o) => orderMap.set(o.id, o));
      ordersList.forEach((o) => orderMap.set(o.id, o));

      const combined = Array.from(orderMap.values());
      combined.sort((a, b) => {
        const timeA = getTimeInMs(a);
        const timeB = getTimeInMs(b);
        return timeB - timeA;
      });
      callback(combined);
    };

    const qOrders = query(collection(db, 'orders'), where('userId', '==', userId));
    const qNc = query(collection(db, 'newcomfirmedorders'), where('uid', '==', userId));

    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      ordersList = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Order[];
      notifyCombined();
    }, (error) => {
      console.warn(`Subscription to orders failed:`, error);
    });

    const unsubNc = onSnapshot(qNc, (snapshot) => {
      ncOrdersList = snapshot.docs.map((docSnap) => mapDocToOrder(docSnap.id, docSnap.data()));
      notifyCombined();
    }, (error) => {
      console.warn(`Subscription to newcomfirmedorders failed:`, error);
      if (onError) onError(error);
    });

    return () => {
      unsubOrders();
      unsubNc();
    };
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
   * Only laundry items (cat == "Nguo") are merged into a single laundry pack.
   * All other items remain strictly separated.
   * imgURL is ensured to be a single image string.
   */
  async createLiveFlutterOrders(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, webOrderId: string) {
    try {
      const uids = order.userId;

      // Helper to ensure imgURL is a single string (picking first image if array)
      const toSingleImageUrl = (img: any): string => {
        if (!img) return 'https://firebasestorage.googleapis.com/v0/b/fast-tz.appspot.com/o/placeholder.png?alt=media';
        if (typeof img === 'string') return img;
        if (Array.isArray(img) && img.length > 0) {
          return typeof img[0] === 'string' ? img[0] : String(img[0]);
        }
        return String(img);
      };

      // Helper to strictly identify laundry items (cat === "Nguo")
      const isLaundryItem = (item: any): boolean => {
        const cat = item.cat || item.category || '';
        return cat === 'Nguo';
      };
      
      const laundryItems = order.items.filter(item => isLaundryItem(item));
      const otherItems = order.items.filter(item => !isLaundryItem(item));

      const globalExpress = useCartStore.getState().laundryPreferences.globalExpressSelected;
      const ratios = useCartStore.getState().laundryRatios;

      // 1. COMBINE ONLY LAUNDRY ITEMS (cat == "Nguo") INTO A SINGLE LAUNDRY ORDER PACK
      if (laundryItems.length > 0) {
        const formattedItems = laundryItems.map(item => {
          const services: string[] = [];
          if ((item as any).ironingSelected) services.push('Iron');
          if ((item as any).packagingSelected) services.push('Package');
          if ((item as any).vipSelected) services.push('VIP');
          if (services.length === 0) services.push('Wash');
          
          const serviceStr = services.length > 0 ? ` (${services.join(', ')})` : '';
          return `${item.name}${serviceStr} x${item.quantity}`;
        });

        let combinedName = formattedItems.join(', ');
        if (globalExpress) {
          combinedName += ' [EXPRESS SERVICE]';
        }

        const totalLaundryCount = laundryItems.reduce((acc, item) => acc + item.quantity, 0);
        const calculatedItemSum = laundryItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const finalLaundryPrice = (order.totalAmount && order.totalAmount > 0)
          ? Math.round(order.totalAmount)
          : Math.round(calculatedItemSum + (order.deliveryFee || 0));

        const firstItem = laundryItems[0];
        const timestamp = String(Date.now() % 100000).padStart(5, '0');
        const randomDigits = Math.floor(Math.random() * 10);
        const laundryDocId = `WEB-${timestamp}${randomDigits}`;

        // Determine instructions specifically for laundry order (cat === "Nguo")
        let laundryInstructionsText = order.instructions || '';
        if (!laundryInstructionsText && order.notes) {
          laundryInstructionsText = order.notes;
        }

        const prefDeliveryTime = useCartStore.getState().laundryPreferences?.deliverytime;
        if (prefDeliveryTime && prefDeliveryTime !== 'Pickup' && prefDeliveryTime !== 'ASAP' && !laundryInstructionsText.includes('Preferred Pickup Time')) {
          const timeFormatted = isNaN(new Date(prefDeliveryTime).getTime())
            ? prefDeliveryTime
            : new Date(prefDeliveryTime).toLocaleString();
          const pickupStr = `Preferred Pickup Time: ${timeFormatted}`;
          laundryInstructionsText = laundryInstructionsText
            ? `${laundryInstructionsText}\n[${pickupStr}]`
            : `[${pickupStr}]`;
        }

        const isIron = laundryItems.some((item: any) => item.ironingSelected) || order.irondelivery || false;
        const isPackage = laundryItems.some((item: any) => item.packagingSelected) || order.packagepickup || false;
        const isVip = laundryItems.some((item: any) => item.vipSelected) || false;
        const isExpress = globalExpress || order.express || false;

        const laundryPayload = {
          uid: uids || 'unknown_uid',
          userId: uids || 'unknown_uid',
          foodId: laundryDocId,
          uname: order.uname || 'Web User',
          no: order.contactPhone || '0000000000',
          name: combinedName,
          price: finalLaundryPrice,
          deliveryfee: 0,
          imgURL: toSingleImageUrl(firstItem.imageUrl),
          chose: true,
          quantity: 100,
          location: resolveDeliveryLocationString(order.deliveryLocation),
          count: totalLaundryCount,
          store: order.storeName || 'Tulete Laundry',
          total: finalLaundryPrice,
          irondelivery: isIron,
          packagepickup: isPackage,
          express: isExpress,
          vip: isVip,
          cancel: false,
          show: true,
          paid: true,
          instructions: laundryInstructionsText,
          ordersts: ['Order Placed'],
          orderststime: [getFlutterTime()],
          amaountpaid: 0,
          email: order.email || 'web@tulete.net',
          tokOnesignal: '',
          deliverytime: 'Pickup',
          cat: 'Nguo',
          showtrackbtn: false,
          deliveryDone: false,
          status: 'Order Placed',
          latlong: `${order.deliveryLocation?.lat || 0}, ${order.deliveryLocation?.lng || 0}`,
          ProductLatlong: `${order.deliveryLocation?.lat || 0}, ${order.deliveryLocation?.lng || 0}`,
          time: getFlutterTime(),
          webOrderId: webOrderId,
        };

        const laundryOrdersPayload = {
          Oid: laundryDocId,
          name: combinedName,
          imgURL: toSingleImageUrl(firstItem.imageUrl),
          store: order.storeName || 'Tulete Dobi',
          branch: 'Online',
          location: resolveDeliveryLocationString(order.deliveryLocation),
          latlong: `${order.deliveryLocation?.lat || 0}, ${order.deliveryLocation?.lng || 0}`,
          cat: 'laundry',
          no: order.contactPhone || '0000000000',
          instructions: laundryInstructionsText,
          status: 'received',
          paid: true,
          price: finalLaundryPrice.toString(),
          quantity: totalLaundryCount,
          uname: order.uname || 'Web User',
          email: order.email || 'web@tulete.net',
          uid: uids || 'unknown_uid',
          time: getFlutterTime(),
          irondelivery: isIron,
          packagepickup: isPackage,
          express: isExpress,
          vip: isVip,
        };

        // A. Add to global `newcomfirmedorders` (Admin/Driver feed)
        const globalRef = collection(db, 'newcomfirmedorders');
        await setDoc(doc(globalRef, laundryDocId), removeUndefinedFields(laundryPayload));

        // B. Add to main `orders` collection (using specific 'orders' schema)
        const mainOrdersRef = doc(db, 'orders', laundryDocId);
        await setDoc(mainOrdersRef, removeUndefinedFields(laundryOrdersPayload));
      }

      // 2. PROCESS ALL OTHER NON-LAUNDRY ITEMS INDIVIDUALLY (matching cartsHome.dart)
      for (const item of otherItems) {
        const rawCat = (item as any).cat || (item as any).category || '';
        const catStr = String(rawCat).toLowerCase().trim();
        const isFood = catStr === 'food' || (item as any).deliverySlot != null || (rawCat !== 'Product' && rawCat !== 'Nguo' && rawCat !== 'product');
        const isPickUp = (item as any).isDeliverySelected === false || (item as any).packagepickup === true;
        const slot = (item as any).deliverySlot;

        let finalDeliveryTime = 'Product';
        if (isPickUp) {
          finalDeliveryTime = 'Pickup';
        } else if (isFood) {
          if (slot && String(slot).trim().length > 0) {
            finalDeliveryTime = slot;
          } else {
            const currentHour = new Date().getHours();
            const bVal = String((item as any).brand || (item as any).pbrand || (item as any).FBrand || (item as any).LBrand || '').toLowerCase().trim();
            finalDeliveryTime = bVal === 'now' ? 'ASAP' : (currentHour < 15 ? 'Lunch' : 'Dinner');
          }
        } else {
          // Product orders (not food nor laundry)
          finalDeliveryTime = 'Product';
        }
        const lineTotal = item.price * item.quantity;
        const itemDocId = `${item.productId || 'item'}_${webOrderId}`;

        const itemPayload = {
          uid: uids || 'unknown_uid',
          userId: uids || 'unknown_uid',
          foodId: item.productId || 'unknown_product',
          uname: order.uname || 'Web User',
          no: order.contactPhone || '0000000000',
          name: item.name || 'Unknown Item',
          price: Math.round(item.price || 0),
          deliveryfee: 0,
          imgURL: toSingleImageUrl(item.imageUrl),
          chose: true,
          quantity: 100,
          location: resolveDeliveryLocationString(order.deliveryLocation),
          count: Math.round(item.quantity || 1),
          store: order.storeName || 'Tulete Store',
          total: Math.round(lineTotal || 0),
          irondelivery: false,
          packagepickup: isPickUp,
          express: false,
          cancel: false,
          show: true,
          paid: true,
          instructions: order.notes || '',
          ordersts: ['Order Placed'],
          orderststime: [getFlutterTime()],
          amaountpaid: 0,
          email: order.email || 'web@tulete.net',
          tokOnesignal: '',
          deliverytime: finalDeliveryTime,
          cat: rawCat,
          showtrackbtn: false,
          deliveryDone: false,
          status: 'Order Placed',
          latlong: `${order.deliveryLocation?.lat || 0}, ${order.deliveryLocation?.lng || 0}`,
          ProductLatlong: `${order.deliveryLocation?.lat || 0}, ${order.deliveryLocation?.lng || 0}`,
          time: getFlutterTime(),
          webOrderId: webOrderId,
        };

        // Write to global `newcomfirmedorders` (matching cartsHome.dart)
        const globalRef = collection(db, 'newcomfirmedorders');
        await setDoc(doc(globalRef, itemDocId), removeUndefinedFields(itemPayload));
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
    try {
      // 1. Update the web app's order document in 'orders' if it exists
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        await setDoc(orderRef, { status: 'Cancelled', updatedAt: serverTimestamp() }, { merge: true });
      }

      // 2. Update order document in 'newcomfirmedorders' if it exists directly by ID
      const ncRef = doc(db, 'newcomfirmedorders', orderId);
      const ncSnap = await getDoc(ncRef);
      if (ncSnap.exists()) {
        await setDoc(ncRef, { status: 'Cancelled', cancel: true, updatedAt: serverTimestamp() }, { merge: true });
      }

      // 3. Safely update tracking document if it exists
      const trackingRef = doc(db, 'tracking', orderId);
      const trackingSnap = await getDoc(trackingRef);
      if (trackingSnap.exists()) {
        await setDoc(trackingRef, { status: 'Cancelled', updatedAt: serverTimestamp() }, { merge: true });
      }

      // 4. Update all Flutter newcomfirmedorders docs linked by webOrderId
      const globalQ = query(
        collection(db, 'newcomfirmedorders'),
        where('webOrderId', '==', orderId)
      );
      const globalSnap = await getDocs(globalQ);
      if (!globalSnap.empty) {
        const flutterBatch = writeBatch(db);
        globalSnap.docs.forEach((d) => {
          flutterBatch.update(d.ref, { cancel: true, status: 'Cancelled', updatedAt: serverTimestamp() });
        });
        await flutterBatch.commit();
      }
    } catch (e) {
      console.error('Failed to cancel order:', e);
      throw e;
    }
  }
}

export const orderService = new OrderService();
