import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export function useFocusAnimationKey() {
  const [animationKey, setAnimationKey] = useState(0);
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      setAnimationKey((key) => key + 1);
    }, []),
  );

  return animationKey;
}
