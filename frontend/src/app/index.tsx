import { View, ActivityIndicator } from 'react-native';
import { Redirect, type Href } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/styles/global';
export default function RootIndex() {
  const { user, profile, initializing, profileLoading } = useAuth();

  // 1. Wait until Firebase restores the session AND fetches the user's profile
  if (initializing || profileLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b141a' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={'/sign-in' as Href} />;
  }

  if (profile?.role === 'teacher') {
    return <Redirect href={'/teacher' as Href} />;
  }

  return <Redirect href={'/student' as Href} />;
}