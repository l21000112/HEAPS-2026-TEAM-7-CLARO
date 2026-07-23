import { useEffect } from 'react';
import { Tabs, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar } from 'expo-router/js-tabs';
import * as Notifications from 'expo-notifications';
import { OnboardingTarget } from '@/components/onboarding/OnboardingTarget';
import { useColors } from '@/lib/useColors';
import { useTranslation } from 'react-i18next';
import { savePushToken } from '@/api/users';
import {
  isHomeworkAssignedNotification,
  registerForPushNotificationsAsync,
} from '@/lib/pushNotifications';

export default function StudentTabsLayout() {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  // Register Expo push token once the student tab tree mounts (and when language changes).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token || cancelled) return;
      try {
        await savePushToken(token, i18n.language);
      } catch (error) {
        console.warn('[push] Failed to save push token', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  // Tap on a homework_assigned push → student Home.
  useEffect(() => {
    function redirectFromNotification(notification: Notifications.Notification) {
      const data = notification.request.content.data;
      if (isHomeworkAssignedNotification(data)) {
        router.push('/student' as Href);
      }
    }

    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) {
      redirectFromNotification(last.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      redirectFromNotification(response.notification);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <Tabs
      tabBar={(props) => (
        <OnboardingTarget id="menu_buttons">
          <BottomTabBar {...props} />
        </OnboardingTarget>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('student.tabHome'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('student.tabProfile'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="classroom-Info"
        options={{
          title: t('student.tabClassroom'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'school' : 'school-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('student.tabSettings'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
