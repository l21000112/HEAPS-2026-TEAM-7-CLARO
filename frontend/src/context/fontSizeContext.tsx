import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'font-scale-preference';

export const FONT_SCALE_STEPS = [0.85, 1, 1.15, 1.3] as const;
export type FontScale = (typeof FONT_SCALE_STEPS)[number];

const DEFAULT_SCALE: FontScale = 1;

interface FontSizeContextType {
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
  /** False until AsyncStorage has been read once. */
  ready: boolean;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontScale, setFontScaleState] = useState<FontScale>(DEFAULT_SCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = saved ? (parseFloat(saved) as FontScale) : DEFAULT_SCALE;
      if ((FONT_SCALE_STEPS as readonly number[]).includes(parsed)) {
        setFontScaleState(parsed);
      }
      setReady(true);
    })();
  }, []);

  const setFontScale = useCallback((next: FontScale) => {
    setFontScaleState(next);
    AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
  }, []);

  const value = useMemo(() => ({ fontScale, setFontScale, ready }), [fontScale, setFontScale, ready]);

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) throw new Error('useFontSize must be used within a FontSizeProvider');
  return context;
}