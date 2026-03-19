import '../global.css';
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

SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    async function prepare() {
      try {
        await initI18n();

        // Wait for hydration if not already done
        if (!hasHydrated) return;

        // Auth varsa kritik verileri splash süresinde önceden yükle
        if (isAuthenticated) {
          await Promise.allSettled([
            queryClient.prefetchQuery({
              queryKey: ['media'],
              queryFn: () =>
                apiClient.get(ENDPOINTS.media.list).then((r) => r.data),
              staleTime: 1000 * 60 * 30,
            }),
            queryClient.prefetchQuery({
              queryKey: ['lists'],
              queryFn: () =>
                apiClient.get(ENDPOINTS.lists.list).then((r) => r.data),
              staleTime: 1000 * 60 * 5,
            }),
            queryClient.prefetchQuery({
              queryKey: ['user', 'stats'],
              queryFn: () =>
                apiClient.get(ENDPOINTS.user.stats).then((r) => r.data),
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
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
        >
          <ThemeProvider>
            <AuthProvider>
              <Stack screenOptions={{ headerShown: false }}>
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
