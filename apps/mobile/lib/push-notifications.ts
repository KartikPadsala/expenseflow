import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Router } from 'expo-router';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and get Expo push token.
 * Returns null if permission denied or not a physical device.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (err) {
    console.error('Failed to get push token:', err);
    return null;
  }
}

/**
 * Deep link router: navigate to the correct screen based on notification data.
 */
export function handleNotificationDeepLink(
  notification: Notifications.Notification,
  router: Router,
) {
  const data = notification.request.content.data as Record<string, string> | undefined;
  if (!data) return;

  const { screen, expenseId, groupId, settlementId } = data;

  switch (screen) {
    case 'expense':
      if (expenseId) router.push(`/expenses/${expenseId}`);
      break;
    case 'group':
      if (groupId) router.push(`/groups/${groupId}`);
      break;
    case 'settlement':
      if (settlementId) router.push(`/settlements/${settlementId}`);
      break;
    default:
      router.push('/notifications');
  }
}
