import '../global.css';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nextProvider } from 'react-i18next';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { AuthProvider } from '@/src/context/AuthContext';
import { initI18n } from '@/src/i18n';
import i18n from '@/src/i18n';
import { queryClient } from '@/src/api/queryClient';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await initI18n();
      } catch (e) {
        console.warn('i18n init failed:', e);
      } finally {
        setReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="media/[id]" />
                <Stack.Screen name="show/[imdbId]" />
                <Stack.Screen name="word/[id]" />
                <Stack.Screen name="progress" />
              </Stack>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}
