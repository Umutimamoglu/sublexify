import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { Palette as TokenPalette } from '@/src/theme/tokens';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useProgressStats } from '@/src/api/queries/progress.queries';

type Palette = {
  BG: string; SURFACE: string; SURFACE2: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
};

function makeStyles(c: Palette, isDark: boolean, isTablet: boolean) {
  const pad = isTablet ? 32 : 16;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },

    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: pad, paddingTop: 20, paddingBottom: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: isDark ? '#ffffff10' : '#00000008',
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: c.TEXT_P, fontSize: 26, fontWeight: '900', flex: 1 },

    separator: { height: 1, backgroundColor: isDark ? '#ffffff0f' : '#e0e0ea', marginBottom: 24 },

    body: { flex: 1, paddingHorizontal: pad },

    // Stat cards
    statsGrid: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: 12,
    },
    statCard: {
      flex: isTablet ? 1 : undefined,
      backgroundColor: c.SURFACE,
      borderRadius: 18, padding: 20,
      borderWidth: 1,
      borderColor: isDark ? '#ffffff0f' : c.BORDER,
      flexDirection: 'row', alignItems: 'center', gap: 16,
    },
    statIconBox: {
      width: 48, height: 48, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    statIcon: { fontSize: 22 },
    statInfo: { flex: 1 },
    statValue: { fontSize: 28, fontWeight: '900' },
    statLabel: { color: c.TEXT_P, fontSize: 14, fontWeight: '700', marginTop: 2 },
    statDesc: { color: c.TEXT_S, fontSize: 12, marginTop: 3, lineHeight: 16 },

    // Section label
    sectionLabel: {
      color: c.TEXT_S, fontSize: 11, fontWeight: '700',
      letterSpacing: 1.2, textTransform: 'uppercase',
      marginBottom: 16, marginTop: 28,
    },

    // Empty state
    emptyBox: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      gap: 14, paddingHorizontal: pad,
    },
    emptyIcon: { fontSize: 64 },
    emptyTitle: { color: c.TEXT_P, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    emptyDesc: { color: c.TEXT_S, fontSize: 15, textAlign: 'center', lineHeight: 22 },
    goBtn: {
      marginTop: 8, backgroundColor: c.PURPLE, borderRadius: 14,
      paddingHorizontal: 32, paddingVertical: 14,
    },
    goBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon, value, label, desc, styles, color, onPress
}: {
  icon: string; value: number; label: string; desc: string; styles: ReturnType<typeof makeStyles>;
  color: string;
  onPress?: () => void;
}) {
  const CardContent = (
    <View style={[styles.statCard, { borderColor: `${color}40` }]}>
      <View style={[styles.statIconBox, { backgroundColor: `${color}22` }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <View style={styles.statInfo}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statDesc}>{desc}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ width: '100%' }}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation('progress');
  const { isTablet } = useResponsive();
  const router = useRouter();

  const c = useMemo<Palette>(() => ({
    BG: theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surfaceSubtle,
    TEXT_P: theme.colors.textPrimary,
    TEXT_S: theme.colors.textSecondary,
    BORDER: theme.colors.borderDefault,
    PURPLE: theme.colors.primary,
  }), [theme]);

  const styles = useMemo(() => makeStyles(c, isDark, isTablet), [c, isDark, isTablet]);

  const { data: stats, isLoading } = useProgressStats();

  const hasData = stats && (stats.totalWordsLearnt > 0 || stats.totalWordsStudied > 0 || stats.highRetentionWords > 0 || stats.wordsToReviewToday > 0);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.BG} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={c.TEXT_P} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('title')}</Text>
        </View>
        <View style={styles.separator} />

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={c.PURPLE} size="large" />
          </View>
        ) : !hasData ? (
          /* Empty state */
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>{t('noProgress')}</Text>
            <Text style={styles.emptyDesc}>{t('noProgressDesc')}</Text>
            <TouchableOpacity
              style={styles.goBtn}
              onPress={() => router.push('/(tabs)/lists' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.goBtnText}>{t('goToLists')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Stats */
          <View style={styles.body}>
            <Text style={styles.sectionLabel}>{t('stats')}</Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon="🎯"
                value={stats.wordsToReviewToday}
                label={t('dueToday')}
                desc={t('dueTodayDesc')}
                styles={styles}
                color="#F43F5E"
                onPress={() => router.push('/progress/due' as any)}
              />
              <StatCard
                icon="📖"
                value={stats.totalWordsLearnt}
                label={t('totalLearnt')}
                desc={t('totalLearntDesc')}
                styles={styles}
                color="#4F46E5"
                onPress={() => router.push('/progress/learnt' as any)}
              />
              <StatCard
                icon="✏️"
                value={stats.totalWordsStudied}
                label={t('totalStudied')}
                desc={t('totalStudiedDesc')}
                styles={styles}
                color="#D946EF"
                onPress={() => router.push('/progress/studied' as any)}
              />
              <StatCard
                icon="⭐"
                value={stats.highRetentionWords}
                label={t('mastered')}
                desc={t('masteredDesc')}
                styles={styles}
                color="#10B981"
                onPress={() => router.push('/progress/mastered' as any)}
              />
            </View>
          </View>
        )}

      </SafeAreaView>
    </View>
  );
}
