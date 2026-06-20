import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { Text } from '@/src/components/ui/Text';


type Palette = {
  BG: string; SURFACE: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
};

function makeStyles(c: Palette, isDark: boolean, isTablet: boolean) {
  const pad = isTablet ? 32 : 20;

  return StyleSheet.create({
    root:     { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },

    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: pad, paddingTop: 20, paddingBottom: 16, gap: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: isDark ? '#ffffff10' : '#00000008',
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
      color: c.TEXT_P, fontSize: 14, fontWeight: '800',
      letterSpacing: 1.2, textTransform: 'uppercase', flex: 1,
    },
    separator: { height: 1, backgroundColor: isDark ? '#ffffff0f' : '#e0e0ea', marginBottom: 24 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyIcon: { fontSize: 56 },
    emptyTitle: { color: c.TEXT_P, fontSize: 20, fontWeight: '800' },
    emptyDesc:  { color: c.TEXT_S, fontSize: 14 },
  });
}

export default function NotificationsScreen() {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation('profile');
  const { isTablet } = useResponsive();
  const router = useRouter();

  const c = useMemo<Palette>(() => ({
    BG:      theme.colors.background,
    SURFACE: theme.colors.surface,
    TEXT_P:  theme.colors.textPrimary,
    TEXT_S:  theme.colors.textSecondary,
    BORDER:  theme.colors.borderDefault,
    PURPLE:  theme.colors.primary,
  }), [theme]);

  const styles = useMemo(() => makeStyles(c, isDark, isTablet), [c, isDark, isTablet]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.BG} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={c.TEXT_P} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notifications')}</Text>
        </View>
        <View style={styles.separator} />

        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>{t('comingSoon')}</Text>
          <Text style={styles.emptyDesc}>{t('comingSoonDesc')}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
