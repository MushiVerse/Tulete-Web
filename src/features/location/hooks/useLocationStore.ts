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
      currentLocation: { lat: -1.2915, lng: 36.7900 }, // Nairobi Kilimani hub default
      currentAddressString: 'Wood Avenue, Kilimani, Nairobi, Kenya',
      addressList: [],
      selectedAddressId: null,
      
      driverLocation: null,
      activeRoutePath: [],
      trackingStepIndex: 0,
      isSimulating: false,

      initialize: (userId) => {
        if (get().addressList.length > 0) return;

        const mockAddrs = locationService.getMockAddresses(userId);
        const defaultAddr = mockAddrs.find((a) => a.isDefault);
        
        set({
          addressList: mockAddrs,
          selectedAddressId: defaultAddr ? defaultAddr.id : (mockAddrs[0]?.id || null),
        });
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
          const fallbackPos = { lat: -1.2915, lng: 36.7900 };
          set({
            currentLocation: fallbackPos,
            currentAddressString: 'Wood Avenue, Kilimani, Nairobi (Default GPS)',
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
