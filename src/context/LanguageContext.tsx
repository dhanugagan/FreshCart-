import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getTranslations,
  INDIAN_LANGUAGES,
  type IndianLanguageOption,
  type TranslationKeys,
} from '../i18n/languages';

interface LanguageContextValue {
  language: string;
  currentOption: IndianLanguageOption;
  setLanguage: (code: string) => void;
  t: TranslationKeys;
  languages: IndianLanguageOption[];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const LANG_LS_KEY = 'fc_indian_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    try {
      const saved = window.localStorage.getItem(LANG_LS_KEY);
      if (saved && INDIAN_LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    } catch {
      // ignore storage read errors
    }
    return 'en';
  });

  const currentOption = INDIAN_LANGUAGES.find((l) => l.code === language) || INDIAN_LANGUAGES[0];

  useEffect(() => {
    try {
      window.localStorage.setItem(LANG_LS_KEY, language);
      document.documentElement.lang = language;
      document.documentElement.dir = currentOption.dir || 'ltr';
    } catch {
      // ignore
    }
  }, [language, currentOption.dir]);

  const setLanguage = (code: string) => {
    if (INDIAN_LANGUAGES.some((l) => l.code === code)) {
      setLanguageState(code);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        currentOption,
        setLanguage,
        t: getTranslations(language),
        languages: INDIAN_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
