import { algoliasearch } from 'algoliasearch';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { analyticsService } from '../../services/analyticsService';
import { isItemFuzzyMatch } from '../../shared/utils/fuzzyMatch';

const APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID || 'IU2RKVQF8F';
const SEARCH_KEY = import.meta.env.VITE_ALGOLIA_SEARCH_KEY || '25b7fb23ef5b9383d5d399c29a1472ad';

// Safe client for searching
export const algoliaClient = algoliasearch(APP_ID, SEARCH_KEY);

export interface SearchOptions {
  filters?: string;
  numericFilters?: string[];
  hitsPerPage?: number;
  page?: number;
  aroundLatLng?: string;
  includeStoresAndBrands?: boolean;
  context?: string;
}

export function isValidSearchItem(item: any, options?: { allowStoresAndBrands?: boolean }): boolean {
  if (!item || typeof item !== 'object') return false;

  const allowStoresAndBrands = options?.allowStoresAndBrands ?? false;

  // 1. Exclude store and brand documents ONLY when searching for regular products & food
  const recordType = String(item.recordType || item.type || item._collection || '').toLowerCase();
  const cat = String(item.category || item.cat || '').toLowerCase();
  const isExplicitStore = 
    recordType === 'store' || 
    recordType === 'foodstore' || 
    recordType === 'foodstores' ||
    recordType === 'brand' || 
    recordType === 'brands' ||
    item.isStore === true || 
    cat === 'store';

  if (isExplicitStore && !allowStoresAndBrands) {
    return false;
  }

  // 2. Must have a valid ID
  const id = item.objectID || item.id || item.foodId;
  if (!id || String(id).trim().length === 0) return false;

  // 3. Must have a valid, non-placeholder name
  const name = item.name || item.nam1 || item.title || item.name1;
  if (!name || typeof name !== 'string' || name.trim().length === 0) return false;
  const lowerName = name.trim().toLowerCase();
  if (['null', 'undefined', 'test', 'no name', 'unknown', 'dummy', 'temp', 'delete'].includes(lowerName)) return false;

  // 4. Must be available
  if (
    item.availability === false ||
    item.availability === 'false' ||
    item.available === false ||
    item.isAvailable === false
  ) {
    return false;
  }

  // 5. Must have valid non-negative price if price field is present
  const rawPrice = item.price ?? item.price1;
  if (rawPrice !== undefined && rawPrice !== null) {
    const priceNum = Number(rawPrice);
    if (isNaN(priceNum) || priceNum < 0) return false;
  }

  return true;
}

// Cache for Firestore fallback items
let firestoreCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

async function getFirestoreFallbackItems(): Promise<any[]> {
  const now = Date.now();
  if (firestoreCache && now - firestoreCache.timestamp < CACHE_TTL_MS) {
    return firestoreCache.data;
  }

  try {
    const collectionsToFetch = [
      { name: 'foods', type: 'food' },
      { name: 'products', type: 'product' },
      { name: 'cloths', type: 'cloth' },
      { name: 'foodStores', type: 'store' }
    ];

    const results = await Promise.allSettled(
      collectionsToFetch.map(async (col) => {
        const snap = await getDocs(collection(db, col.name));
        return snap.docs.map((d) => ({
          objectID: d.id,
          id: d.id,
          recordType: col.type,
          _collection: col.name,
          ...d.data(),
        }));
      })
    );

    const items: any[] = [];
    results.forEach((res) => {
      if (res.status === 'fulfilled') {
        items.push(...res.value);
      }
    });

    firestoreCache = { data: items, timestamp: now };
    return items;
  } catch (e) {
    console.warn('Firestore fallback fetch error:', e);
    return firestoreCache ? firestoreCache.data : [];
  }
}

async function searchFirestoreFallback(
  query: string,
  options: SearchOptions,
  allowStoresAndBrands: boolean
) {
  const allItems = await getFirestoreFallbackItems();
  const filterStr = String(options.filters || '').toLowerCase();

  // Determine category constraints from filter string
  const isFoodFilter = filterStr.includes('food');
  const isProductFilter = filterStr.includes('product');
  const isLaundryFilter = filterStr.includes('cloth') || filterStr.includes('laundry') || filterStr.includes('nguo');

  let filtered = allItems.filter((item) => {
    if (!isValidSearchItem(item, { allowStoresAndBrands })) return false;

    // Filter by record type / category if explicit filter requested
    if (isFoodFilter) {
      const recType = String(item.recordType || item._collection || item.type || '').toLowerCase();
      const catStr = String(item.category || item.cat || item.foodCategory || item.speccat || item.mainCategory || '').toLowerCase();
      const isFood = 
        recType.includes('food') || 
        recType.includes('store') ||
        item._collection === 'foods' ||
        item._collection === 'foodStores' ||
        item.isFood === true ||
        catStr.includes('food') ||
        catStr.includes('dish') ||
        catStr.includes('beverage') ||
        catStr.includes('drink') ||
        catStr.includes('dessert') ||
        catStr.includes('breakfast') ||
        catStr.includes('kitchen') ||
        catStr.includes('swahili') ||
        catStr.includes('healthy') ||
        catStr.includes('local') ||
        catStr.includes('fast') ||
        catStr.includes('nyama') ||
        catStr.includes('pizza') ||
        catStr.includes('burger');
      if (!isFood) return false;
    } else if (isProductFilter) {
      const isProduct = item.recordType === 'product' || item._collection === 'products' || String(item.category || item.cat || '').toLowerCase().includes('product') || String(item.category || item.cat || '').toLowerCase().includes('shopping');
      if (!isProduct) return false;
    } else if (isLaundryFilter) {
      const isLaundry = item.recordType === 'cloth' || item._collection === 'cloths' || String(item.category || item.cat || '').toLowerCase().includes('laundry') || String(item.category || item.cat || '').toLowerCase().includes('nguo');
      if (!isLaundry) return false;
    }

    if (!query || !query.trim()) return true;

    return isItemFuzzyMatch(query, item, [
      'name',
      'nam1',
      'title',
      'brand',
      'pbrand',
      'store',
      'storeName',
      'restaurant',
      'category',
      'cat',
      'subCat',
      'subcat',
      'subCategory',
      'subsubCat',
      'foodCategory',
      'foodSubCategory',
      'foodSubSubCategory',
      'speccat',
      'mainCategory',
      'tags',
      'description',
      'desc',
    ]);
  });

  const hitsPerPage = options.hitsPerPage || 20;
  const page = options.page || 0;

  const totalHits = filtered.length;
  const totalPages = Math.ceil(totalHits / hitsPerPage) || 1;
  const startIndex = page * hitsPerPage;
  const paginatedHits = filtered.slice(startIndex, startIndex + hitsPerPage);

  const resultArr: any = paginatedHits;
  resultArr.hits = paginatedHits;
  resultArr.page = page;
  resultArr.nbPages = totalPages;
  resultArr.nbHits = totalHits;
  resultArr.rawCount = paginatedHits.length;

  return resultArr;
}

// Helper function to query the unified index with Firestore fallback
export const searchTuleteItems = async (
  query: string, 
  filtersOrOptions?: string | SearchOptions
) => {
  const options = typeof filtersOrOptions === 'string' 
    ? { filters: filtersOrOptions } 
    : filtersOrOptions || {};

  if (query && typeof query === 'string' && query.trim().length >= 3 && options.context) {
    analyticsService.trackSearchQuery(query.trim(), options.context);
  }

  const filterStr = String(options.filters || '').toLowerCase();
  const allowStoresAndBrands = 
    Boolean(options.includeStoresAndBrands) || 
    filterStr.includes('recordType:brand') || 
    filterStr.includes('recordType:store');

  // Sanitize params specifically for Algolia request to prevent unknown parameter rejection
  const algoliaParams: any = {
    indexName: 'tulete_items',
    query: query || '',
  };
  if (options.filters) algoliaParams.filters = options.filters;
  if (options.numericFilters) algoliaParams.numericFilters = options.numericFilters;
  if (options.hitsPerPage !== undefined) algoliaParams.hitsPerPage = options.hitsPerPage;
  if (options.page !== undefined) algoliaParams.page = options.page;
  if (options.aroundLatLng) algoliaParams.aroundLatLng = options.aroundLatLng;

  try {
    const { results } = await algoliaClient.search({
      requests: [algoliaParams],
    });
    const res = (results[0] as any) || {};
    const rawHits = (res.hits || []) as any[];
    const validHits = rawHits.filter(hit => isValidSearchItem(hit, { allowStoresAndBrands }));

    if (validHits.length > 0) {
      const resultArr: any = validHits;
      resultArr.hits = validHits;
      resultArr.page = res.page ?? 0;
      resultArr.nbPages = res.nbPages ?? 1;
      resultArr.nbHits = res.nbHits ?? validHits.length;
      resultArr.rawCount = rawHits.length;
      return resultArr;
    }
  } catch (error) {
    console.warn('Algolia Search Warning/Fallback:', error);
  }

  // Fallback to Firestore when Algolia returns 0 hits or errors out
  return searchFirestoreFallback(query, options, allowStoresAndBrands);
};

/**
 * DEVELOPMENT ONLY: ONE-TIME SYNC FUNCTION
 * This uses the Write API Key provided by the user.
 * Do not run this on the client side in production!
 */
export const runAlgoliaBackfill = async () => {
  const WRITE_KEY = '5d512830694f945096cb870d6daf8854';
  const adminClient = algoliasearch(APP_ID, WRITE_KEY);

  console.log('Starting Algolia Backfill...');
  
  try {
    const collectionsToSync = [
      { name: 'foods', type: 'food' },
      { name: 'products', type: 'product' },
      { name: 'cloths', type: 'cloth' },
      { name: 'foodStores', type: 'store' },
      { name: 'brands', type: 'brand' }
    ];

    let totalSynced = 0;

    for (const col of collectionsToSync) {
      console.log(`Fetching collection: ${col.name}...`);
      const snapshot = await getDocs(collection(db, col.name));
      
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Handle Geo-Location for Algolia if exists
        let _geoloc;
        if (data.location && typeof data.location === 'string') {
          const [lat, lng] = data.location.split(',');
          if (lat && lng) {
            _geoloc = { lat: parseFloat(lat), lng: parseFloat(lng) };
          }
        }

        return {
          objectID: doc.id,
          recordType: col.type,
          ...data,
          ...( _geoloc && { _geoloc })
        };
      });

      if (records.length > 0) {
        console.log(`Pushing ${records.length} records to Algolia for ${col.name}...`);
        await adminClient.saveObjects({ indexName: 'tulete_items', objects: records as any });
        totalSynced += records.length;
      }
    }

    console.log(`Backfill Complete! Synced ${totalSynced} records to Algolia.`);
    alert(`Backfill Complete! Synced ${totalSynced} records to Algolia.`);
  } catch (error) {
    console.error('Backfill failed:', error);
    alert('Backfill failed. See console.');
  }
};

export const fixAlgoliaFacets = async () => {
  const WRITE_KEY = '5d512830694f945096cb870d6daf8854';
  const adminClient = algoliasearch(APP_ID, WRITE_KEY);
  console.log('Fixing Algolia Facets...');
  try {
    await adminClient.setSettings({
      indexName: 'tulete_items',
      indexSettings: {
        attributesForFaceting: ['recordType', 'category', 'category1', 'brand', 'store']
      }
    });
    console.log('Facets fixed successfully!');
  } catch (err) {
    console.error('Failed to fix facets:', err);
  }
};

(window as any).runAlgoliaBackfill = runAlgoliaBackfill;
(window as any).fixAlgoliaFacets = fixAlgoliaFacets;
