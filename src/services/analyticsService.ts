import { doc, setDoc, increment, arrayUnion, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../core/firebase/config';

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

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastRecordedQuery = '';

export const analyticsService = {
  /**
   * Track visitor session on app load/open.
   */
  async trackVisitor(): Promise<void> {
    try {
      const today = getTodayDateString();
      const overviewRef = doc(db, 'analytics', 'overview');
      const dailyRef = doc(db, 'analytics_daily', today);

      await Promise.all([
        setDoc(
          overviewRef,
          {
            totalVisitors: increment(1),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(
          dailyRef,
          {
            date: today,
            visitors: increment(1),
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track visitor:', err);
    }
  },

  /**
   * Track item view by ID (when product/item page is opened).
   */
  async trackItemView(itemId: string, itemData?: any): Promise<void> {
    if (!itemId) return;
    try {
      const cleanId = String(itemId).trim();
      const safeKey = sanitizeKey(cleanId);
      const today = getTodayDateString();

      const overviewRef = doc(db, 'analytics', 'overview');
      const dailyRef = doc(db, 'analytics_daily', today);
      const itemRef = doc(db, 'analytics_items', cleanId);

      const itemPayload: any = {
        itemId: cleanId,
        viewCount: increment(1),
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
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track item view:', err);
    }
  },

  /**
   * Track favorite action (when favorite icon is clicked).
   */
  async trackFavorite(itemId: string, itemData?: any): Promise<void> {
    if (!itemId) return;
    try {
      const cleanId = String(itemId).trim();
      const safeKey = sanitizeKey(cleanId);
      const today = getTodayDateString();

      const overviewRef = doc(db, 'analytics', 'overview');
      const dailyRef = doc(db, 'analytics_daily', today);
      const itemRef = doc(db, 'analytics_items', cleanId);

      const itemPayload: any = {
        itemId: cleanId,
        favoriteCount: increment(1),
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
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track favorite:', err);
    }
  },

  /**
   * Track unfavorite action (when favorite icon is unselected).
   */
  async trackUnfavorite(itemId: string): Promise<void> {
    if (!itemId) return;
    try {
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
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ),
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track unfavorite:', err);
    }
  },

  /**
   * Track ordered item by ID (when order is submitted).
   */
  async trackItemOrder(itemId: string, quantity: number = 1, itemData?: any): Promise<void> {
    if (!itemId) return;
    try {
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
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track item order:', err);
    }
  },

  /**
   * Track rating submission for an item (recording count, rating value, rating sum, star breakdown & individual rating logs).
   */
  async trackRating(itemId: string, ratingStars: number, itemData?: any): Promise<void> {
    if (!itemId) return;
    try {
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
        [`starBreakdown.${stars}Star`]: increment(1),
        lastRatingGiven: stars,
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
            createdAt: serverTimestamp(),
          },
          { merge: true }
        ),
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track rating:', err);
    }
  },

  /**
   * Track user search queries across all search inputs with intelligent debouncing.
   * - Ignores queries < 3 characters (incomplete single/double letter fragments)
   * - Waits 1000ms after user stops typing before recording to Firestore
   * - Supports immediate execution when user submits form or selects a search result
   * - Deduplicates repeated identical queries
   */
  trackSearchQuery(query: string, context: string = 'general', immediate: boolean = false): void {
    if (!query || typeof query !== 'string') return;
    const cleanQuery = query.trim().toLowerCase();
    
    // Ignore incomplete 1-2 character fragments
    if (cleanQuery.length < 3) return;

    // Ignore if identical to the exact query recorded recently
    if (cleanQuery === lastRecordedQuery) return;

    const executeWrite = async () => {
      lastRecordedQuery = cleanQuery;
      try {
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
              lastSearchedAt: serverTimestamp(),
            },
            { merge: true }
          ),
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
      searchDebounceTimer = setTimeout(executeWrite, 1000); // 1-second pause delay
    }
  },

  /**
   * Track store view by storeId.
   */
  async trackStoreView(storeId: string, storeData?: any): Promise<void> {
    if (!storeId) return;
    try {
      const cleanId = String(storeId).trim();
      const safeKey = sanitizeKey(cleanId);
      const today = getTodayDateString();

      const overviewRef = doc(db, 'analytics', 'overview');
      const dailyRef = doc(db, 'analytics_daily', today);
      const storeRef = doc(db, 'analytics_stores', cleanId);

      const storePayload: any = {
        storeId: cleanId,
        viewCount: increment(1),
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
      ]);
    } catch (err) {
      console.warn('[Analytics] Failed to track store view:', err);
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
