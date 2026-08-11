import { algoliasearch } from 'algoliasearch';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

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
}

export function isValidSearchItem(item: any, options?: { allowStoresAndBrands?: boolean }): boolean {
  if (!item || typeof item !== 'object') return false;

  const allowStoresAndBrands = options?.allowStoresAndBrands ?? false;

  // 1. Exclude store and brand documents ONLY when searching for regular products
  const recordType = String(item.recordType || item.type || '').toLowerCase();
  const cat = String(item.category || item.cat || '').toLowerCase();
  const isExplicitStore = 
    recordType === 'store' || 
    recordType === 'foodstore' || 
    recordType === 'brand' || 
    item.isStore === true || 
    cat === 'store';

  if (isExplicitStore && !allowStoresAndBrands) {
    return false;
  }

  // 2. Must have a valid ID
  const id = item.objectID || item.id || item.foodId;
  if (!id || String(id).trim().length === 0) return false;

  // 3. Must have a valid, non-placeholder name
  const name = item.name || item.nam1;
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

// Helper function to query the unified index
export const searchTuleteItems = async (
  query: string, 
  filtersOrOptions?: string | SearchOptions
) => {
  const options = typeof filtersOrOptions === 'string' 
    ? { filters: filtersOrOptions } 
    : filtersOrOptions || {};

  const filterStr = options.filters || '';
  const allowStoresAndBrands = 
    Boolean(options.includeStoresAndBrands) || 
    filterStr.includes('recordType:brand') || 
    filterStr.includes('recordType:store');

  try {
    const { results } = await algoliaClient.search({
      requests: [
        {
          indexName: 'tulete_items',
          query,
          ...options,
        },
      ],
    });
    const res = (results[0] as any) || {};
    const rawHits = (res.hits || []) as any[];
    const validHits = rawHits.filter(hit => isValidSearchItem(hit, { allowStoresAndBrands }));

    // Attach pagination metadata onto array for components that need page/nbPages
    const resultArr: any = validHits;
    resultArr.hits = validHits;
    resultArr.page = res.page ?? 0;
    resultArr.nbPages = res.nbPages ?? 1;
    resultArr.nbHits = res.nbHits ?? validHits.length;
    resultArr.rawCount = rawHits.length;

    return resultArr;
  } catch (error) {
    console.error('Algolia Search Error:', error);
    const emptyArr: any = [];
    emptyArr.hits = [];
    emptyArr.page = 0;
    emptyArr.nbPages = 0;
    emptyArr.nbHits = 0;
    emptyArr.rawCount = 0;
    return emptyArr;
  }
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
