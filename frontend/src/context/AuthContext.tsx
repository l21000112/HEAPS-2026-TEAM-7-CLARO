import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, deletePushToken, type UserProfile } from '@/api/users';
import { clearAnonymousSessionToken } from '@/api/anonymousSessionToken';
import {
  clearCachedExpoPushToken,
  getCachedExpoPushToken,
} from '@/lib/pushNotifications';

type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  initializing: boolean; // true until Firebase restores the saved session
  profileLoading: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  initializing: true,
  profileLoading: false,
  refreshProfile: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null);
      return null;
    }

    setProfileLoading(true);
    try {
      const nextProfile = await getUserProfile();
      setProfile(nextProfile);
      return nextProfile;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        refreshProfile().catch(() => setProfile(null));
      } else {
        setProfile(null);
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    // Best-effort: revoke this device's push token before clearing the session.
    const pushToken = getCachedExpoPushToken();
    if (pushToken) {
      try {
        await deletePushToken(pushToken);
      } catch {
        // never block sign-out
      }
      clearCachedExpoPushToken();
    }

    // API-M2: clear the anonymous-session token so it isn't reused/leaked after sign-out.
    try {
      await clearAnonymousSessionToken();
    } catch {
      // best-effort; never block sign-out
    }
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      initializing,
      profileLoading,
      refreshProfile,
      signOut,
    }),
    [user, profile, initializing, profileLoading, refreshProfile, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
