import { useState, useEffect } from 'react';
import { useLocationStore } from '../store/useLocationStore';
import { storeService } from '../../stores/services/storeService';

/**
 * TZS Rounding function (matches Flutter roundUp logic)
 */
export function roundUp(price: number): number {
  const p = Math.round(price);
  if (p >= 1000) {
    const lastTwoDigits = Math.floor(p / 10) % 10;
    if (lastTwoDigits < 5) {
      return Math.floor(p / 100) * 100;
    } else if (lastTwoDigits === 5 && p % 100 === 0) {
      return Math.floor(p / 100) * 100;
    } else {
      return (Math.floor(p / 100) + 1) * 100;
    }
  } else {
    const lastTwoDigits = p % 100;
    if (lastTwoDigits === 0) {
      return Math.floor(p / 100) * 100;
    } else if (lastTwoDigits < 50) {
      return Math.floor(p / 100) * 100;
    } else {
      return (Math.floor(p / 100) + 1) * 100;
    }
  }
}

/**
 * Single delivery fee calculation algorithm using Haversine formula and roundUp.
 * Strictly returns 0 for Laundry items (cat === 'Nguo' or isLaundry === true).
 */
export function calculateDeliveryFeeAlgorithm(
  productLocation: string | { lat: number; lng: number } | null | undefined,
  userLocation: string | { lat: number; lng: number } | null | undefined,
  deliveryRation: number = 1000,
  category?: string,
  isLaundry?: boolean
): number {
  if (category === 'Nguo' || isLaundry === true) {
    return 0;
  }
  if (!productLocation || !userLocation) return 0;

  try {
    let productLatt: number;
    let productLongg: number;
    let userLatt: number;
    let userLongg: number;

    if (typeof productLocation === 'string') {
      const prodCodiList = productLocation.split(',');
      if (prodCodiList.length < 2) return 0;
      productLatt = parseFloat(prodCodiList[0].trim());
      productLongg = parseFloat(prodCodiList[1].trim());
    } else {
      productLatt = productLocation.lat;
      productLongg = productLocation.lng;
    }

    if (typeof userLocation === 'string') {
      const userCodiList = userLocation.split(',');
      if (userCodiList.length < 2) return 0;
      userLatt = parseFloat(userCodiList[0].trim());
      userLongg = parseFloat(userCodiList[1].trim());
    } else {
      userLatt = userLocation.lat;
      userLongg = userLocation.lng;
    }

    if (isNaN(productLatt) || isNaN(productLongg) || isNaN(userLatt) || isNaN(userLongg)) {
      return 0;
    }

    const p = 0.017453292519943295;
    const a =
      0.5 -
      Math.cos((userLatt - productLatt) * p) / 2 +
      (Math.cos(productLatt * p) *
        Math.cos(userLatt * p) *
        (1 - Math.cos((userLongg - productLongg) * p))) /
        2;

    const distanceRatio = 12742 * Math.asin(Math.sqrt(a));
    const km = distanceRatio <= 0.05 ? 0 : Math.ceil(distanceRatio);
    const deliveryFee = roundUp(km * deliveryRation);
    return deliveryFee;
  } catch (e) {
    console.error('shida iko', e);
    return 0;
  }
}

export function getDeliveryFee(
  currentLocation: { lat: number; lng: number } | null,
  productLocation?: { lat: number; lng: number } | string,
  storeId?: string,
  isLaundry?: boolean,
  isDeliverySelected?: boolean,
  category?: string,
  deliveryRation: number = 1000
): number {
  if (isLaundry || category === 'Nguo' || isDeliverySelected === false) {
    return 0;
  }

  // Fallback to default Dodoma center coordinates if user location is null
  const effectiveUserLocation = currentLocation || { lat: -6.18541, lng: 35.7671293 };
  let targetLocation = productLocation;

  // If productLocation is missing or invalid text string without lat,lng coordinates
  if (!targetLocation || (typeof targetLocation === 'string' && targetLocation.split(',').length < 2)) {
    if (storeId) {
      const allStores = storeService.getMockStores();
      const store = allStores.find((s) => s.id === storeId || s.name?.toLowerCase() === storeId.toLowerCase());
      if (store && store.location) {
        targetLocation = store.location;
      }
    }
  }

  // Default fallback to Dodoma hub coordinates if target location is still not GPS coordinates
  if (!targetLocation || (typeof targetLocation === 'string' && targetLocation.split(',').length < 2)) {
    targetLocation = "-6.18541, 35.7671293";
  }

  return calculateDeliveryFeeAlgorithm(targetLocation, effectiveUserLocation, deliveryRation, category, isLaundry);
}

export function getItemPriceWithDelivery(
  basePrice: number,
  currentLocation: { lat: number; lng: number } | null,
  productLocation?: { lat: number; lng: number } | string,
  storeId?: string,
  isLaundry?: boolean,
  isDeliverySelected?: boolean,
  category?: string,
  deliveryRation: number = 1000
): number {
  const fee = getDeliveryFee(
    currentLocation,
    productLocation,
    storeId,
    isLaundry,
    isDeliverySelected,
    category,
    deliveryRation
  );
  return Math.round(Number(basePrice) + fee);
}

export function useDynamicPrice(
  basePrice: number,
  storeId?: string,
  isLaundry?: boolean,
  productLocation?: { lat: number; lng: number } | string,
  isDeliverySelected?: boolean,
  category?: string
) {
  const { currentLocation } = useLocationStore();
  const [magicPrice, setMagicPrice] = useState(basePrice);

  useEffect(() => {
    if (!currentLocation) {
      setMagicPrice(basePrice);
      return;
    }

    const priceWithFee = getItemPriceWithDelivery(
      basePrice,
      currentLocation,
      productLocation,
      storeId,
      isLaundry,
      isDeliverySelected,
      category
    );
    setMagicPrice(priceWithFee);
  }, [
    basePrice,
    storeId,
    currentLocation?.lat,
    currentLocation?.lng,
    currentLocation?.address,
    isLaundry,
    typeof productLocation === 'string'
      ? productLocation
      : `${productLocation?.lat},${productLocation?.lng}`,
    isDeliverySelected,
    category,
  ]);

  return Math.round(magicPrice);
}
