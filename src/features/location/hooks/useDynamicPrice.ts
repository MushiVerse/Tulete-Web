import { useState, useEffect } from 'react';
import { useLocationStore } from '../store/useLocationStore';
import { storeService } from '../../stores/services/storeService';

export function getDeliveryFee(
  currentLocation: { lat: number; lng: number } | null,
  productLocation?: { lat: number; lng: number },
  storeId?: string,
  isLaundry?: boolean,
  isDeliverySelected?: boolean
): number {
  if (!currentLocation) return 0;

  let targetLocation = productLocation;

  if (!targetLocation && storeId) {
    const allStores = storeService.getMockStores();
    const store = allStores.find(s => s.id === storeId);
    if (store && store.location) {
      targetLocation = store.location;
    }
  }

  if (targetLocation) {
    const R = 6371;
    const dLat = (targetLocation.lat - currentLocation.lat) * (Math.PI / 180);
    const dLon = (targetLocation.lng - currentLocation.lng) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
              Math.cos(currentLocation.lat * (Math.PI / 180)) * Math.cos(targetLocation.lat * (Math.PI / 180)) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    let calculatedFee = distanceKm * 1000;
    if (distanceKm > 150) {
      calculatedFee = 15000;
    }
    const roundedFee = Math.round(calculatedFee);

    if (isLaundry) {
      if (isDeliverySelected !== false) {
        if (roundedFee <= 0) return 50;
        if (roundedFee < 2000) return 0;
        if (roundedFee <= 3000) return 200;
        if (roundedFee <= 5000) return 300;
        if (roundedFee <= 7000) return 400;
        if (roundedFee <= 9000) return 500;
        if (roundedFee <= 15000) return 700;
        return 1200;
      }
      return 0;
    } else {
      return isDeliverySelected === false ? 0 : roundedFee;
    }
  }
  
  return 0;
}

export function useDynamicPrice(
  basePrice: number, 
  storeId?: string, 
  isLaundry?: boolean, 
  productLocation?: { lat: number; lng: number },
  isDeliverySelected?: boolean
) {
  const { currentLocation } = useLocationStore();
  const [magicPrice, setMagicPrice] = useState(basePrice);

  useEffect(() => {
    if (!currentLocation) {
      setMagicPrice(basePrice);
      return;
    }
    
    const fee = getDeliveryFee(currentLocation, productLocation, storeId, isLaundry, isDeliverySelected);
    setMagicPrice(Number(basePrice) + fee);
  }, [basePrice, storeId, currentLocation, isLaundry, productLocation?.lat, productLocation?.lng, isDeliverySelected]);

  return Math.round(magicPrice);
}
