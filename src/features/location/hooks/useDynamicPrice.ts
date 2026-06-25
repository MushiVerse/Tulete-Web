import { useState, useEffect } from 'react';
import { useLocationStore } from '../store/useLocationStore';
import { storeService } from '../../stores/services/storeService';

export function useDynamicPrice(basePrice: number, storeId?: string, isLaundry?: boolean) {
  const { currentLocation } = useLocationStore();
  const [magicPrice, setMagicPrice] = useState(basePrice);

  useEffect(() => {
    if (!currentLocation || !storeId) {
      setMagicPrice(basePrice);
      return;
    }

    const allStores = storeService.getMockStores();
    const store = allStores.find(s => s.id === storeId);
    
    if (store && store.location) {
      const R = 6371;
      const dLat = (store.location.lat - currentLocation.lat) * (Math.PI / 180);
      const dLon = (store.location.lng - currentLocation.lng) * (Math.PI / 180);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
                Math.cos(currentLocation.lat * (Math.PI / 180)) * Math.cos(store.location.lat * (Math.PI / 180)) * 
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = R * c;

      const roundedFee = distanceKm * 1000; // 1000 TZS per km

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
        
        setMagicPrice(basePrice + itemDeliveryFee);
      } else {
        setMagicPrice(basePrice + roundedFee);
      }
    } else {
      setMagicPrice(basePrice);
    }
  }, [basePrice, storeId, currentLocation, isLaundry]);

  return Math.round(magicPrice);
}
