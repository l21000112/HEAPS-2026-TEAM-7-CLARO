import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';

type SaveCompletion = () => Promise<unknown>;

export function isFinishedAssignmentError(error: unknown) {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : null;
  if (status === 409 || status === 410) return true;

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    message.includes('maximum attempts') ||
    message.includes('already been completed') ||
    message.includes('deadline has passed') ||
    message.includes('assignment has expired')
  );
}

export function useCompletionNavigation(saveCompletion: SaveCompletion) {
  const navigation = useNavigation();
  const router = useRouter();
  const saveCompletionRef = useRef(saveCompletion);
  const saveInFlightRef = useRef<Promise<boolean> | null>(null);
  const isSavedRef = useRef(false);
  const isLeavingRef = useRef(false);
  const allowRemoveRef = useRef(false);
  const [isSaving, setIsSaving] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    saveCompletionRef.current = saveCompletion;
  }, [saveCompletion]);

  const ensureSaved = useCallback(() => {
    if (isSavedRef.current) {
      return Promise.resolve(true);
    }
    if (saveInFlightRef.current) {
      return saveInFlightRef.current;
    }

    setIsSaving(true);
    setSaveError(null);
    const savePromise = saveCompletionRef.current()
      .then(() => {
        isSavedRef.current = true;
        return true;
      })
      .catch(() => {
        setSaveError('Progress could not be saved. Try again.');
        return false;
      })
      .finally(() => {
        saveInFlightRef.current = null;
        setIsSaving(false);
      });

    saveInFlightRef.current = savePromise;
    return savePromise;
  }, []);

  const finish = useCallback(async () => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;

    const saved = await ensureSaved();
    if (!saved) {
      isLeavingRef.current = false;
      return;
    }

    allowRemoveRef.current = true;
    router.dismissTo('/student');
  }, [ensureSaved, router]);

  useEffect(() => {
    void ensureSaved();
  }, [ensureSaved]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (allowRemoveRef.current) return;
        event.preventDefault();
        void finish();
      }),
    [finish, navigation],
  );

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        void finish();
        return true;
      });
      return () => subscription.remove();
    }, [finish]),
  );

  return { finish, isSaving, saveError };
}

/** Prevents a pending end-of-scenario request from navigating after its screen was removed. */
export function useBlockNavigationWhile(busy: boolean) {
  const navigation = useNavigation();
  const allowRemoveRef = useRef(false);

  const allowNextNavigation = useCallback(() => {
    allowRemoveRef.current = true;
  }, []);

  useEffect(() => {
    if (!busy) {
      allowRemoveRef.current = false;
      return;
    }
    return navigation.addListener('beforeRemove', (event) => {
      if (allowRemoveRef.current) return;
      event.preventDefault();
    });
  }, [busy, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!busy) return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [busy]),
  );

  return allowNextNavigation;
}
