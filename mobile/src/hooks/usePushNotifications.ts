import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, onMessage, onTokenRefresh } from '@react-native-firebase/messaging';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import { useAuthStore } from '@/src/store/authStore';
import {
  registerForPushNotifications,
  displayNotification,
} from '@/src/notifications/pushNotifications';

async function sendTokenToBackend(token: string): Promise<void> {
  try {
    await apiClient.put(ENDPOINTS.user.deviceToken, { token, platform: Platform.OS });
  } catch {
    // Best-effort: a failed registration retries on next launch / token refresh.
  }
}

/**
 * Wires up FCM: foreground display, permission + token acquisition, token refresh,
 * and registering the token with the backend once the user is authenticated.
 */
export function usePushNotifications(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tokenRef = useRef<string | null>(null);

  // Foreground messages → render with notifee.
  useEffect(() => {
    const messaging = getMessaging(getApp());
    return onMessage(messaging, async (remoteMessage) => {
      await displayNotification(remoteMessage);
    });
  }, []);

  // Permission + initial token + refresh subscription.
  useEffect(() => {
    const messaging = getMessaging(getApp());
    let mounted = true;

    (async () => {
      const token = await registerForPushNotifications();
      if (!mounted) return;
      tokenRef.current = token;
      if (token && useAuthStore.getState().isAuthenticated) {
        await sendTokenToBackend(token);
      }
    })();

    const unsubscribe = onTokenRefresh(messaging, async (newToken) => {
      tokenRef.current = newToken;
      if (useAuthStore.getState().isAuthenticated) {
        await sendTokenToBackend(newToken);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Register the token when the user logs in (token may already be known).
  useEffect(() => {
    if (isAuthenticated && tokenRef.current) {
      sendTokenToBackend(tokenRef.current);
    }
  }, [isAuthenticated]);
}
