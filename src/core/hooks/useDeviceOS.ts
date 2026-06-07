import { useState, useEffect } from 'react';

/**
 * Detects the user's device OS from the browser's userAgent string.
 *
 * - isIOS  → iPhone, iPad, iPod
 * - isAndroid → Android phone / tablet
 *
 * Both flags are `false` on desktop browsers (non-mobile).
 *
 * showPlayBadge = true on desktop + Android, false on iOS.
 * This ensures the Google Play download button is never shown to
 * iPhone / iPad users who cannot install the Android APK.
 */
export const useDeviceOS = () => {
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsIOS(/iphone|ipad|ipod/i.test(ua));
    setIsAndroid(/android/i.test(ua));
  }, []);

  const isMobileDevice = isAndroid || isIOS;

  /**
   * Show the Play Store badge on:
   *   ✅ Desktop browsers (neither android nor iOS detected)
   *   ✅ Android phones / tablets
   *   ❌ iPhone / iPad / iPod
   */
  const showPlayBadge = !isMobileDevice || isAndroid;

  return { isAndroid, isIOS, isMobileDevice, showPlayBadge };
};
