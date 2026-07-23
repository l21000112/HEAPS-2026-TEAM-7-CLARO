import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar } from 'expo-router/js-tabs';
import { OnboardingTarget } from '@/components/onboarding/OnboardingTarget';
import { useColors } from '@/lib/useColors';
import { useTranslation } from 'react-i18next';

export default function TeacherTabsLayout() {
  const c = useColors();
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(props) => (
        <OnboardingTarget id="teacher_menu_buttons">
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
          title: t('teacher.tabHome'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('teacher.tabProfile'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: t('teacher.tabClasses'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'school' : 'school-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('teacher.tabSettings'),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />,
        }}
      />

      {/* Hidden - routable but not shown in the tab bar */}
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="assign-homework" options={{ href: null }} />
      <Tabs.Screen name="view-student/[id]" options={{ href: null }} />
      <Tabs.Screen name="scenarios" options={{ href: null }} />
    </Tabs>
  );
}
