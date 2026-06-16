import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { displayNotification } from './pushNotifications';

/**
 * Background / quit-state message + tap handlers.
 *
 * MUST be registered at module scope (outside any React component), so this file
 * is imported once at the very top of app/_layout.tsx.
 *
 * Deep-link navigation on tap is handled in useNotificationObserver via
 * getInitialNotification / onNotificationOpenedApp (which need the router).
 */
setBackgroundMessageHandler(getMessaging(getApp()), async (remoteMessage) => {
  await displayNotification(remoteMessage);
});

// notifee requires a registered background event handler to avoid warnings.
notifee.onBackgroundEvent(async () => {
  // No-op: taps are routed by useNotificationObserver on next app foreground.
});
