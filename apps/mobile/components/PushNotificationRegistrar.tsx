import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerForPushNotificationsAsync, handleNotificationDeepLink } from '../lib/push-notifications';
import { useRegisterPushToken } from '../hooks/use-notifications';
import { useAuthStore } from '../store/auth.store';

/**
 * Mount this once at the root of the authenticated layout.
 * It registers for push notifications and sets up deep link handling.
 */
export function PushNotificationRegistrar() {
  const { isAuthenticated } = useAuthStore();
  const registerToken = useRegisterPushToken();
  const router = useRouter();
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        registerToken.mutate(token);
      }
    });

    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationDeepLink(response.notification, router);
    });

    return () => {
      responseListenerRef.current?.remove();
    };
  }, [isAuthenticated]);

  return null;
}
