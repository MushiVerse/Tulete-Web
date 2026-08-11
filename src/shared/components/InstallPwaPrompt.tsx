import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';

export const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const checkInstallation = async () => {
      // 1. Check media queries and standalone display modes (Desktop & Mobile)
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isFullscreenMedia = window.matchMedia('(display-mode: fullscreen)').matches;
      const isMinimalUiMedia = window.matchMedia('(display-mode: minimal-ui)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      const isLocalInstalled = localStorage.getItem('tulete_pwa_installed') === 'true';

      if (isStandaloneMedia || isFullscreenMedia || isMinimalUiMedia || isIosStandalone || isAndroidApp || isLocalInstalled) {
        if (!isCancelled) setIsInstalled(true);
        return true;
      }

      // 2. Check navigator.getInstalledRelatedApps API (Chrome/Edge Desktop & Mobile)
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          if (Array.isArray(relatedApps) && relatedApps.length > 0) {
            localStorage.setItem('tulete_pwa_installed', 'true');
            if (!isCancelled) setIsInstalled(true);
            return true;
          }
        } catch (e) {
          // Ignore error
        }
      }

      return false;
    };

    checkInstallation().then((alreadyInstalled) => {
      if (alreadyInstalled || isCancelled) return;

      // Detect iOS Safari
      const ua = window.navigator.userAgent;
      const isIosDevice = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
      setIsIOS(isIosDevice);

      // On iOS Safari (where beforeinstallprompt is not supported), show helper after delay
      if (isIosDevice) {
        const iosTimer = setTimeout(() => {
          if (!isCancelled) setShowPrompt(true);
        }, 2000);
        return () => clearTimeout(iosTimer);
      }
    });

    // 3. Listen for Chrome / Edge / Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('tulete_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      isCancelled = true;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem('tulete_pwa_installed', 'true');
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowPrompt(false);
  };

  if (isInstalled || isDismissed || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6 max-w-sm w-[calc(100vw-2rem)] sm:w-auto"
        >
          <div className="relative bg-card/95 backdrop-blur-xl border border-primary/30 p-4 rounded-2xl shadow-2xl overflow-hidden group">
            {/* Background glow */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-start gap-3">
              {/* Logo icon */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h4 className="font-extrabold text-sm text-foreground">Install Tulete</h4>
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">Free</span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  {isIOS 
                    ? 'Tap Share icon below & select "Add to Home Screen"' 
                    : 'Get fast 1-tap access & offline experience on your device'}
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/80 transition-colors"
                aria-label="Close install prompt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Desktop / Android Action */}
            {!isIOS && (
              <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  onClick={handleDismiss}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors"
                >
                  Not Now
                </button>
                <Button
                  onClick={handleInstallClick}
                  size="sm"
                  className="font-extrabold text-xs shadow-md flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install App
                </Button>
              </div>
            )}

            {/* iOS Action Helper */}
            {isIOS && (
              <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center gap-1.5 text-[11px] font-bold text-primary">
                <Share className="w-3.5 h-3.5 shrink-0" />
                <span>Tap <span className="underline">Share</span> → <span className="underline">Add to Home Screen</span></span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
