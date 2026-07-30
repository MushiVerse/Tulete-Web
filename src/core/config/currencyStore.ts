import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { APP_SETTINGS } from './settings';

export interface LanguageCurrencyOption {
  code: string;       // ISO language code e.g. 'sw', 'en', 'fr', 'ar', 'zh', 'de', 'es'
  name: string;       // Display Name e.g. 'Swahili', 'English', 'Français'
  currency: string;   // Currency Code e.g. 'TZS', 'USD', 'EUR', 'AED', 'CNY'
  symbol: string;     // Currency Symbol e.g. 'TZS', '$', '€', 'AED', '¥'
  rate: number;       // Exchange rate relative to 1 TZS
}

export const SUPPORTED_LANGUAGES: LanguageCurrencyOption[] = [
  { code: 'en', name: 'Default', currency: 'TZS', symbol: 'TSH', rate: 1.0 },
  { code: 'sw', name: 'Swahili (Tanzania)', currency: 'TZS', symbol: 'TZS', rate: 1.0 },
  { code: 'en', name: 'English (US)', currency: 'USD', symbol: '$', rate: 0.000377 },
  { code: 'fr', name: 'Français (EU)', currency: 'EUR', symbol: '€', rate: 0.00035 },
  { code: 'ar', name: 'العربية (UAE)', currency: 'AED', symbol: 'AED', rate: 0.00139 },
  { code: 'zh', name: '中文 (China)', currency: 'CNY', symbol: '¥', rate: 0.00274 },
  { code: 'de', name: 'Deutsch (Germany)', currency: 'EUR', symbol: '€', rate: 0.00035 },
  { code: 'es', name: 'Español (Spain)', currency: 'EUR', symbol: '€', rate: 0.00035 },
];

interface CurrencyLanguageState {
  currentLanguage: LanguageCurrencyOption;
  setLanguage: (langCode: string) => void;
}

export const useCurrencyLanguageStore = create<CurrencyLanguageState>()(
  persist(
    (set) => ({
      currentLanguage: SUPPORTED_LANGUAGES[0], // Default Swahili / TZS
      setLanguage: (langCode: string) => {
        const target = SUPPORTED_LANGUAGES.find(l => l.code === langCode) || SUPPORTED_LANGUAGES[0];
        set({ currentLanguage: target });

        // Update APP_SETTINGS currency symbol dynamically
        APP_SETTINGS.currency = target.symbol;

        // Dispatch window event for instant real-time component updates
        window.dispatchEvent(new CustomEvent('tulete-currency-change', { detail: target }));

        // Apply Google Translate Cookie
        applyGoogleTranslate(target.code);
      },
    }),
    {
      name: 'tulete_language_currency_v1',
      onRehydrateStorage: () => (state) => {
        if (state?.currentLanguage) {
          APP_SETTINGS.currency = state.currentLanguage.symbol;
          applyGoogleTranslate(state.currentLanguage.code);
        }
      }
    }
  )
);

// Reactive hook for components needing real-time price & symbol updates
export function useCurrency() {
  const currentLanguage = useCurrencyLanguageStore((s) => s.currentLanguage);
  
  return {
    symbol: currentLanguage.symbol,
    rate: currentLanguage.rate,
    currency: currentLanguage.currency,
    format: (priceInTZS: number): string => {
      if (isNaN(priceInTZS) || priceInTZS == null) return "0";
      if (currentLanguage.currency === 'TZS') {
        return (Math.round(priceInTZS / 100) * 100).toLocaleString();
      }
      const converted = priceInTZS * currentLanguage.rate;
      return converted.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  };
}

// Helper to trigger Google Translate Web Widget
export function applyGoogleTranslate(langCode: string) {
  try {
    const domain = window.location.hostname;
    document.cookie = `googtrans=/auto/${langCode}; path=/; domain=${domain}`;
    document.cookie = `googtrans=/auto/${langCode}; path=/;`;

    const selectElem = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (selectElem) {
      selectElem.value = langCode;
      selectElem.dispatchEvent(new Event('change'));
    }
  } catch (err) {
    console.error("Google Translate widget error:", err);
  }
}
