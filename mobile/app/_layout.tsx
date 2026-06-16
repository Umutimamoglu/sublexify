import '../global.css';
import '@/src/notifications/background'; // registers FCM background + notifee handlers (module scope)
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nextProvider } from 'react-i18next';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { AuthProvider } from '@/src/context/AuthContext';
import { initI18n } from '@/src/i18n';
import i18n from '@/src/i18n';
import { queryClient } from '@/src/api/queryClient';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import { useAuthStore } from '@/src/store/authStore';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import { useNotificationObserver } from '@/src/hooks/useNotificationObserver';
import { Audio } from 'expo-av';
import { useSettingsStore } from '@/src/store/settingsStore';
import type { SupportedLanguage } from '@/src/i18n';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

/** Activates push notifications (token registration + tap routing) inside the provider tree. */
function NotificationsBridge() {
  usePushNotifications();
  useNotificationObserver();
  return null;
}

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'sublex-query-cache',
  throttleTime: 1000,
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { hasHydrated, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  // Auth gate: logout olunca login'e yönlendir
  useEffect(() => {
    if (!ready || !hasHydrated) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    if (!isAuthenticated && !inAuthGroup && !inOnboarding) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, ready, hasHydrated, segments]);

  // Android Navigation Bar (Immersive Mode) settings
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Hide the navigation bar (buttons/gestures) until the user swipes
      NavigationBar.setVisibilityAsync('hidden');
      // Set behavior to overlay-swipe so the bar doesn't push the layout up when revealed
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        await initI18n();
        // Sync i18n's detected language (device locale fallback) to the Zustand store
        useSettingsStore.getState().setLanguage(i18n.language as SupportedLanguage);

        // Allow audio (expo-speech) to play even when iPhone is in silent mode
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

        // Wait for hydration if not already done
        if (!hasHydrated) return;

        // Auth varsa kritik verileri splash süresinde paralel önceden yükle
        if (isAuthenticated) {
          await Promise.allSettled([
            // Ana sayfa — içerik listesi (30 dk cache)
            queryClient.prefetchQuery({
              queryKey: ['media'],
              queryFn: () => apiClient.get(ENDPOINTS.media.list).then((r) => r.data),
              staleTime: 1000 * 60 * 30,
            }),
            // Ana sayfa — devam edilen içerikler (her seferinde taze)
            queryClient.prefetchQuery({
              queryKey: ['media', 'continue-learning'],
              queryFn: () => apiClient.get(`${ENDPOINTS.media.continueLearning}?limit=50`).then((r) => r.data),
              staleTime: 0,
            }),
            // Seçilmiş listeler (5 dk cache)
            queryClient.prefetchQuery({
              queryKey: ['lists'],
              queryFn: () => apiClient.get(ENDPOINTS.lists.list).then((r) => r.data),
              staleTime: 1000 * 60 * 5,
            }),
            // Kullanıcı istatistikleri — ana sayfa + profil (5 dk cache)
            queryClient.prefetchQuery({
              queryKey: ['user', 'stats'],
              queryFn: () => apiClient.get(ENDPOINTS.user.stats).then((r) => r.data),
              staleTime: 1000 * 60 * 5,
            }),
            // Bilinen kelimeler — havuz + liste ekranları (5 dk cache)
            queryClient.prefetchQuery({
              queryKey: ['user', 'known-words'],
              queryFn: () => apiClient.get(ENDPOINTS.user.knownWords).then((r) => r.data),
              staleTime: 1000 * 60 * 5,
            }),
            // Havuz tab — sık kelimeler ilk sayfası (1 saat cache)
            queryClient.prefetchInfiniteQuery({
              queryKey: ['words', 'frequent', [], false, 50],
              queryFn: () => apiClient.get(`${ENDPOINTS.words.frequent}?language=en&page=0&size=50&onlyUnknown=false`).then((r) => r.data),
              initialPageParam: 0,
              getNextPageParam: () => undefined,
              staleTime: 1000 * 60 * 60,
            }),
            // İzlenen medya ID'leri — dizi detay ekranı bölüm toggle (10 dk cache)
            queryClient.prefetchQuery({
              queryKey: ['media', 'watched-ids'],
              queryFn: () => apiClient.get(ENDPOINTS.media.watchedIds).then((r) => r.data),
              staleTime: 1000 * 60 * 10,
            }),
            // İlerleme istatistikleri — progress ekranı (5 dk cache)
            queryClient.prefetchQuery({
              queryKey: ['progress', 'stats'],
              queryFn: () => apiClient.get(ENDPOINTS.progress.stats).then((r) => r.data),
              staleTime: 1000 * 60 * 5,
            }),
          ]);
        }
        
        setReady(true);
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('App prepare failed:', e);
        setReady(true);
      }
    }
    prepare();
  }, [hasHydrated, isAuthenticated]);

  if (!ready || !hasHydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <StatusBar style="auto" translucent />
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
        >
          <ThemeProvider>
            <AuthProvider>
              <NotificationsBridge />
              <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 200 }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="media/[id]" />
                <Stack.Screen name="show/[imdbId]" />
                <Stack.Screen name="word/[id]" />
                <Stack.Screen name="progress" />
              </Stack>
            </AuthProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}
