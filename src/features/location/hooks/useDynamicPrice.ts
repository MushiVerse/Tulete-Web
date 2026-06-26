import { useState, useEffect } from 'react';
import { useLocationStore } from '../store/useLocationStore';
import { storeService } from '../../stores/services/storeService';

export function useDynamicPrice(basePrice: number, storeId?: string, isLaundry?: boolean, productLocation?: { lat: number; lng: number }) {
  const { currentLocation } = useLocationStore();
  const [magicPrice, setMagicPrice] = useState(basePrice);

  useEffect(() => {
    if (!currentLocation) {
      setMagicPrice(basePrice);
      return;
    }

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
        let itemDeliveryFee = 0;
        if (roundedFee <= 0) { itemDeliveryFee = 50; }
        else if (roundedFee < 2000) { itemDeliveryFee = 0; }
        else if (roundedFee <= 3000) { itemDeliveryFee = 200; }
        else if (roundedFee <= 5000) { itemDeliveryFee = 300; }
        else if (roundedFee <= 7000) { itemDeliveryFee = 400; }
        else if (roundedFee <= 9000) { itemDeliveryFee = 500; }
        else if (roundedFee <= 15000) { itemDeliveryFee = 700; }
        else { itemDeliveryFee = 1200; }
        
        setMagicPrice(Number(basePrice) + itemDeliveryFee);
      } else {
        setMagicPrice(Number(basePrice) + roundedFee);
      }
    } else {
      setMagicPrice(Number(basePrice));
    }
  }, [basePrice, storeId, currentLocation, isLaundry, productLocation?.lat, productLocation?.lng]);

  return Math.round(magicPrice);
}
