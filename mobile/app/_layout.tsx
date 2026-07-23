import '../global.css';
import '@/src/notifications/background'; // registers FCM background + notifee handlers (module scope)
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nextProvider } from 'react-i18next';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { defaultShouldDehydrateQuery, type Query } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { AuthProvider } from '@/src/context/AuthContext';
import { initI18n } from '@/src/i18n';
import i18n from '@/src/i18n';
import { queryClient } from '@/src/api/queryClient';
import { prefetchAppInit } from '@/src/api/appInit';
import { useAuthStore } from '@/src/store/authStore';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import { useNotificationObserver } from '@/src/hooks/useNotificationObserver';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useSettingsStore } from '@/src/store/settingsStore';
import type { SupportedLanguage } from '@/src/i18n';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

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

/**
 * The whole cache is written as a single AsyncStorage row. On Android that row
 * lives in a SQLite database capped at 6 MB by default (async-storage's
 * config.gradle sets dbSizeInMB = 6 and we don't override it), and the media
 * catalogue alone serialises to roughly 5 MB — so the write overflows and
 * *nothing* is stored, the small useful entries included. Dropping the
 * catalogue there keeps the row well under the cap.
 *
 * iOS has no equivalent cap: values above 1 KB are written as their own files,
 * so the full cache — catalogue included — persists fine and is left alone.
 */
const isMediaCatalogueQuery = (query: Query) =>
  query.queryKey.length === 1 && query.queryKey[0] === 'media';

const persistOptions = {
  persister,
  maxAge: 1000 * 60 * 60 * 24,
  dehydrateOptions:
    Platform.OS === 'android'
      ? {
          shouldDehydrateQuery: (query: Query) =>
            defaultShouldDehydrateQuery(query) && !isMediaCatalogueQuery(query),
        }
      : undefined,
};

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { hasHydrated, isAuthenticated, hasSeenOnboarding } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Auth gate: logout olunca login'e yönlendir
  // Yeni kullanıcı onboarding'i görmediyse login'e yönlendirme — index.tsx halleder
  useEffect(() => {
    if (!ready || !hasHydrated) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    if (!isAuthenticated && !inAuthGroup && !inOnboarding && hasSeenOnboarding) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, ready, hasHydrated, segments, hasSeenOnboarding]);

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

        // Sessiz modda da çal (playback kategorisi) + arka planda/ekran kapalıyken
        // audio session aktif kalsın (auto-play TTS için; iOS tarafı ayrıca
        // UIBackgroundModes: ["audio"] gerektirir — app.json'da tanımlı)
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          // Sessiz keep-alive track'i ile TTS konuşmasının birbirini kesmemesi
          // için ikisinin de aynı session'da karışmasına izin ver.
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        });

        // Wait for hydration if not already done
        if (!hasHydrated) return;

        // Splash'i ağ isteğiyle BEKLETME: persist edilen cache ile ekran anında
        // açılır, taze veri aşağıdaki effect'te arka planda tek istekle çekilir.
        setReady(true);
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('App prepare failed:', e);
        setReady(true);
      }
    }
    prepare();
  }, [hasHydrated]);

  // Kritik verileri arka planda tek istekle (/app-init) yükle.
  // Cold start + login/register sonrası tetiklenir; splash'i bloklamaz.
  useEffect(() => {
    if (!ready || !hasHydrated || !isAuthenticated) return;
    prefetchAppInit(queryClient);
  }, [ready, hasHydrated, isAuthenticated]);

  if (!ready || !hasHydrated || !fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <StatusBar style="auto" translucent />
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={persistOptions}
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
