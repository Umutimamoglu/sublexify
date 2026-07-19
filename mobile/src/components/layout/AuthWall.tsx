import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { useTheme } from '@/src/context/ThemeContext';

/**
 * Gate for tabs that need an account. With the open funnel, anonymous users can
 * reach these screens — instead of firing 401s we show a friendly login prompt.
 */
export default function AuthWall({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { theme } = useTheme();
  const router = useRouter();

  // Wait for persisted auth to load so we don't flash the wall for logged-in users.
  if (!hasHydrated) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;

  if (isAuthenticated) return <>{children}</>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{
          width: 64, height: 64, borderRadius: 20, marginBottom: 20,
          backgroundColor: theme.colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="person-circle-outline" size={36} color={theme.colors.primary} />
        </View>
        <Text style={{
          color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800',
          marginBottom: 8, textAlign: 'center',
        }}>
          Giriş yap
        </Text>
        <Text style={{
          color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20,
          textAlign: 'center', marginBottom: 24,
        }}>
          Kelime listelerini kaydetmek, ilerlemeni takip etmek ve daha fazlası için bir hesap gerekiyor.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
          style={{
            backgroundColor: theme.colors.primary, paddingHorizontal: 28, paddingVertical: 14,
            borderRadius: 14, width: '100%', alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Giriş yap / Kayıt ol</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
