import { Platform, PermissionsAndroid } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  requestPermission,
  getToken,
  isDeviceRegisteredForRemoteMessages,
  registerDeviceForRemoteMessages,
  AuthorizationStatus,
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle, AndroidVisibility } from '@notifee/react-native';

export const CHANNEL_ID = 'defaultch';

/** Create (idempotent) the default Android notification channel. */
export async function ensureAndroidChannel(): Promise<string> {
  return notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Genel Bildirimler',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
  });
}

/**
 * Render an incoming FCM message with notifee. Used for foreground messages and
 * for background data messages (where the OS does not auto-display).
 */
export async function displayNotification(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
): Promise<void> {
  const channelId = await ensureAndroidChannel();
  const notification = remoteMessage.notification ?? {};
  const data = (remoteMessage.data ?? {}) as Record<string, string>;

  const imageUrl =
    notification.android?.imageUrl ??
    (remoteMessage.notification as any)?.image ??
    undefined;

  await notifee.displayNotification({
    title: notification.title,
    body: notification.body,
    data,
    android: {
      channelId,
      // Defaults to the launcher icon (ic_launcher). Swap for a dedicated
      // monochrome drawable later for a cleaner status-bar icon.
      pressAction: { id: 'default' },
      sound: 'default',
      ...(imageUrl
        ? { style: { type: AndroidStyle.BIGPICTURE, picture: imageUrl } }
        : {}),
    },
    ios: {
      sound: 'default',
      ...(imageUrl ? { attachments: [{ url: imageUrl }] } : {}),
    },
  });
}

/**
 * Ask for notification permission and return the device's FCM token (or null
 * if the user denied permission).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const messaging = getMessaging(getApp());

  if (Platform.OS === 'android') {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  const status = await requestPermission(messaging);
  const enabled =
    status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
  if (!enabled) return null;

  if (Platform.OS === 'ios' && !isDeviceRegisteredForRemoteMessages(messaging)) {
    await registerDeviceForRemoteMessages(messaging);
  }

  return (await getToken(messaging)) ?? null;
}
