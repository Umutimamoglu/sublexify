import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';

type Palette = {
  BG: string; SURFACE: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
};

function makeStyles(c: Palette, isDark: boolean, isTablet: boolean) {
  const pad = isTablet ? 32 : 20;
  const cardBorder = isDark ? '#ffffff0f' : c.BORDER;

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

    body: { paddingHorizontal: pad },

    sectionLabel: {
      color: c.TEXT_S, fontSize: 11, fontWeight: '700',
      letterSpacing: 1.2, textTransform: 'uppercase',
      marginBottom: 12, marginTop: 8,
    },

    card: {
      backgroundColor: c.SURFACE,
      borderRadius: 18, padding: 20,
      borderWidth: 1, borderColor: cardBorder, gap: 16,
    },
    row: {
      gap: 4,
    },
    rowLabel: { color: c.TEXT_S, fontSize: 12, fontWeight: '600' },
    rowValue: { color: c.TEXT_P, fontSize: 16, fontWeight: '600' },
  });
}

export default function AccountScreen() {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();
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
          <Text style={styles.headerTitle}>{t('accountDetails')}</Text>
        </View>
        <View style={styles.separator} />

        <View style={styles.body}>
          <Text style={styles.sectionLabel}>{t('account')}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('name')}</Text>
              <Text style={styles.rowValue}>{user?.name ?? '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('email')}</Text>
              <Text style={styles.rowValue}>{user?.email ?? '—'}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
