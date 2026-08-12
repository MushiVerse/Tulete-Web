import { useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';

const SESSION_KEY = 'tulete_visitor_tracked';

/**
 * Hook to automatically track site visitors in Firestore whenever the user opens the site.
 * Uses sessionStorage to count each new browser session once.
 */
export function useVisitorTracking(): void {
  useEffect(() => {
    try {
      const alreadyTracked = sessionStorage.getItem(SESSION_KEY);
      if (!alreadyTracked) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        analyticsService.trackVisitor();
      }
    } catch (e) {
      // Fallback if sessionStorage is disabled/restricted
      analyticsService.trackVisitor();
    }
  }, []);
}
