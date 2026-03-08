import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useUserStats } from '@/src/api/queries/user.queries';
import { useProgressStats } from '@/src/api/queries/progress.queries';
import { Palette as TokenPalette } from '@/src/theme/tokens';

// ─── Daily Tips ────────────────────────────────────────────────────────────────
const DAILY_TIPS: Record<string, string[]> = {
  en: [
    'Context is king. Learn words through your favorite movie scenes for better retention.',
    'Review words before sleep — your brain consolidates memory during rest.',
    'Try to use a new word in a sentence today, even just in your head.',
    'Listening to content in your target language, even passively, helps enormously.',
    'Spaced repetition is proven to be the most efficient memorization method.',
    "Don't fear mistakes — making errors is how your brain builds fluency.",
    'Set a small daily goal and stick to it. Consistency beats intensity.',
  ],
  tr: [
    'Bağlam her şeydir. Kelimeleri favori film sahnelerin üzerinden öğren.',
    'Uyumadan önce tekrar yap — beyin uyku sırasında hafızayı pekiştirir.',
    'Bugün yeni bir kelimeyi bir cümlede kullanmayı dene.',
    'Hedef dilindeki içeriklere pasif de olsa kulak ver.',
    'Aralıklı tekrar, ezberlemenin en verimli yöntemi olarak kanıtlanmıştır.',
    'Hata yapmaktan korkma — hatalar beynin akıcılık inşa etme yoludur.',
    'Küçük günlük hedefler belirle ve ısrarcı ol. Tutarlılık, yoğunluktan önemlidir.',
  ],
};

// ─── CEFR Helper ───────────────────────────────────────────────────────────────
function getCefrBadge(known: number, total: number): { level: string; next: string } {
  const pct = total > 0 ? known / total : 0;
  if (pct >= 0.75) return { level: 'C2', next: 'C2' };
  if (pct >= 0.50) return { level: 'C1', next: 'C2' };
  if (pct >= 0.30) return { level: 'B2', next: 'C1' };
  if (pct >= 0.15) return { level: 'B1', next: 'B2' };
  if (pct >= 0.05) return { level: 'A2', next: 'B1' };
  return { level: 'A1', next: 'A2' };
}

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
    root: { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: pad, paddingTop: 20, paddingBottom: 16,
    },
    headerTitle: {
      flex: 1, textAlign: 'center',
      color: c.TEXT_P, fontSize: 14, fontWeight: '800', letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    headerIconBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: isDark ? '#ffffff10' : '#00000008',
      alignItems: 'center', justifyContent: 'center',
    },
    headerSpacer: { width: 36 },

    separator: { height: 1, backgroundColor: isDark ? '#ffffff0f' : '#e0e0ea', marginBottom: 4 },

    body: { paddingHorizontal: pad, paddingBottom: 40 },

    // ── Profile header ─────────────────────────────────────────────
    profileSection: { alignItems: 'center', paddingVertical: 24 },
    avatarWrapper: {
      borderRadius: 40,
      shadowColor: c.PURPLE,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: Platform.OS === 'ios' ? 0.55 : 0.8,
      shadowRadius: 18,
      elevation: 12,
    },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: c.PURPLE,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 28, fontWeight: '900' },
    cefrBadge: {
      position: 'absolute', bottom: 0, right: -4,
      backgroundColor: c.PURPLE,
      borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
      borderWidth: 2, borderColor: c.BG,
    },
    cefrBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    userName: { color: c.TEXT_P, fontSize: 20, fontWeight: '800', marginTop: 14 },
    userEmail: { color: c.TEXT_S, fontSize: 13, marginTop: 3 },

    // ── Stats row ──────────────────────────────────────────────────
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statCard: {
      flex: 1, backgroundColor: c.SURFACE,
      borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: cardBorder,
    },
    statIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    statIconLabel: { color: c.TEXT_S, fontSize: 11, fontWeight: '700', letterSpacing: 1.0, textTransform: 'uppercase' },
    statValue: { color: c.TEXT_P, fontSize: 26, fontWeight: '900' },
    statSub: { color: '#10b981', fontSize: 12, fontWeight: '600', marginTop: 4 },

    // ── Progress card ──────────────────────────────────────────────
    progressCard: {
      backgroundColor: c.SURFACE,
      borderRadius: 16, padding: 20,
      borderWidth: 1, borderColor: cardBorder,
      marginBottom: 12,
    },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
    progressTitle: { color: c.TEXT_P, fontSize: 15, fontWeight: '700' },
    progressSub: { color: c.TEXT_S, fontSize: 12, marginTop: 2 },
    progressXP: { color: c.PURPLE, fontSize: 12, fontWeight: '700' },
    progressTrack: {
      height: 8, borderRadius: 8, marginTop: 14,
      backgroundColor: isDark ? '#2a2a35' : '#e8e4f8',
      overflow: 'hidden',
    },
    progressFill: { height: 8, borderRadius: 8, backgroundColor: TokenPalette.teal500 },

    // ── Daily tip card ─────────────────────────────────────────────
    tipCard: {
      backgroundColor: isDark ? '#191825' : c.PURPLE + '0d',
      borderRadius: 16, padding: 20,
      borderWidth: 1, borderColor: isDark ? '#8b5cf610' : c.PURPLE + '20',
      marginBottom: 12,
    },
    tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    tipLabel: { color: c.PURPLE, fontSize: 11, fontWeight: '800', letterSpacing: 1.0, textTransform: 'uppercase' },
    tipText: { color: isDark ? 'rgba(255,255,255,0.8)' : c.TEXT_P, fontSize: 14, lineHeight: 22 },

    // ── Settings section ───────────────────────────────────────────
    sectionLabel: {
      color: c.TEXT_S, fontSize: 11, fontWeight: '700',
      letterSpacing: 1.5, textTransform: 'uppercase',
      marginTop: 20, marginBottom: 12,
    },
    settingsCard: {
      backgroundColor: c.SURFACE,
      borderRadius: 16,
      borderWidth: 1, borderColor: cardBorder,
      overflow: 'hidden',
    },
    tile: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 16, gap: 14,
    },
    tileDivider: { height: 1, backgroundColor: isDark ? '#ffffff08' : '#f0f0f5', marginHorizontal: 16 },
    tileIconBox: {
      width: 38, height: 38, borderRadius: 10,
      backgroundColor: isDark ? '#2a2a35' : '#f0eeff',
      alignItems: 'center', justifyContent: 'center',
    },
    tileLabel: { flex: 1, color: c.TEXT_P, fontSize: 15, fontWeight: '500' },

    // ── Log out ────────────────────────────────────────────────────
    logOutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 18, marginTop: 28,
    },
    logOutText: { color: c.TEXT_S, fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },

    loadingBox: { height: 160, alignItems: 'center', justifyContent: 'center' },
  });
}

// ─── Settings Tile ─────────────────────────────────────────────────────────────
function SettingsTile({
  icon, label, onPress, styles, isLast, isDark,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  isLast: boolean; isDark: boolean;
}) {
  const iconColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';
  return (
    <>
      <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.tileIconBox}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={styles.tileLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color={iconColor} />
      </TouchableOpacity>
      {!isLast && <View style={styles.tileDivider} />}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation('profile');
  const { isTablet } = useResponsive();
  const router = useRouter();

  const { data: userStats, isLoading: loadingUser } = useUserStats();
  const { data: progress, isLoading: loadingProgress } = useProgressStats();

  const c = useMemo<Palette>(() => ({
    BG: theme.colors.background,
    SURFACE: theme.colors.surface,
    TEXT_P: theme.colors.textPrimary,
    TEXT_S: theme.colors.textSecondary,
    BORDER: theme.colors.borderDefault,
    PURPLE: theme.colors.primary,
  }), [theme]);

  const styles = useMemo(() => makeStyles(c, isDark, isTablet), [c, isDark, isTablet]);

  const isLoading = loadingUser || loadingProgress;
  const known = userStats?.totalKnownWords ?? 0;
  const total = userStats?.totalWords ?? 0;
  const mastered = progress?.masteredWords ?? 0;
  const dueToday = progress?.dueToday ?? 0;

  const progressPct = total > 0 ? Math.min(known / total, 1) : 0;
  const cefr = getCefrBadge(known, total);

  const lang = (i18n.language?.split('-')[0] === 'tr') ? 'tr' : 'en';
  const dailyTip = DAILY_TIPS[lang][new Date().getDay()];

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const settingsTiles: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    route: string;
  }[] = [
      { icon: 'bar-chart-outline', label: t('progress'), route: '/progress' },
      { icon: 'person-outline', label: t('accountDetails'), route: '/profile/account' },
      { icon: 'notifications-outline', label: t('notifications'), route: '/profile/notifications' },
      { icon: 'language-outline', label: t('languagePreferences'), route: '/profile/language' },
    ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.BG} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>{t('title')}</Text>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push('/profile/language' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={18} color={c.TEXT_P} />
          </TouchableOpacity>
        </View>
        <View style={styles.separator} />

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

          {/* ── Profile Header ── */}
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.cefrBadge}>
                <Text style={styles.cefrBadgeText}>{cefr.level}</Text>
              </View>
            </View>
            <Text style={styles.userName}>{user?.name ?? '—'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? '—'}</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={c.PURPLE} size="large" />
            </View>
          ) : (
            <>
              {/* ── Stats Row ── */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.statIconRow}>
                    <Ionicons name="star-outline" size={14} color={c.PURPLE} />
                    <Text style={styles.statIconLabel}>{t('mastered')}</Text>
                  </View>
                  <Text style={styles.statValue}>{mastered.toLocaleString()}</Text>
                  <Text style={styles.statSub}>{t('masteredDesc')}</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statIconRow}>
                    <Ionicons name="flame-outline" size={14} color={TokenPalette.teal500} />
                    <Text style={styles.statIconLabel}>{t('dueTodayLabel')}</Text>
                  </View>
                  <Text style={styles.statValue}>{dueToday.toLocaleString()}</Text>
                  <Text style={[styles.statSub, { color: TokenPalette.teal500 }]}>{t('dueTodayDesc')}</Text>
                </View>
              </View>

              {/* ── Progress Card ── */}
              <View style={styles.progressCard}>
                <View style={styles.progressRow}>
                  <View>
                    <Text style={styles.progressTitle}>{t('wordMastery')}</Text>
                    <Text style={styles.progressSub}>
                      {cefr.next !== cefr.level
                        ? t('levelingUp', { level: cefr.next })
                        : cefr.level}
                    </Text>
                  </View>
                  <Text style={styles.progressXP}>
                    {t('wordsProgress', { known: known.toLocaleString(), total: total.toLocaleString() })}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
                </View>
              </View>

              {/* ── Daily Tip ── */}
              <View style={styles.tipCard}>
                <View style={styles.tipHeader}>
                  <Ionicons name="bulb-outline" size={16} color={c.PURPLE} />
                  <Text style={styles.tipLabel}>{t('dailyTip')}</Text>
                </View>
                <Text style={styles.tipText}>{dailyTip}</Text>
              </View>
            </>
          )}

          {/* ── Settings ── */}
          <Text style={styles.sectionLabel}>{t('settings')}</Text>
          <View style={styles.settingsCard}>
            {settingsTiles.map((tile, i) => (
              <SettingsTile
                key={tile.route}
                icon={tile.icon}
                label={tile.label}
                onPress={() => router.push(tile.route as any)}
                styles={styles}
                isLast={i === settingsTiles.length - 1}
                isDark={isDark}
              />
            ))}
          </View>

          {/* ── Log Out ── */}
          <TouchableOpacity style={styles.logOutBtn} onPress={logout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color={c.TEXT_S} />
            <Text style={styles.logOutText}>{t('logOut').toUpperCase()}</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
