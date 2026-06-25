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
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      currentLocation: null,
      savedLocations: [],
      setCurrentLocation: (location) => set((state) => {
        // Also update the lastUsedAt in the savedLocations list if it exists
        const updatedSaved = state.savedLocations.map(loc => 
          loc.id === location.id ? { ...loc, lastUsedAt: Date.now() } : loc
        );
        return { currentLocation: location, savedLocations: updatedSaved };
      }),
      addSavedLocation: (location) => set((state) => {
        const newLocation: SavedLocation = {
          ...location,
          id: Date.now().toString(),
          lastUsedAt: Date.now(),
        };
        // Keep only top 5 recent locations
        const newSaved = [newLocation, ...state.savedLocations.filter(loc => loc.address !== location.address)].slice(0, 5);
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
