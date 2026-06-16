import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  getInitialNotification,
  onNotificationOpenedApp,
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';

type RouteData = Record<string, string> | undefined;

/** Map a notification's data payload to an in-app route. */
function routeFor(data: RouteData): string | null {
  if (!data) return null;
  const url = data.url;
  if (!url) return null;
  switch (url) {
    case 'library':
      return '/(tabs)/lists';
    default:
      return url.startsWith('/') ? url : null;
  }
}

/**
 * Routes notification taps to the right screen:
 *  - foreground taps (notifee-rendered)        → notifee.onForegroundEvent
 *  - background taps (OS-rendered FCM message)  → onNotificationOpenedApp
 *  - cold start from a tap                      → getInitialNotification
 */
export function useNotificationObserver(): void {
  const router = useRouter();

  useEffect(() => {
    const messaging = getMessaging(getApp());

    const navigate = (data: RouteData) => {
      const path = routeFor(data);
      if (path) router.push(path as never);
    };

    // App opened from a quit state by tapping a notification.
    getInitialNotification(messaging).then((msg: FirebaseMessagingTypes.RemoteMessage | null) => {
      if (msg) navigate(msg.data as RouteData);
    });

    // App in background, brought to foreground by a tap.
    const unsubscribeOpened = onNotificationOpenedApp(messaging, (msg) => {
      navigate(msg.data as RouteData);
    });

    // Tap on a notifee-rendered (foreground) notification.
    const unsubscribeForeground = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        navigate(detail.notification?.data as RouteData);
      }
    });

    return () => {
      unsubscribeOpened();
      unsubscribeForeground();
    };
  }, [router]);
}
