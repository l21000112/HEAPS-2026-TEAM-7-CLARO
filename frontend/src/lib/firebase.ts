import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
// @ts-expect-error getReactNativePersistence exists at runtime but is absent from the TS declarations.
import { getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

function requireFirebaseEnv(
  name:
    | 'EXPO_PUBLIC_FIREBASE_API_KEY'
    | 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'
    | 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'
    | 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'
    | 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
    | 'EXPO_PUBLIC_FIREBASE_APP_ID',
): string {
  const value =
    name === 'EXPO_PUBLIC_FIREBASE_API_KEY'
      ? process.env.EXPO_PUBLIC_FIREBASE_API_KEY
      : name === 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'
        ? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
        : name === 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'
          ? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
          : name === 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'
            ? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
            : name === 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
              ? process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
              : process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required Firebase config: process.env.${name} is not set. ` +
        'Set the EXPO_PUBLIC_FIREBASE_* variables in your .env file before building.',
    );
  }
  return value;
}

const firebaseConfig = {
  apiKey: requireFirebaseEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requireFirebaseEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: requireFirebaseEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: requireFirebaseEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireFirebaseEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireFirebaseEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  // measurementId is optional (only needed for Analytics).
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const appAlreadyInitialized = getApps().length > 0;
const app = appAlreadyInitialized ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = Platform.OS === 'web' || appAlreadyInitialized
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });

export { auth };
