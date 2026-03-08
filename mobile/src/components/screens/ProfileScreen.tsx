import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/i18n/useTranslation';
import { changeLanguage, type SupportedLanguage } from '@/src/i18n';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useUserStats } from '@/src/api/queries/user.queries';
import type { ThemePreference } from '@/src/store/settingsStore';

// ─── Palette ───────────────────────────────────────────────────────────────────
type Palette = {
  BG: string; SURFACE: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
};

// ─── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(c: Palette, isDark: boolean, isTablet: boolean) {
  const pad = isTablet ? 32 : 20;
  const cardBorder = isDark ? '#ffffff0f' : c.BORDER;

  return StyleSheet.create({
    root:     { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },

    header: { paddingHorizontal: pad, paddingTop: 20, paddingBottom: 12 },
    headerTitle: { color: c.TEXT_P, fontSize: 26, fontWeight: '900' },

    separator: {
      height: 1,
      backgroundColor: isDark ? '#ffffff0f' : '#e0e0ea',
      marginBottom: 8,
    },

    body: { paddingHorizontal: pad, paddingBottom: 40 },

    // ── User card ──────────────────────────────────────────────
    userCard: {
      flexDirection: 'row', alignItems: 'center', gap: 16,
      backgroundColor: c.SURFACE,
      borderRadius: 20, padding: 20, marginTop: 16,
      borderWidth: 1, borderColor: cardBorder,
    },
    avatar: {
      width: 54, height: 54, borderRadius: 27,
      backgroundColor: c.PURPLE,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
    userInfo:  { flex: 1 },
    userName:  { color: c.TEXT_P, fontSize: 17, fontWeight: '700' },
    userEmail: { color: c.TEXT_S, fontSize: 13, marginTop: 2 },

    // ── Section label ──────────────────────────────────────────
    sectionLabel: {
      color: c.TEXT_S, fontSize: 11, fontWeight: '700',
      letterSpacing: 1.2, textTransform: 'uppercase',
      marginTop: 28, marginBottom: 12,
    },

    // ── Stat card ──────────────────────────────────────────────
    statCard: {
      backgroundColor: c.SURFACE,
      borderRadius: 18, padding: 20,
      borderWidth: 1, borderColor: cardBorder,
      flexDirection: 'row', alignItems: 'center', gap: 16,
      marginBottom: 10,
    },
    statIconBox: {
      width: 48, height: 48, borderRadius: 14,
      backgroundColor: c.PURPLE + '22',
      alignItems: 'center', justifyContent: 'center',
    },
    statIcon:  { fontSize: 22 },
    statInfo:  { flex: 1 },
    statValue: { color: c.PURPLE, fontSize: 28, fontWeight: '900' },
    statLabel: { color: c.TEXT_P, fontSize: 14, fontWeight: '700', marginTop: 2 },
    statDesc:  { color: c.TEXT_S, fontSize: 12, marginTop: 3, lineHeight: 16 },

    // ── Settings card ──────────────────────────────────────────
    settingsCard: {
      backgroundColor: c.SURFACE,
      borderRadius: 18, padding: 20,
      borderWidth: 1, borderColor: cardBorder,
      gap: 18,
    },
    settingsRow: { gap: 8 },
    settingsRowLabel: { color: c.TEXT_S, fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 4 },
    chipRow: { flexDirection: 'row', gap: 8 },
    chip: {
      paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#ffffff10' : '#f0eeff',
    },
    chipActive: { backgroundColor: c.PURPLE },
    chipText:       { color: c.TEXT_S, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#fff',   fontSize: 13, fontWeight: '600' },

    // ── Account card ───────────────────────────────────────────
    accountCard: {
      backgroundColor: c.SURFACE,
      borderRadius: 18, padding: 20,
      borderWidth: 1, borderColor: cardBorder,
    },
    signOutBtn: {
      backgroundColor: '#ef44440f',
      borderRadius: 14, paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#ef444420' : '#ef444430',
    },
    signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },

    // ── Loading ────────────────────────────────────────────────
    loadingBox: { height: 100, alignItems: 'center', justifyContent: 'center' },
  });
}

// ─── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({
  icon, value, label, desc, styles,
}: {
  icon: string; value: number; label: string; desc: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconBox}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statDesc}>{desc}</Text>
      </View>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { theme, isDark, themePreference, setThemePreference } = useTheme();
  const { user, logout } = useAuth();
  const { language, setLanguage } = useSettingsStore();
  const { t } = useTranslation('profile');
  const { isTablet } = useResponsive();

  const { data: stats, isLoading } = useUserStats();

  const c: Palette = {
    BG:      theme.colors.background,
    SURFACE: theme.colors.surface,
    TEXT_P:  theme.colors.textPrimary,
    TEXT_S:  theme.colors.textSecondary,
    BORDER:  theme.colors.border,
    PURPLE:  theme.colors.primary,
  };

  const styles = useMemo(() => makeStyles(c, isDark, isTablet), [c, isDark, isTablet]);

  const themeOptions: { label: string; value: ThemePreference }[] = [
    { label: t('themeLight'),  value: 'light' },
    { label: t('themeDark'),   value: 'dark' },
    { label: t('themeSystem'), value: 'system' },
  ];

  const langOptions: { label: string; value: SupportedLanguage }[] = [
    { label: t('languageEn'), value: 'en' },
    { label: t('languageTr'), value: 'tr' },
  ];

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    setLanguage(lang);
    await changeLanguage(lang);
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.BG} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('title')}</Text>
        </View>
        <View style={styles.separator} />

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

          {/* ── User card ── */}
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name ?? '—'}</Text>
              <Text style={styles.userEmail}>{user?.email ?? '—'}</Text>
            </View>
          </View>

          {/* ── Statistics ── */}
          <Text style={styles.sectionLabel}>{t('statistics')}</Text>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={c.PURPLE} />
            </View>
          ) : (
            <>
              <StatCard
                icon="📚"
                value={stats?.totalKnownWords ?? 0}
                label={t('knownWords')}
                desc={t('knownWordsDesc')}
                styles={styles}
              />
              <StatCard
                icon="🌍"
                value={stats?.totalWords ?? 0}
                label={t('totalWords')}
                desc={t('totalWordsDesc')}
                styles={styles}
              />
            </>
          )}

          {/* ── Settings ── */}
          <Text style={styles.sectionLabel}>{t('settings')}</Text>
          <View style={styles.settingsCard}>

            {/* Theme */}
            <View style={styles.settingsRow}>
              <Text style={styles.settingsRowLabel}>{t('theme')}</Text>
              <View style={styles.chipRow}>
                {themeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, themePreference === opt.value && styles.chipActive]}
                    onPress={() => setThemePreference(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={themePreference === opt.value ? styles.chipTextActive : styles.chipText}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Language */}
            <View style={styles.settingsRow}>
              <Text style={styles.settingsRowLabel}>{t('language')}</Text>
              <View style={styles.chipRow}>
                {langOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, language === opt.value && styles.chipActive]}
                    onPress={() => handleLanguageChange(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={language === opt.value ? styles.chipTextActive : styles.chipText}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>

          {/* ── Account ── */}
          <Text style={styles.sectionLabel}>{t('account')}</Text>
          <View style={styles.accountCard}>
            <TouchableOpacity style={styles.signOutBtn} onPress={logout} activeOpacity={0.8}>
              <Text style={styles.signOutText}>{t('signOut')}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
