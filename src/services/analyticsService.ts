import { doc, setDoc, increment, arrayUnion, arrayRemove, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../core/firebase/config';
import { useAuthStore } from '../core/auth/useAuthStore';

/**
 * Sanitizes keys for Firestore map field paths.
 * Replaces characters like '.', '/', '~', '*', '[', ']' that could break Firestore dot notation.
 */
function sanitizeKey(key: string): string {
  if (!key) return 'unknown';
  return String(key).replace(/[\.\/\~\*\[\]]/g, '_').trim();
}

/**
 * Gets formatted date string YYYY-MM-DD for daily breakdown tracking.
 */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resolves current user info (userId, email, name) automatically from auth store or explicit parameter.
 */
function getCurrentUserInfo(explicitUserId?: string): { userId: string; email?: string; name?: string } {
  const storeUser = useAuthStore.getState().user;
  const firebaseUser = auth.currentUser;

  const userId = (explicitUserId && explicitUserId !== 'guest_user')
    ? explicitUserId
    : (storeUser?.id || (storeUser as any)?.uid || firebaseUser?.uid || 'guest_user');

  const email = storeUser?.email || firebaseUser?.email || undefined;
  const name = storeUser?.displayName || (storeUser as any)?.name || (storeUser as any)?.uname || firebaseUser?.displayName || undefined;

  return { userId, email, name };
}

/**
 * Log individual customer activity event to analytics_events collection timeline.
 */
async function logActivityEvent(eventData: {
  userId: string;
  eventType: string;
  itemId?: string;
  itemName?: string;
  storeId?: string;
  storeName?: string;
  searchQuery?: string;
  ratingStars?: number;
  quantity?: number;
  context?: string;
}): Promise<void> {
  try {
    const eventId = `${eventData.userId}_${eventData.eventType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const eventRef = doc(db, 'analytics_events', eventId);

    const payload: any = {
      ...eventData,
      timestamp: serverTimestamp(),
    };

    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

    await setDoc(eventRef, payload, { merge: true });
  } catch (err) {
    // Silent fallback
  }
}

/**
 * Updates customer profile analytics document in analytics_users collection.
 */
async function updateUserAnalytics(
  userInfo: { userId: string; email?: string; name?: string },
  updates: Record<string, any>
): Promise<void> {
  if (!userInfo.userId || userInfo.userId === 'guest_user') return;
  try {
    const userRef = doc(db, 'analytics_users', userInfo.userId);
    const payload: any = {
      userId: userInfo.userId,
      lastActive: serverTimestamp(),
      ...updates,
    };
    if (userInfo.name) payload.userName = userInfo.name;
    if (userInfo.email) payload.userEmail = userInfo.email;

    await setDoc(userRef, payload, { merge: true });
  } catch (err) {
    // Silent fallback
  }
}

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastRecordedQuery = '';

export const analyticsService = {
  /**
   * Track visitor session on app load/open with user ID tracing.
   */
  async trackVisitor(explicitUserId?: string): Promise<void> {
    try {
      const userInfo = getCurrentUserInfo(explicitUserId);
      const today = getTodayDateString();
      const overviewRef = doc(db, 'analytics', 'overview');
      const dailyRef = doc(db, 'analytics_daily', today);

      await Promise.all([
        setDoc(
          overviewRef,
          {
            totalVisitors: increment(1),
            uidsVisited: arrayUnion(userInfo.userId),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(
          dailyRef,
          {
            date: today,
            visitors: increment(1),
            uidsVisited: arrayUnion(userInfo.userId),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        updateUserAnalytics(userInfo, { totalVisits: increment(1) }),
        logActivityEvent({ userId: userInfo.userId, eventType: 'visit' }),
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track visitor:', err);
    }
  },

  /**
   * Track item view by ID with customer UID recording.
   */
  async trackItemView(itemId: string, itemData?: any, explicitUserId?: string): Promise<void> {
    if (!itemId) return;
    try {
      const userInfo = getCurrentUserInfo(explicitUserId);
      const cleanId = String(itemId).trim();
      const safeKey = sanitizeKey(cleanId);
      const today = getTodayDateString();

      const overviewRef = doc(db, 'analytics', 'overview');
      const dailyRef = doc(db, 'analytics_daily', today);
      const itemRef = doc(db, 'analytics_items', cleanId);

      const itemPayload: any = {
        itemId: cleanId,
        viewCount: increment(1),
        uidsViewed: arrayUnion(userInfo.userId),
        lastViewedByUserId: userInfo.userId,
        lastViewedAt: serverTimestamp(),
      };
      if (itemData?.name || itemData?.title) {
        itemPayload.name = itemData.name || itemData.title;
      }
      if (itemData?.category || itemData?.cat) {
        itemPayload.category = itemData.category || itemData.cat;
      }

      await Promise.all([
        setDoc(
          overviewRef,
          {
            totalItemViews: increment(1),
            [`viewedItems.${safeKey}`]: increment(1),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(
          dailyRef,
          {
            date: today,
            itemViews: increment(1),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(itemRef, itemPayload, { merge: true }),
        updateUserAnalytics(userInfo, {
          totalItemViews: increment(1),
          viewedItems: arrayUnion(cleanId),
        }),
        logActivityEvent({
          userId: userInfo.userId,
          eventType: 'item_view',
          itemId: cleanId,
          itemName: itemData?.name || itemData?.title,
        }),
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track item view:', err);
    }
  },

  /**
   * Track favorite action with customer UID recording.
   */
  async trackFavorite(itemId: string, itemData?: any, explicitUserId?: string): Promise<void> {
    if (!itemId) return;
    try {
      const userInfo = getCurrentUserInfo(explicitUserId);
      const cleanId = String(itemId).trim();
      const safeKey = sanitizeKey(cleanId);
      const today = getTodayDateString();

      const overviewRef = doc(db, 'analytics', 'overview');
      const dailyRef = doc(db, 'analytics_daily', today);
      const itemRef = doc(db, 'analytics_items', cleanId);

      const itemPayload: any = {
        itemId: cleanId,
        favoriteCount: increment(1),
        uidsFavorited: arrayUnion(userInfo.userId),
        lastFavoritedByUserId: userInfo.userId,
        lastFavoritedAt: serverTimestamp(),
      };
      if (itemData?.name || itemData?.title) {
        itemPayload.name = itemData.name || itemData.title;
      }

      await Promise.all([
        setDoc(
          overviewRef,
          {
            totalFavorites: increment(1),
            [`favoriteItems.${safeKey}`]: increment(1),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(
          dailyRef,
          {
            date: today,
            favorites: increment(1),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(itemRef, itemPayload, { merge: true }),
        updateUserAnalytics(userInfo, {
          totalFavorites: increment(1),
          favoritedItems: arrayUnion(cleanId),
        }),
        logActivityEvent({
          userId: userInfo.userId,
          eventType: 'favorite',
          itemId: cleanId,
          itemName: itemData?.name || itemData?.title,
        }),
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track favorite:', err);
    }
  },

  /**
   * Track unfavorite action with customer UID removal.
   */
  async trackUnfavorite(itemId: string, explicitUserId?: string): Promise<void> {
    if (!itemId) return;
    try {
      const userInfo = getCurrentUserInfo(explicitUserId);
      const cleanId = String(itemId).trim();
      const safeKey = sanitizeKey(cleanId);

      const overviewRef = doc(db, 'analytics', 'overview');
      const itemRef = doc(db, 'analytics_items', cleanId);

      await Promise.all([
        setDoc(
          overviewRef,
          {
            [`favoriteItems.${safeKey}`]: increment(-1),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(
          itemRef,
          {
            favoriteCount: increment(-1),
            uidsFavorited: arrayRemove(userInfo.userId),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        updateUserAnalytics(userInfo, {
          favoritedItems: arrayRemove(cleanId),
        }),
        logActivityEvent({
          userId: userInfo.userId,
          eventType: 'unfavorite',
          itemId: cleanId,
        }),
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track unfavorite:', err);
    }
  },

  /**
   * Track ordered item by ID with customer UID recording.
   */
  async trackItemOrder(itemId: string, quantity: number = 1, itemData?: any, explicitUserId?: string): Promise<void> {
    if (!itemId) return;
    try {
      const userInfo = getCurrentUserInfo(explicitUserId);
      const cleanId = String(itemId).trim();
      const safeKey = sanitizeKey(cleanId);
      const qty = Math.max(1, Number(quantity) || 1);
      const today = getTodayDateString();

      const overviewRef = doc(db, 'analytics', 'overview');
      const dailyRef = doc(db, 'analytics_daily', today);
      const itemRef = doc(db, 'analytics_items', cleanId);

      const itemPayload: any = {
        itemId: cleanId,
        orderCount: increment(qty),
        uidsOrdered: arrayUnion(userInfo.userId),
        lastOrderedByUserId: userInfo.userId,
        lastOrderedAt: serverTimestamp(),
      };
      if (itemData?.name || itemData?.title) {
        itemPayload.name = itemData.name || itemData.title;
      }

      await Promise.all([
        setDoc(
          overviewRef,
          {
            totalOrders: increment(qty),
            [`orderedItems.${safeKey}`]: increment(qty),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(
          dailyRef,
          {
            date: today,
            orders: increment(qty),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(itemRef, itemPayload, { merge: true }),
        updateUserAnalytics(userInfo, {
          totalOrders: increment(qty),
          orderedItems: arrayUnion(cleanId),
        }),
        logActivityEvent({
          userId: userInfo.userId,
          eventType: 'order',
          itemId: cleanId,
          quantity: qty,
          itemName: itemData?.name || itemData?.title,
        }),
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track item order:', err);
    }
  },

  /**
   * Track rating submission for an item with customer UID recording.
   */
  async trackRating(itemId: string, ratingStars: number, itemData?: any, explicitUserId?: string): Promise<void> {
    if (!itemId) return;
    try {
      const userInfo = getCurrentUserInfo(explicitUserId);
      const cleanId = String(itemId).trim();
      const safeKey = sanitizeKey(cleanId);
      const stars = Math.min(5, Math.max(1, Number(ratingStars) || 5));
      const today = getTodayDateString();

      const overviewRef = doc(db, 'analytics', 'overview');
      const dailyRef = doc(db, 'analytics_daily', today);
      const itemRef = doc(db, 'analytics_items', cleanId);
      const ratingLogRef = doc(db, 'analytics_ratings', `${cleanId}_${Date.now()}`);

      const itemPayload: any = {
        itemId: cleanId,
        ratingCount: increment(1),
        ratingSum: increment(stars),
        ratings: arrayUnion(stars),
        uidsRated: arrayUnion(userInfo.userId),
        [`starBreakdown.${stars}Star`]: increment(1),
        lastRatingGiven: stars,
        lastRatedByUserId: userInfo.userId,
        lastRatedAt: serverTimestamp(),
      };
      if (itemData?.name || itemData?.title) {
        itemPayload.name = itemData.name || itemData.title;
      }

      await Promise.all([
        setDoc(
          overviewRef,
          {
            totalRatings: increment(1),
            totalRatingSum: increment(stars),
            [`ratedItems.${safeKey}`]: increment(1),
            [`ratedItemsSum.${safeKey}`]: increment(stars),
            [`ratedItemsLastValue.${safeKey}`]: stars,
            [`starBreakdown.${stars}Star`]: increment(1),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(
          dailyRef,
          {
            date: today,
            ratings: increment(1),
            ratingSum: increment(stars),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(itemRef, itemPayload, { merge: true }),
        setDoc(
          ratingLogRef,
          {
            itemId: cleanId,
            name: itemData?.name || itemData?.title || '',
            rating: stars,
            userId: userInfo.userId,
            userName: userInfo.name,
            userEmail: userInfo.email,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        ),
        updateUserAnalytics(userInfo, {
          totalRatings: increment(1),
          ratedItems: arrayUnion(cleanId),
        }),
        logActivityEvent({
          userId: userInfo.userId,
          eventType: 'rating',
          itemId: cleanId,
          ratingStars: stars,
          itemName: itemData?.name || itemData?.title,
        }),
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track rating:', err);
    }
  },

  /**
   * Track user search queries with customer UID recording and intelligent debouncing.
   */
  trackSearchQuery(query: string, context: string = 'general', immediate: boolean = false, explicitUserId?: string): void {
    if (!query || typeof query !== 'string') return;
    const cleanQuery = query.trim().toLowerCase();

    if (cleanQuery.length < 3) return;
    if (cleanQuery === lastRecordedQuery) return;

    const executeWrite = async () => {
      lastRecordedQuery = cleanQuery;
      try {
        const userInfo = getCurrentUserInfo(explicitUserId);
        const safeKey = sanitizeKey(cleanQuery);
        const today = getTodayDateString();

        const overviewRef = doc(db, 'analytics', 'overview');
        const dailyRef = doc(db, 'analytics_daily', today);
        const searchRef = doc(db, 'analytics_searches', safeKey);

        await Promise.all([
          setDoc(
            overviewRef,
            {
              totalSearches: increment(1),
              [`searches.${safeKey}`]: increment(1),
              lastUpdated: serverTimestamp(),
            },
            { merge: true }
          ),
          setDoc(
            dailyRef,
            {
              date: today,
              searches: increment(1),
              lastUpdated: serverTimestamp(),
            },
            { merge: true }
          ),
          setDoc(
            searchRef,
            {
              query: cleanQuery,
              context,
              searchCount: increment(1),
              uids: arrayUnion(userInfo.userId),
              lastUserId: userInfo.userId,
              lastSearchedAt: serverTimestamp(),
            },
            { merge: true }
          ),
          updateUserAnalytics(userInfo, {
            searchedQueries: arrayUnion(cleanQuery),
          }),
          logActivityEvent({
            userId: userInfo.userId,
            eventType: 'search',
            searchQuery: cleanQuery,
            context,
          }),
        ]);
      } catch (err) {
        console.warn('[Analytics] Failed to track search query:', err);
      }
    };

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }

    if (immediate) {
      executeWrite();
    } else {
      searchDebounceTimer = setTimeout(executeWrite, 2500);
    }
  },

  /**
   * Track store view by storeId with customer UID recording.
   */
  async trackStoreView(storeId: string, storeData?: any, explicitUserId?: string): Promise<void> {
    if (!storeId) return;
    try {
      const userInfo = getCurrentUserInfo(explicitUserId);
      const cleanId = String(storeId).trim();
      const safeKey = sanitizeKey(cleanId);
      const today = getTodayDateString();

      const overviewRef = doc(db, 'analytics', 'overview');
      const dailyRef = doc(db, 'analytics_daily', today);
      const storeRef = doc(db, 'analytics_stores', cleanId);

      const storePayload: any = {
        storeId: cleanId,
        viewCount: increment(1),
        uidsViewed: arrayUnion(userInfo.userId),
        lastViewedByUserId: userInfo.userId,
        lastViewedAt: serverTimestamp(),
      };
      if (storeData?.name || storeData?.store) {
        storePayload.name = storeData.name || storeData.store;
      }

      await Promise.all([
        setDoc(
          overviewRef,
          {
            totalStoreViews: increment(1),
            [`viewedStores.${safeKey}`]: increment(1),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(
          dailyRef,
          {
            date: today,
            storeViews: increment(1),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(storeRef, storePayload, { merge: true }),
        updateUserAnalytics(userInfo, {
          viewedStores: arrayUnion(cleanId),
        }),
        logActivityEvent({
          userId: userInfo.userId,
          eventType: 'store_view',
          storeId: cleanId,
          storeName: storeData?.name || storeData?.store,
        }),
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track store view:', err);
    }
  },

  /**
   * Track cart updates for abandoned cart analytics.
   * Records active cart items, total cart value, and customer details in analytics_cart_abandoned/{userId}.
   */
  async trackCartUpdate(cartItems: any[], explicitUserId?: string): Promise<void> {
    try {
      const userInfo = getCurrentUserInfo(explicitUserId);
      const today = getTodayDateString();
      const userCartRef = doc(db, 'analytics_cart_abandoned', userInfo.userId);
      const overviewRef = doc(db, 'analytics', 'overview');
      const dailyRef = doc(db, 'analytics_daily', today);

      const cartSnap = await getDoc(userCartRef);
      const wasActive = cartSnap.exists() && cartSnap.data()?.status === 'active';
      const createdDate = cartSnap.exists() ? (cartSnap.data()?.createdDate || today) : today;

      if (cartItems && cartItems.length > 0) {
        const itemSummaries = cartItems.map((item: any) => ({
          productId: item.productId || item.id,
          name: item.name || item.title || 'Item',
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          storeId: item.storeId || '',
          storeName: item.storeName || item.store || '',
        }));

        const totalCartValue = itemSummaries.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const cartItemCount = itemSummaries.reduce((sum, item) => sum + item.quantity, 0);

        const payload: any = {
          userId: userInfo.userId,
          status: 'active',
          cartItemCount,
          totalCartValue,
          items: itemSummaries,
          lastCartUpdate: serverTimestamp(),
          createdDate,
        };
        if (userInfo.name) payload.userName = userInfo.name;
        if (userInfo.email) payload.userEmail = userInfo.email;

        const operations: Promise<any>[] = [
          setDoc(userCartRef, payload, { merge: true }),
          updateUserAnalytics(userInfo, {
            activeCartValue: totalCartValue,
            activeCartItemsCount: cartItemCount,
          }),
          logActivityEvent({
            userId: userInfo.userId,
            eventType: 'cart_update',
            quantity: cartItemCount,
            context: `${totalCartValue} TZS`,
          }),
        ];

        // Only increment abandoned cart count if it transitions from inactive -> active
        if (!wasActive) {
          operations.push(
            setDoc(
              overviewRef,
              {
                abandonedCartUserIds: arrayUnion(userInfo.userId),
                totalCartAbandoned: increment(1),
                lastUpdated: serverTimestamp(),
              },
              { merge: true }
            ),
            setDoc(
              dailyRef,
              {
                date: today,
                cartAbandoned: increment(1),
                lastUpdated: serverTimestamp(),
              },
              { merge: true }
            )
          );
        }

        await Promise.all(operations);
      } else {
        // Cart was cleared / emptied
        const operations: Promise<any>[] = [
          setDoc(
            userCartRef,
            {
              userId: userInfo.userId,
              status: 'cleared',
              cartItemCount: 0,
              totalCartValue: 0,
              items: [],
              lastCartUpdate: serverTimestamp(),
            },
            { merge: true }
          ),
          updateUserAnalytics(userInfo, {
            activeCartValue: 0,
            activeCartItemsCount: 0,
          }),
        ];

        // If it was previously active, remove from abandoned tracking & decrement counts
        if (wasActive) {
          const cartDateRef = doc(db, 'analytics_daily', createdDate);
          operations.push(
            setDoc(
              overviewRef,
              {
                abandonedCartUserIds: arrayRemove(userInfo.userId),
                totalCartAbandoned: increment(-1),
                lastUpdated: serverTimestamp(),
              },
              { merge: true }
            ),
            setDoc(
              cartDateRef,
              {
                cartAbandoned: increment(-1),
                lastUpdated: serverTimestamp(),
              },
              { merge: true }
            )
          );
        }

        await Promise.all(operations);
      }
    } catch (err) {
      console.warn('[Analytics] Failed to track cart update:', err);
    }
  },

  /**
   * Track when a cart is converted into a completed order.
   * Marks status in analytics_cart_abandoned/{userId} as 'converted' and removes from abandoned recordings.
   */
  async trackCartConverted(orderId: string, explicitUserId?: string): Promise<void> {
    try {
      const userInfo = getCurrentUserInfo(explicitUserId);
      const today = getTodayDateString();
      const userCartRef = doc(db, 'analytics_cart_abandoned', userInfo.userId);
      const overviewRef = doc(db, 'analytics', 'overview');

      const cartSnap = await getDoc(userCartRef);
      const wasActive = cartSnap.exists() && (cartSnap.data()?.status === 'active' || (cartSnap.data()?.cartItemCount || 0) > 0);
      const createdDate = cartSnap.exists() ? (cartSnap.data()?.createdDate || today) : today;
      const cartDateRef = doc(db, 'analytics_daily', createdDate);

      const operations: Promise<any>[] = [
        setDoc(
          userCartRef,
          {
            userId: userInfo.userId,
            status: 'converted',
            convertedOrderId: orderId,
            convertedAt: serverTimestamp(),
            lastCartUpdate: serverTimestamp(),
            cartItemCount: 0,
            totalCartValue: 0,
            items: [], // Remove items from abandoned recording so it is no longer an active abandoned cart
          },
          { merge: true }
        ),
        updateUserAnalytics(userInfo, {
          activeCartValue: 0,
          activeCartItemsCount: 0,
        }),
        logActivityEvent({
          userId: userInfo.userId,
          eventType: 'cart_converted',
          context: orderId,
        }),
      ];

      // Remove from active abandoned recordings and decrement count
      if (wasActive) {
        operations.push(
          setDoc(
            overviewRef,
            {
              abandonedCartUserIds: arrayRemove(userInfo.userId),
              totalCartAbandoned: increment(-1),
              totalConvertedCarts: increment(1),
              lastUpdated: serverTimestamp(),
            },
            { merge: true }
          ),
          setDoc(
            cartDateRef,
            {
              cartAbandoned: increment(-1),
              lastUpdated: serverTimestamp(),
            },
            { merge: true }
          )
        );
      } else {
        operations.push(
          setDoc(
            overviewRef,
            {
              totalConvertedCarts: increment(1),
              lastUpdated: serverTimestamp(),
            },
            { merge: true }
          )
        );
      }

      await Promise.all(operations);
    } catch (err) {
      console.warn('[Analytics] Failed to track cart conversion:', err);
    }
  },

  /**
   * Track order cancellation for telemetry & analytics.
   * Records what was cancelled (items, orderId, totalAmount), who cancelled (userId, userName, email, cancelledBy role),
   * and increments cancellation counts in overview, daily timeline, and user profiles.
   */
  async trackOrderCancelled(
    orderId: string,
    orderData?: any,
    cancelledBy: string = 'customer',
    reason?: string,
    explicitUserId?: string
  ): Promise<void> {
    if (!orderId) return;
    try {
      const userInfo = getCurrentUserInfo(explicitUserId || orderData?.userId);
      const today = getTodayDateString();
      const overviewRef = doc(db, 'analytics', 'overview');
      const dailyRef = doc(db, 'analytics_daily', today);
      const cancelLogRef = doc(db, 'analytics_cancellations', `${orderId}_${Date.now()}`);

      const items = orderData?.items || orderData?.cartItems || [];
      const itemSummaries = Array.isArray(items) ? items.map((item: any) => ({
        productId: item.productId || item.id || item.foodId || '',
        name: item.name || item.title || 'Item',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        storeId: item.storeId || '',
        storeName: item.storeName || item.store || '',
      })) : [];

      const totalAmount = Number(orderData?.total || orderData?.price || orderData?.totalAmount || 0);

      const cancelPayload: any = {
        orderId,
        userId: userInfo.userId,
        userName: userInfo.name || orderData?.userName || orderData?.name || 'Customer',
        userEmail: userInfo.email || orderData?.userEmail || orderData?.email || '',
        cancelledBy,
        reason: reason || 'Customer requested cancellation',
        totalAmount,
        itemCount: itemSummaries.length,
        items: itemSummaries,
        createdAt: serverTimestamp(),
      };

      await Promise.all([
        // 1. Audit record in analytics_cancellations collection
        setDoc(cancelLogRef, cancelPayload, { merge: true }),

        // 2. Global overview analytics updates
        setDoc(
          overviewRef,
          {
            totalCancelledOrders: increment(1),
            totalCancelledItems: increment(itemSummaries.reduce((acc: number, i: any) => acc + i.quantity, 0)),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),

        // 3. Daily breakdown update
        setDoc(
          dailyRef,
          {
            date: today,
            ordersCancelled: increment(1),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),

        // 4. Update user profile analytics for cancellation frequency
        updateUserAnalytics(userInfo, {
          totalCancelledOrders: increment(1),
          lastCancelledAt: serverTimestamp(),
        }),

        // 5. Audit log event
        logActivityEvent({
          userId: userInfo.userId,
          eventType: 'order_cancelled',
          context: `Order ${orderId} cancelled by ${cancelledBy}`,
        }),
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track order cancellation:', err);
    }
  },

  /**
   * Fetch current overview analytics data from Firestore.
   */
  async getOverviewAnalytics(): Promise<any> {
    try {
      const overviewRef = doc(db, 'analytics', 'overview');
      const snap = await getDoc(overviewRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (err) {
      console.error('[Analytics] Failed to fetch overview analytics:', err);
      return null;
    }
  },
};
