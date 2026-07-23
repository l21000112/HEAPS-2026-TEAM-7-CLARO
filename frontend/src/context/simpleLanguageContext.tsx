import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'simple-language-preference';

interface SimpleLanguageContextType {
  simpleLanguage: boolean;
  /** False until AsyncStorage has been read once. */
  ready: boolean;
  setSimpleLanguage: (enabled: boolean) => void;
}

const SimpleLanguageContext = createContext<SimpleLanguageContextType | undefined>(undefined);

export function SimpleLanguageProvider({ children }: { children: React.ReactNode }) {
  const [simpleLanguage, setSimpleLanguageState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'true') setSimpleLanguageState(true);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setSimpleLanguage = useCallback((enabled: boolean) => {
    setSimpleLanguageState(enabled);
    AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false').catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ simpleLanguage, ready, setSimpleLanguage }),
    [simpleLanguage, ready, setSimpleLanguage],
  );

  return (
    <SimpleLanguageContext.Provider value={value}>
      {children}
    </SimpleLanguageContext.Provider>
  );
}

export function useSimpleLanguage() {
  const context = useContext(SimpleLanguageContext);
  if (!context) throw new Error('useSimpleLanguage must be used within a SimpleLanguageProvider');
  return context;
}
