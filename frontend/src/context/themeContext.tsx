import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-preference';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('system');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const valid: ThemeMode[] = ['light', 'dark', 'system'];
      const initial: ThemeMode = typeof saved === 'string' && (valid as string[]).includes(saved)
        ? (saved as ThemeMode)
        : 'system';
      setThemeState(initial);
      setColorScheme(initial);
    })();
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    setColorScheme(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, [setColorScheme]);

  const isDark = colorScheme === 'dark';

  const value = useMemo(() => ({ theme, setTheme, isDark }), [theme, setTheme, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}