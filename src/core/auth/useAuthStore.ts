import { create } from 'zustand';
import { authService } from '../../features/auth/services/authService';

interface User {
  id: string;
  email: string;
  displayName?: string;
  role: 'user' | 'provider' | 'admin';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false, // Default false until Firebase verifies
  isLoading: true, // Initially true while validating session
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
