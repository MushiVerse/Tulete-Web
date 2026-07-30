import React, { useEffect } from 'react';
import { 
  useCurrencyLanguageStore, 
  SUPPORTED_LANGUAGES, 
  applyGoogleTranslate 
} from '../../core/config/currencyStore';
import { Globe, ChevronDown } from 'lucide-react';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

export const LanguageCurrencySelector = ({ className = "" }: { className?: string }) => {
  const { currentLanguage, setLanguage } = useCurrencyLanguageStore();

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

  const handleChangeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const langCode = e.target.value;
    setLanguage(langCode);
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Hidden container for Google Translate Widget */}
      <div id="google_translate_element" className="hidden" />

      <div className="relative inline-flex items-center gap-1.5 bg-muted/60 hover:bg-muted border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground transition-all shadow-sm group cursor-pointer max-w-full">
        <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
        
        {/* Adaptive label that dynamically expands/contracts based on selected language and currency length */}
        <span className="font-extrabold text-xs text-foreground whitespace-nowrap truncate max-w-[130px] sm:max-w-none">
          {currentLanguage.name} ({currentLanguage.symbol})
        </span>

        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform group-hover:translate-y-0.5" />

        {/* Overlay native select for seamless accessibility and click interaction */}
        <select 
          value={currentLanguage.code}
          onChange={handleChangeLanguage}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs font-bold bg-card"
          title="Select Language & Currency"
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code} className="bg-card text-foreground font-semibold">
              {lang.name} ({lang.symbol})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
