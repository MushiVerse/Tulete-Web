import { useEffect, useRef } from 'react';
import { useAuthStore } from '../auth/useAuthStore';
import { analyticsService } from '../../services/analyticsService';

const SESSION_KEY = 'tulete_visitor_tracked';

/**
 * Hook to automatically track site visitors in Firestore whenever the user opens the site.
 * Waits until auth state has finished loading (isLoading === false) so that if the user is logged in,
 * their loaded UID and email are recorded instead of defaulting prematurely to 'guest_user'.
 * Uses sessionStorage to count each new browser session once.
 */
export function useVisitorTracking(): void {
  const { user, isLoading } = useAuthStore();
  const lastTrackedUid = useRef<string | null>(null);

  useEffect(() => {
    const doTrack = () => {
      const currentStoreUser = useAuthStore.getState().user;
      const targetId = currentStoreUser?.id || user?.id || 'guest_user';

      if (lastTrackedUid.current === targetId) return;

      try {
        const storedValue = sessionStorage.getItem(SESSION_KEY);
        if (storedValue === targetId) {
          lastTrackedUid.current = targetId;
          return;
        }
      } catch (e) {
        // Fallback if sessionStorage is restricted
      }

      lastTrackedUid.current = targetId;
      try {
        sessionStorage.setItem(SESSION_KEY, targetId);
      } catch (e) {
        // Fallback
      }

      analyticsService.trackVisitor(targetId);
    };

    // If auth initialization has completed, record immediately
    if (!isLoading) {
      doTrack();
      return;
    }

    // Safety fallback timer if auth initialization takes unexpected time
    const timer = setTimeout(() => {
      doTrack();
    }, 2500);

    return () => clearTimeout(timer);
  }, [user?.id, isLoading]);
}

