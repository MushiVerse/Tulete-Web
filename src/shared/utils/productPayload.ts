import { getNormalizedRating } from './ratingUtils';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Safely resolves an image URL from any document data structure.
 * Handles arrays, alternative field names (imgURL, imgUrl, img1, imageUrl, image, images),
 * and provides a fallback placeholder if the image is missing.
 */
export function resolveImageUrl(data: any): string {
  if (!data) return 'https://firebasestorage.googleapis.com/v0/b/fast-tz.appspot.com/o/placeholder.png?alt=media';
  
  let raw: any = null;
  if (typeof data === 'string') {
    raw = data;
  } else if (typeof data === 'object') {
    const candidates = [
      data.imageUrl, data.imgURL, data.imgUrl, data.img1, data.image,
      (Array.isArray(data.images) ? data.images[0] : null),
      data.photo, data.pic, data.url
    ];
    raw = candidates.find((c: any) => {
      if (typeof c === 'string' && c.trim().length > 0) return true;
      if (Array.isArray(c) && c.length > 0 && typeof c[0] === 'string' && c[0].trim().length > 0) return true;
      return false;
    });
  }

  if (Array.isArray(raw)) {
    const first = raw.find((item: any) => typeof item === 'string' && item.trim().length > 0);
    if (first) return first;
  }
  if (typeof raw === 'string' && raw.trim().length > 0) return raw;
  
  return 'https://firebasestorage.googleapis.com/v0/b/fast-tz.appspot.com/o/placeholder.png?alt=media';
}

/**
 * Safely resolves the display and store category for any item, store, food, or product.
 * Inspects all possible subcategory and category fields across Firestore schemas.
 */
export function resolveItemCategory(item: any): string {
  if (!item) return 'Product';

  // 1. Laundry check
  const isLaundry = item.isLaundry ||
    String(item.category || item.cat || item.subCat || item._collection || '').toLowerCase().includes('laundry') ||
    String(item.category || item.cat || item.subCat || item._collection || '').toLowerCase().includes('nguo') ||
    item._collection === 'cloths' ||
    item.recordType === 'cloth';

  if (isLaundry) return 'Nguo';

  // 2. Search specific subcategory & category candidate fields
  const candidateKeys = [
    'subCat', 'subCategory', 'subcat', 'ecommerceSubCategory', 'foodSubCategory',
    'scat', 'speccat', 'specCat', 'subSubCat', 'subsubcat', 'mainCategory',
    'category', 'cate', 'cat'
  ];

  for (const key of candidateKeys) {
    const val = item[key];
    if (val && typeof val === 'string') {
      const trimmed = val.trim();
      const lower = trimmed.toLowerCase();
      if (
        trimmed.length > 0 &&
        lower !== 'product' &&
        lower !== 'products' &&
        lower !== 'all' &&
        lower !== 'store' &&
        lower !== 'item'
      ) {
        return trimmed;
      }
    }
  }

  // 3. Food check
  if (item.isFood || item._collection === 'foods' || item.recordType === 'food') return 'Food';

  // 4. Store check
  if (item.type === 'store' || item.recordType === 'store') return 'Store';

  // 5. Fallback to explicit category or cat if non-empty
  const fallback = item.category || item.cat || item.mainCategory;
  if (fallback && typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback.trim();
  }

  return 'Product';
}

/**
 * Builds a complete, non-empty Firestore payload for userViewed and userfavorites collections.
 * Ensures every single one of the 17 required fields has a valid, non-empty value.
 */
export function buildCompleteProductPayload(product: any, userId: string, extraFields: Record<string, any> = {}) {
  const foodId = String(product.id || product.foodId || extraFields.foodId || 'unknown_product');
  const name = String(product.name || product.nam1 || extraFields.name || 'Tulete Item');
  const price = Number(product.price ?? product.price1 ?? extraFields.price ?? 0);
  
  const combinedObj = { ...product, ...extraFields };
  const imgURL = resolveImageUrl(combinedObj);

  const brand = String(product.brand || product.pbrand || product.store || extraFields.brand || 'Tulete Store');
  
  const rawLoc = product.location || product.productloc || extraFields.location || '';
  let formattedLoc = '';
  if (typeof rawLoc === 'string') {
    formattedLoc = rawLoc.trim();
  } else if (rawLoc && typeof rawLoc === 'object') {
    if (rawLoc.lat != null && (rawLoc.lng != null || rawLoc.long != null)) {
      formattedLoc = `${rawLoc.lat},${rawLoc.lng ?? rawLoc.long}`;
    } else if (rawLoc.latitude != null && rawLoc.longitude != null) {
      formattedLoc = `${rawLoc.latitude},${rawLoc.longitude}`;
    } else if (rawLoc.address) {
      formattedLoc = String(rawLoc.address);
    } else {
      formattedLoc = String(rawLoc);
    }
  } else if (rawLoc) {
    formattedLoc = String(rawLoc);
  }
  if (!formattedLoc) formattedLoc = 'Dodoma, Tanzania';

  const description = String(product.description || product.desc || extraFields.description || 'Quality product available on Tulete.');
  
  const resolvedCategory = resolveItemCategory(combinedObj);
  const category = String(extraFields.category || product.category || resolvedCategory);
  const itemCat = String(extraFields.cat || product.cat || resolvedCategory);
  const subCat = String(product.subCat || product.subCategory || product.scat || extraFields.subCat || resolvedCategory);
  const subSubCat = String(product.subSubCat || product.subSubCcat || product.speccat || extraFields.subSubCat || subCat);
  const store = String(product.store || product.sto || brand || 'Tulete Store');
  const quantity = Number(product.quantity ?? product.quanty ?? product.idadi ?? product.count ?? extraFields.quantity ?? extraFields.idadi ?? 1);
  const availability = product.availability !== false && extraFields.availability !== false;
  
  const { rating: calculatedRating, reviewCount: calculatedReviewCount } = getNormalizedRating(product);
  
  let rates = product.rate || product.rates || extraFields.rate;
  if (!Array.isArray(rates) || rates.length === 0) {
    rates = [calculatedRating];
  }

  const uids = String(userId || product.userId || product.uid || extraFields.userId || 'guest_user');
  const timeStr = new Date().toISOString();

  const storeId = String(product.storeId || extraFields.storeId || product.store || store || 's1');
  const storeName = String(product.storeName || extraFields.storeName || product.store || store || 'Verified Partner');
  const rawCatLower = String(category || itemCat || product.cat || product.category || '').toLowerCase();
  const isLaundry = Boolean(product.isLaundry || extraFields.isLaundry || rawCatLower.includes('nguo') || rawCatLower.includes('laundry'));
  
  const isFood = !isLaundry && Boolean(
    product.isFood || 
    extraFields.isFood || 
    rawCatLower === 'food' || 
    rawCatLower === 'foods' || 
    String(product._collection || extraFields._collection || '').toLowerCase() === 'foods' ||
    ['food', 'foods', 'chakula', 'diko', 'restaurant', 'meal', 'meals', 'fast food', 'burgers', 'burger', 'pizza', 'breakfast', 'lunch', 'dinner', 'swahili', 'nyama choma', 'beverages', 'drinks', 'drink', 'juice', 'smoothie', 'snacks', 'desserts', 'bakery', 'cakes', 'chicken', 'chips', 'combo', 'coffee', 'tea'].some(k => rawCatLower.includes(k))
  );
  
  const isProduct = !isLaundry && !isFood;
  
  // Category string exact match for Flutter client (Product, food, Nguo)
  const flutterCat = isLaundry ? 'Nguo' : (isFood ? 'food' : 'Product');

  // Format location as valid numeric lat,lng string so Flutter's double.parse(split(',')) never fails
  let validCoordinatesLoc = '';
  if (typeof rawLoc === 'string' && rawLoc.includes(',')) {
    const parts = rawLoc.split(',');
    const p0 = parseFloat(parts[0]);
    const p1 = parseFloat(parts[1]);
    if (!isNaN(p0) && !isNaN(p1)) {
      validCoordinatesLoc = `${p0},${p1}`;
    }
  } else if (rawLoc && typeof rawLoc === 'object') {
    const lat = parseFloat(rawLoc.lat ?? rawLoc.latitude);
    const lng = parseFloat(rawLoc.lng ?? rawLoc.long ?? rawLoc.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      validCoordinatesLoc = `${lat},${lng}`;
    }
  }
  if (!validCoordinatesLoc) {
    validCoordinatesLoc = '-6.1630,35.7516'; // Fallback valid Dodoma coordinates
  }

  const washingSelected = product.washingSelected ?? extraFields.washingSelected ?? true;
  const ironingSelected = product.ironingSelected ?? extraFields.ironingSelected ?? false;
  const packagingSelected = product.packagingSelected ?? extraFields.packagingSelected ?? false;
  const vipSelected = product.vipSelected ?? extraFields.vipSelected ?? false;
  
  // Default deliverySlot based on category to avoid misclassification
  const hour = new Date().getHours();
  const isBrandNow = (brand.toLowerCase() === 'now' || String(product.brand || '').toLowerCase() === 'now');
  const defaultFoodSlot = isBrandNow ? 'ASAP' : (hour < 15 ? 'Lunch' : 'Dinner');
  const validSlots = isBrandNow ? ['ASAP', 'Lunch', 'Dinner', 'Mchana', 'Usiku'] : ['Lunch', 'Dinner', 'Mchana', 'Usiku'];
  const storedSlot = String(product.deliverySlot || extraFields.deliverySlot || '');
  const deliverySlot = isLaundry ? 'Laundry' : (isFood ? (validSlots.includes(storedSlot) ? storedSlot : defaultFoodSlot) : 'Product');
  const isDeliverySelected = product.isDeliverySelected ?? extraFields.isDeliverySelected ?? true;
  const packagepickup = product.packagepickup ?? extraFields.packagepickup ?? false;

  return {
    uid: uids,
    userId: uids,
    foodId,
    id: foodId,
    name,
    price,
    imgURL,
    chose: '',
    brand,
    location: validCoordinatesLoc,
    description,
    category: flutterCat,
    cat: flutterCat,
    subCat,
    subSubCat,
    store,
    storeId,
    storeName,
    isLaundry,
    isFood,
    isProduct,
    washingSelected,
    ironingSelected,
    packagingSelected,
    vipSelected,
    deliverySlot,
    isDeliverySelected,
    packagepickup,
    quantity,
    idadi: quantity,
    count: quantity,
    total: price,
    availability: true,
    fav: true,
    cancel: false,
    rating: calculatedRating,
    reviewCount: calculatedReviewCount,
    rate: rates,
    time: timeStr,
    ...extraFields,
  };
}

