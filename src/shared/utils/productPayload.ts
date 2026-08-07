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
    raw = data.imgURL ?? data.imgUrl ?? data.img1 ?? data.imageUrl ?? data.image ?? (Array.isArray(data.images) ? data.images[0] : null);
  }

  if (Array.isArray(raw)) {
    const first = raw.find((item: any) => typeof item === 'string' && item.trim().length > 0);
    if (first) return first;
  }
  if (typeof raw === 'string' && raw.trim().length > 0) return raw;
  
  return 'https://firebasestorage.googleapis.com/v0/b/fast-tz.appspot.com/o/placeholder.png?alt=media';
}

/**
 * Builds a complete, non-empty Firestore payload for userViewed and userfavorites collections.
 * Ensures every single one of the 17 required fields has a valid, non-empty value.
 */
export function buildCompleteProductPayload(product: any, userId: string, extraFields: Record<string, any> = {}) {
  const foodId = String(product.id || product.foodId || extraFields.foodId || 'unknown_product');
  const name = String(product.name || product.nam1 || extraFields.name || 'Tulete Item');
  const price = Number(product.price ?? product.price1 ?? extraFields.price ?? 0);
  
  const imgURL = resolveImageUrl(product.imgUrl || product.imgURL || product.img1 || extraFields.imgURL || product);

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
  const category = String(product.category || product.cate || product.cat || extraFields.category || 'Product');
  const itemCat = String(product.cat || product.specCat || product.category || extraFields.cat || category);
  const subCat = String(product.subCat || product.subCategory || product.scat || extraFields.subCat || itemCat);
  const subSubCat = String(product.subSubCat || product.subSubCcat || product.speccat || extraFields.subSubCat || subCat);
  const store = String(product.store || product.sto || brand || 'Tulete Store');
  const quantity = Number(product.quantity ?? product.quanty ?? product.count ?? extraFields.quantity ?? 1);
  const availability = product.availability !== false && extraFields.availability !== false;
  
  let rates = product.rate || product.rates || extraFields.rate;
  if (!Array.isArray(rates) || rates.length === 0) {
    const rNum = Number(product.rating || extraFields.rating || 4.8);
    rates = [isNaN(rNum) ? 4.8 : rNum];
  }

  const uids = String(userId || product.userId || product.uid || extraFields.userId || 'guest_user');
  const timeStr = new Date().toISOString();

  const storeId = String(product.storeId || extraFields.storeId || product.store || store || 's1');
  const storeName = String(product.storeName || extraFields.storeName || product.store || store || 'Verified Partner');
  const isLaundry = Boolean(product.isLaundry || extraFields.isLaundry || category === 'Nguo' || category === 'Laundry' || itemCat === 'Nguo' || itemCat === 'Laundry');
  const isFood = Boolean(product.isFood || extraFields.isFood || category === 'Food' || itemCat === 'Food');
  
  const washingSelected = product.washingSelected ?? extraFields.washingSelected ?? true;
  const ironingSelected = product.ironingSelected ?? extraFields.ironingSelected ?? false;
  const packagingSelected = product.packagingSelected ?? extraFields.packagingSelected ?? false;
  const vipSelected = product.vipSelected ?? extraFields.vipSelected ?? false;
  
  const deliverySlot = String(product.deliverySlot || extraFields.deliverySlot || 'ASAP');
  const isDeliverySelected = product.isDeliverySelected ?? extraFields.isDeliverySelected ?? true;
  const packagepickup = product.packagepickup ?? extraFields.packagepickup ?? false;

  return {
    foodId,
    name,
    price,
    imgURL,
    brand,
    location: formattedLoc,
    description,
    category,
    cat: itemCat,
    subCat,
    subSubCat,
    store,
    storeId,
    storeName,
    isLaundry,
    isFood,
    washingSelected,
    ironingSelected,
    packagingSelected,
    vipSelected,
    deliverySlot,
    isDeliverySelected,
    packagepickup,
    quantity,
    availability,
    rate: rates,
    time: timeStr,
    userId: uids,
    ...extraFields,
  };
}
