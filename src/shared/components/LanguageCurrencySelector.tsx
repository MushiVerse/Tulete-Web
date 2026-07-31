import React, { useState, useEffect, useRef } from 'react';
import { 
  useCurrencyLanguageStore, 
  SUPPORTED_LANGUAGES, 
  applyGoogleTranslate 
} from '../../core/config/currencyStore';
import { Globe, ChevronDown, Check, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

export const LanguageCurrencySelector = ({ className = "" }: { className?: string }) => {
  const { currentLanguage, setLanguage } = useCurrencyLanguageStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Inject Google Translate script if not present
    if (!document.getElementById('google-translate-script')) {
      window.googleTranslateElementInit = () => {
        if (window.google && window.google.translate) {
          new window.google.translate.TranslateElement(
            { 
              pageLanguage: 'sw', 
              includedLanguages: 'sw,en,fr,ar,zh-CN,de,es', 
              autoDisplay: false 
            }, 
            'google_translate_element'
          );
        }
      };

      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }

    // Aggressively remove Google Translate top banner frames and prevent layout displacement
    const purgeGoogleBanner = () => {
      if (document.body.style.top && document.body.style.top !== '0px') {
        document.body.style.top = '0px';
      }
      if (document.documentElement.style.top && document.documentElement.style.top !== '0px') {
        document.documentElement.style.top = '0px';
      }

      const elements = document.querySelectorAll(
        '.goog-te-banner-frame, iframe.skiptranslate, div.skiptranslate, iframe[id^=":"], #goog-gt-tt, .goog-te-balloon-frame, .goog-tooltip'
      );
      elements.forEach((el) => {
        const hEl = el as HTMLElement;
        if (hEl.id !== 'google_translate_element') {
          hEl.style.setProperty('display', 'none', 'important');
          hEl.style.setProperty('visibility', 'hidden', 'important');
          hEl.style.setProperty('height', '0px', 'important');
          hEl.style.setProperty('width', '0px', 'important');
          hEl.style.setProperty('opacity', '0', 'important');
          hEl.style.setProperty('pointer-events', 'none', 'important');
          hEl.style.setProperty('top', '-9999px', 'important');
        }
      });
      // Protect any title or heading containing the brand name "Tulete"
      const titles = document.querySelectorAll('h1, h2, h3, h4, h5, h6, title, .brand-title');
      titles.forEach((tEl) => {
        if (tEl.textContent && tEl.textContent.includes('Tulete') && !tEl.classList.contains('notranslate')) {
          tEl.classList.add('notranslate');
          tEl.setAttribute('translate', 'no');
        }
      });
    };

    const observer = new MutationObserver(purgeGoogleBanner);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    observer.observe(document.documentElement, { attributes: true });

    purgeGoogleBanner();
    const interval = setInterval(purgeGoogleBanner, 300);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (langCode: string) => {
    setLanguage(langCode);
    setIsOpen(false);
    // Apply cookies immediately
    applyGoogleTranslate(langCode);
    // Fast seamless reload so Google Translate renders 100% translated page instantly on boot
    setTimeout(() => {
      window.location.reload();
    }, 50);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Hidden container for Google Translate Widget */}
      <div id="google_translate_element" className="hidden" />

      {/* Trigger Button: Adaptive width pill with glassmorphic styling */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex items-center gap-2 bg-card/80 hover:bg-card border border-border/80 hover:border-primary/40 rounded-xl px-3 py-1.5 text-xs font-extrabold text-foreground transition-all shadow-xs hover:shadow-md cursor-pointer max-w-full backdrop-blur-md active:scale-95 group"
        title="Select Language & Currency"
      >
        <div className="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Globe className="w-3.5 h-3.5" />
        </div>
        
        {/* Adaptive text label */}
        <span className="notranslate font-extrabold text-xs text-foreground whitespace-nowrap truncate max-w-[130px] sm:max-w-none tracking-tight" translate="no">
          {currentLanguage.name} ({currentLanguage.symbol})
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : 'group-hover:translate-y-0.5'}`} />
      </button>

      {/* Custom Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-64 rounded-2xl bg-card border border-border/80 shadow-2xl p-2 z-50 overflow-hidden backdrop-blur-xl"
          >
            <div className="px-3 py-2 border-b border-border/60 mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="notranslate uppercase tracking-wider text-[11px]" translate="no">Language & Currency</span>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                <Coins className="w-3 h-3 text-warning" /> Auto
              </span>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-none py-1">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = lang.code === currentLanguage.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left group cursor-pointer ${
                      isSelected 
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs' 
                        : 'text-foreground hover:bg-muted/80 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="notranslate font-extrabold text-xs" translate="no">{lang.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md transition-colors ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-card'
                      }`}>
                        {lang.symbol}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
