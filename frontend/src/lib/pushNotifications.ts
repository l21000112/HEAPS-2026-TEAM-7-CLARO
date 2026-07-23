import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

/** Last Expo push token obtained on this device (for logout cleanup). */
let cachedExpoPushToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getEasProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  );
}

/** True when this runtime can register for remote Expo push. */
export function canUsePushNotifications(): boolean {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) {
    console.warn('[push] Skipping: not a physical device');
    return false;
  }
  return true;
}

export function getCachedExpoPushToken(): string | null {
  return cachedExpoPushToken;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!canUsePushNotifications()) {
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[push] Notification permission not granted:', finalStatus);
      return null;
    }

    const projectId = getEasProjectId();
    if (!projectId || projectId === 'REPLACE_WITH_YOUR_EAS_PROJECT_ID') {
      console.warn(
        '[push] No EAS projectId. Add expo.extra.eas.projectId in app.json ' +
          '(from expo.dev → project settings) or set EXPO_PUBLIC_EAS_PROJECT_ID, then rebuild.',
      );
      return null;
    }

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    cachedExpoPushToken = data;
    console.info('[push] Registered Expo push token');
    return data;
  } catch (error) {
    console.warn('[push] Failed to register for push notifications', error);
    return null;
  }
}

export function clearCachedExpoPushToken() {
  cachedExpoPushToken = null;
}

export type HomeworkAssignedNotificationData = {
  type?: string;
  classroomId?: string;
  assignmentId?: string;
};

export function isHomeworkAssignedNotification(
  data: unknown
): data is HomeworkAssignedNotificationData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as HomeworkAssignedNotificationData).type === 'homework_assigned'
  );
}
