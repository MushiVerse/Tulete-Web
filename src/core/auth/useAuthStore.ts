import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../../features/auth/services/authService';

interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  role: 'user' | 'provider' | 'admin';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  savedPhoneNumber: string;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => Promise<void>;
  savePhoneNumber: (phone: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      savedPhoneNumber: '',
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      savePhoneNumber: (phone) => set({ savedPhoneNumber: phone }),
      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
      },
    }),
    {
      name: 'tulete-auth-storage',
      // Only persist non-sensitive fields. isLoading should always start as true.
      partialize: (state) => ({
        savedPhoneNumber: state.savedPhoneNumber,
      }),
    }
  )
);
