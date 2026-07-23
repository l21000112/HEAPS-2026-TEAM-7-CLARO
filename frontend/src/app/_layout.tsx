import "../../global.css";
import React, { Component, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/themeContext';
import { CartProvider, useCart } from '@/context/CartContext';
import { FontSizeProvider } from '@/context/fontSizeContext';
import { SimpleLanguageProvider } from '@/context/simpleLanguageContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay';
import { ReducedAnimationsProvider } from "@/context/reducedAnimationsContext";
import { AppAlertProvider } from "@/context/AppAlertContext";
import { ensureAnonymousSessionTokenLoaded } from '@/api/anonymousSessionToken';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Side-effect import: initializes i18next before any screen renders.
import i18n from '@/i18n';

const queryClient = new QueryClient();

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>{i18n.t('common.errorTitle')}</Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 }}>
            {this.state.error?.message || i18n.t('common.unexpectedError')}
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            style={{ backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{i18n.t('common.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <LanguageProvider>
        <ThemeProvider>
          <FontSizeProvider>
            <SimpleLanguageProvider>
              <ReducedAnimationsProvider>
                <AuthProvider>
                  <AppAlertProvider>
                    <OnboardingProvider>
                      <CartProvider>
                        <RootNavigator />
                      </CartProvider>
                    </OnboardingProvider>
                  </AppAlertProvider>
                </AuthProvider>
              </ReducedAnimationsProvider>
            </SimpleLanguageProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </LanguageProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { user, profile, initializing, profileLoading } = useAuth();
  const { isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const { clearCart } = useCart();
  const prevSegmentsRef = useRef<string[]>([]);

  useEffect(() => {
    // This effect tracks navigation and clears the cart when exiting the marketplace.
    const wasInMarketplace = prevSegmentsRef.current[0] === 'marketplace';
    const isInMarketplace = segments[0] === 'marketplace';

    if (wasInMarketplace && !isInMarketplace) {
      clearCart();
    }

    // Store current segments for the next render.
    prevSegmentsRef.current = segments;
  }, [segments, clearCart]);

  useEffect(() => {
    ensureAnonymousSessionTokenLoaded();
  }, []);

  useEffect(() => {
    if (initializing || profileLoading) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === '(auth)';
    const inTeacherGroup = firstSegment === 'teacher';
    const inStudentGroup = firstSegment === 'student';

    if (!user && !inAuthGroup) {
      // Logged out and trying to reach the app -> send to login.
      router.replace('/sign-in' as Href);
    } else if (user && inAuthGroup) {
      // Logged in but sitting on an auth screen -> send to gatekeeper (index.tsx)
      router.replace('/' as Href);
    } else if (user && inTeacherGroup && profile?.role !== 'teacher') {
      // Logged in and not a teacher, but trying to access /teacher -> bounce to /student
      router.replace('/student' as Href);
    } else if (user && inStudentGroup && profile?.role === 'teacher') {
      // M13: Teachers should not land on student routes.
      router.replace('/teacher' as Href);
    }
  }, [user, profile, initializing, profileLoading, segments]);

  return (
    <View className={`flex-1 ${isDark ? 'dark' : ''}`}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* 1. ALWAYS render the Stack so navigation context is never destroyed */}
      <Stack screenOptions={{ headerShown: false }} />

      {/* 1b. Onboarding tour spotlight/tooltip, drawn above the current screen */}
      <OnboardingOverlay />

      {/* 2. OVERLAY the loading spinner on top of the app while initializing */}
      {(initializing || profileLoading) && (
        <View 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
          className="justify-center items-center bg-background"
        >
        <ActivityIndicator
          color={isDark ? '#E8DCC4' : '#C9B896'}   
          size="large"
        />
        </View>
      )}
    </View>
  );
}
