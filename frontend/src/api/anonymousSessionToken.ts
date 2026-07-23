// BUG-08: anonymous sessions carry a per-session accessToken (sent as X-Anonymous-Session-Token) that the backend's ensureSessionAccess requires on every request - omitting it causes 403. Pre-load from AsyncStorage at startup for sync reads. Distinct from heaps.anonymousId (the per-client attempt UUID).

import AsyncStorage from '@react-native-async-storage/async-storage';

const ANONYMOUS_SESSION_TOKEN_KEY = 'heaps.anonymousSessionToken';

let cachedToken: string | null = null;
let cacheLoaded = false;

async function loadFromStorage(): Promise<string | null> {
  if (cacheLoaded) return cachedToken;
  try {
    const stored = await AsyncStorage.getItem(ANONYMOUS_SESSION_TOKEN_KEY);
    cachedToken = stored && stored.trim() ? stored : null;
  } catch {
    cachedToken = null;
  }
  cacheLoaded = true;
  return cachedToken;
}

export function getAnonymousSessionToken(): string | null {
  return cachedToken;
}

export async function ensureAnonymousSessionTokenLoaded(): Promise<void> {
  await loadFromStorage();
}

export async function setAnonymousSessionToken(token: string | null | undefined): Promise<void> {
  if (typeof token !== 'string' || !token.trim()) {
    await clearAnonymousSessionToken();
    return;
  }
  cachedToken = token;
  cacheLoaded = true;
  try {
    await AsyncStorage.setItem(ANONYMOUS_SESSION_TOKEN_KEY, token);
  } catch {
  }
}

export async function clearAnonymousSessionToken(): Promise<void> {
  cachedToken = null;
  cacheLoaded = true;
  try {
    await AsyncStorage.removeItem(ANONYMOUS_SESSION_TOKEN_KEY);
  } catch {
    // Swallow; cache is already cleared in memory.
  }
}
