import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { locationService, GeoLocation, AddressItem } from '../services/locationService';

interface LocationStore {
  currentLocation: GeoLocation | null;
  currentAddressString: string;
  addressList: AddressItem[];
  selectedAddressId: string | null;
  
  // Real-time Driver Tracker State
  driverLocation: GeoLocation | null;
  activeRoutePath: GeoLocation[];
  trackingStepIndex: number;
  isSimulating: boolean;

  // Actions
  initialize: (userId: string) => void;
  detectCurrentLocation: () => Promise<GeoLocation>;
  saveAddress: (userId: string, address: Omit<AddressItem, 'id' | 'userId'> & { id?: string }) => void;
  selectAddress: (addressId: string) => void;
  setDefaultAddress: (addressId: string) => void;
  deleteAddress: (addressId: string) => void;
  
  // Realtime routing simulator actions
  startDriverSimulation: (start: GeoLocation, end: GeoLocation) => void;
  stopDriverSimulation: () => void;
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      currentLocation: { lat: -6.1630, lng: 35.7516 }, // Dodoma Tanzania default hub
      currentAddressString: 'Central Dodoma, Tanzania',
      addressList: [],
      selectedAddressId: null,
      
      driverLocation: null,
      activeRoutePath: [],
      trackingStepIndex: 0,
      isSimulating: false,

      initialize: (_userId) => {
        const currentList = get().addressList;
        // Clean out legacy dummy addresses & fix Map Selection Pin titles to actual address values
        let hasChanges = false;
        const cleanList = currentList
          .filter(a =>
            a.id !== 'addr_home' &&
            a.id !== 'addr_office' &&
            !a.title?.toLowerCase().includes('kisasa') &&
            !a.title?.toLowerCase().includes('central office') &&
            !a.city?.toLowerCase().includes('nairobi') &&
            !a.addressLine?.toLowerCase().includes('nairobi')
          )
          .map(a => {
            if (a.title?.toLowerCase().includes('map selection')) {
              hasChanges = true;
              const actualVal = a.addressLine?.split(',')[0].trim() || a.city || 'Location';
              return { ...a, title: actualVal };
            }
            return a;
          });

        if (cleanList.length !== currentList.length || hasChanges) {
          set({
            addressList: cleanList,
            selectedAddressId: cleanList[0]?.id || null,
          });
        }
      },

      detectCurrentLocation: async () => {
        try {
          const pos = await locationService.getCurrentPosition();
          const address = await locationService.reverseGeocode(pos.lat, pos.lng);
          
          set({
            currentLocation: pos,
            currentAddressString: address,
          });
          return pos;
        } catch (error) {
          // Fallback to defaults on blocking permissions
          const fallbackPos = { lat: -6.1630, lng: 35.7516 };
          set({
            currentLocation: fallbackPos,
            currentAddressString: 'Dodoma, Tanzania (Default GPS)',
          });
          return fallbackPos;
        }
      },

      saveAddress: (userId, addressData) => {
        const list = [...get().addressList];
        const isEdit = !!addressData.id;
        const targetId = addressData.id || `addr_${Date.now()}`;

        const item: AddressItem = {
          id: targetId,
          userId,
          title: addressData.title,
          addressLine: addressData.addressLine,
          city: addressData.city,
          location: addressData.location,
          isDefault: addressData.isDefault,
        };

        if (addressData.isDefault) {
          // Clear defaults on others
          list.forEach((a) => { a.isDefault = false; });
        }

        if (isEdit) {
          const index = list.findIndex((a) => a.id === targetId);
          if (index !== -1) list[index] = item;
        } else {
          list.push(item);
        }

        set({
          addressList: list,
          selectedAddressId: targetId,
        });
      },

      selectAddress: (addressId) => {
        set({ selectedAddressId: addressId });
      },

      setDefaultAddress: (addressId) => {
        const list = get().addressList.map((a) => ({
          ...a,
          isDefault: a.id === addressId,
        }));
        set({ addressList: list, selectedAddressId: addressId });
      },

      deleteAddress: (addressId) => {
        const list = get().addressList.filter((a) => a.id !== addressId);
        const activeId = get().selectedAddressId === addressId 
          ? (list[0]?.id || null) 
          : get().selectedAddressId;
        
        set({ addressList: list, selectedAddressId: activeId });
      },

      startDriverSimulation: (start, end) => {
        // Stop any active simulations first
        get().stopDriverSimulation();

        // Calculate travel steps
        const details = locationService.getTravelDirections(start, end);
        
        set({
          activeRoutePath: details.routePath,
          driverLocation: details.routePath[0],
          trackingStepIndex: 0,
          isSimulating: true,
        });

        // Set interval loops updating positions every 1.5 seconds representing actual moves!
        const intervalId = setInterval(() => {
          const { activeRoutePath, trackingStepIndex } = get();
          
          if (trackingStepIndex >= activeRoutePath.length - 1) {
            // Reached destination, stop simulation loop
            clearInterval(intervalId);
            set({ isSimulating: false, trackingStepIndex: activeRoutePath.length - 1 });
            return;
          }

          const nextIndex = trackingStepIndex + 1;
          set({
            trackingStepIndex: nextIndex,
            driverLocation: activeRoutePath[nextIndex],
          });
        }, 1500);

        // Save interval reference to global window for cleanup
        (window as any)._driverTrackerId = intervalId;
      },

      stopDriverSimulation: () => {
        const intervalId = (window as any)._driverTrackerId;
        if (intervalId) {
          clearInterval(intervalId);
          (window as any)._driverTrackerId = null;
        }
        set({ isSimulating: false, driverLocation: null, activeRoutePath: [] });
      },
    }),
    {
      name: 'tulete_location_storage', // Persist addresses
      partialize: (state) => ({
        addressList: state.addressList,
        selectedAddressId: state.selectedAddressId,
        currentLocation: state.currentLocation,
        currentAddressString: state.currentAddressString,
      }),
    }
  )
);
