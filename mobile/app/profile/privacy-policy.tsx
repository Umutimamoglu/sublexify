import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';

const PRIVACY_POLICY_URL = 'https://www.freeprivacypolicy.com/live/479d8ae8-c4ce-45c2-9bbe-6291cb27b2d1';

export default function PrivacyPolicyScreen() {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const c = {
    BG:     theme.colors.background,
    TEXT_P: theme.colors.textPrimary,
    TEXT_S: theme.colors.textSecondary,
    BORDER: theme.colors.borderDefault,
    PURPLE: theme.colors.primary,
  };

  const styles = StyleSheet.create({
    root:    { flex: 1, backgroundColor: c.BG },
    safe:    { flex: 1, backgroundColor: c.BG },
    header:  {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: isDark ? '#ffffff10' : '#00000008',
      alignItems: 'center', justifyContent: 'center',
    },
    title: {
      color: c.TEXT_P, fontSize: 14, fontWeight: '800',
      letterSpacing: 1.2, textTransform: 'uppercase', flex: 1,
    },
    separator: { height: 1, backgroundColor: isDark ? '#ffffff0f' : '#e0e0ea' },
    webview:   { flex: 1 },
    loadOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.BG,
      alignItems: 'center', justifyContent: 'center',
    },
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.BG} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={c.TEXT_P} />
          </TouchableOpacity>
          <Text style={styles.title}>Gizlilik Politikası</Text>
        </View>
        <View style={styles.separator} />

        <WebView
          source={{ uri: PRIVACY_POLICY_URL }}
          style={[styles.webview, { backgroundColor: c.BG }]}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
        />

        {loading && (
          <View style={styles.loadOverlay}>
            <ActivityIndicator size="large" color={c.PURPLE} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
