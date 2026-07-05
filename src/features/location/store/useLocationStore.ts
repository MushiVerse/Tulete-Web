import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedLocation {
  id: string;
  address: string;
  lat: number;
  lng: number;
  specificInstructions?: string;
  imageUrl?: string;
  lastUsedAt: number;
}

interface LocationState {
  currentLocation: SavedLocation | null;
  savedLocations: SavedLocation[];
  setCurrentLocation: (location: SavedLocation) => void;
  addSavedLocation: (location: Omit<SavedLocation, 'id' | 'lastUsedAt'>) => void;
  removeSavedLocation: (id: string) => void;
  isPickerOpen: boolean;
  setPickerOpen: (isOpen: boolean) => void;
}

const cleanPlusCode = (address: string): string => {
  if (!address) return '';
  const cleaned = address.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}(,\s*)?/i, '');
  return cleaned.trim() || address;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      currentLocation: null,
      savedLocations: [],
      isPickerOpen: false,
      setPickerOpen: (isOpen) => set({ isPickerOpen: isOpen }),
      setCurrentLocation: (location) => set((state) => {
        const cleanedLocation = { ...location, address: cleanPlusCode(location.address) };
        const updatedSaved = state.savedLocations.map(loc => 
          loc.id === cleanedLocation.id ? { ...loc, ...cleanedLocation, lastUsedAt: Date.now() } : loc
        );
        return { currentLocation: cleanedLocation, savedLocations: updatedSaved };
      }),
      addSavedLocation: (location) => set((state) => {
        const cleanedAddr = cleanPlusCode(location.address);
        const newLocation: SavedLocation = {
          ...location,
          address: cleanedAddr,
          id: Date.now().toString(),
          lastUsedAt: Date.now(),
        };
        // Keep only top 5 recent locations
        const newSaved = [newLocation, ...state.savedLocations.filter(loc => loc.address !== cleanedAddr)].slice(0, 5);
        return { 
          savedLocations: newSaved,
          currentLocation: newLocation
        };
      }),
      removeSavedLocation: (id) => set((state) => ({
        savedLocations: state.savedLocations.filter((loc) => loc.id !== id),
        currentLocation: state.currentLocation?.id === id ? null : state.currentLocation
      })),
    }),
    {
      name: 'tulete-location-storage',
    }
  )
);
