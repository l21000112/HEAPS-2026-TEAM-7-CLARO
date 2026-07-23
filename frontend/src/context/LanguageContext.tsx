import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import {
  AppLanguageCode,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
  resolveDeviceLanguage,
} from '../i18n/config';

interface LanguageContextValue {
  language: AppLanguageCode;
  /** False until AsyncStorage has been read once on mount. */
  ready: boolean;
  setLanguage: (language: AppLanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguageCode>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let initial: AppLanguageCode = DEFAULT_LANGUAGE;
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (isSupportedLanguage(saved)) {
          initial = saved;
        } else {
          initial = resolveDeviceLanguage();
        }
      } catch {
        // Ignore read failures - fall back to device language, then English.
        initial = resolveDeviceLanguage();
      }
      if (cancelled) return;
      setLanguageState(initial);
      if (i18n.language !== initial) {
        await i18n.changeLanguage(initial);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next: AppLanguageCode) => {
    setLanguageState(next);
    void i18n.changeLanguage(next);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ language, ready, setLanguage }),
    [language, ready, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
