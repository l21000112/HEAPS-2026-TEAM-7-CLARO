import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'reduced-animations-preference';

interface ReducedAnimationsContextType {
  reducedAnimations: boolean;
  ready: boolean;
  setReducedAnimations: (enabled: boolean) => void;
}

const ReducedAnimationsContext = createContext<ReducedAnimationsContextType | undefined>(undefined);

export function ReducedAnimationsProvider({ children }: { children: React.ReactNode }) {
  const [reducedAnimations, setReducedAnimationsState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'true') setReducedAnimationsState(true);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setReducedAnimations = useCallback((enabled: boolean) => {
    setReducedAnimationsState(enabled);
    AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false').catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ reducedAnimations, ready, setReducedAnimations }),
    [reducedAnimations, ready, setReducedAnimations],
  );

  return (
    <ReducedAnimationsContext.Provider value={value}>
      {children}
    </ReducedAnimationsContext.Provider>
  );
}

export function useReducedAnimations() {
  const context = useContext(ReducedAnimationsContext);
  if (!context) throw new Error('useReducedAnimations must be used within an ReducedAnimationsProvider');
  return context;
}
