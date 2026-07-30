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
        '.goog-te-banner-frame, iframe.skiptranslate, div.skiptranslate, iframe[id^=":"]'
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
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      {/* Hidden container for Google Translate Widget */}
      <div id="google_translate_element" className="hidden" />

      <div className="flex items-center gap-1.5 bg-muted/60 hover:bg-muted border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground transition-all shadow-sm">
        <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="shrink-0">{currentLanguage.flag}</span>
        <select 
          value={currentLanguage.code}
          onChange={handleChangeLanguage}
          className="bg-transparent border-none focus:outline-none focus:ring-0 text-xs font-extrabold cursor-pointer pr-4 appearance-none text-foreground"
          title="Select Language & Currency"
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code} className="bg-card text-foreground font-semibold">
              {lang.flag} {lang.name} ({lang.symbol})
            </option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 text-muted-foreground pointer-events-none absolute right-2.5" />
      </div>
    </div>
  );
};
