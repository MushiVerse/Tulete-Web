import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language, translations } from './translations';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
      toggleLanguage: () => set((state) => ({ language: state.language === 'en' ? 'sw' : 'en' })),
      t: (key: string) => {
        const lang = get().language || 'en';
        const langDict = translations[lang] || translations.en;
        return langDict[key] || translations.en[key] || key;
      },
    }),
    {
      name: 'tulete-language-storage',
    }
  )
);
