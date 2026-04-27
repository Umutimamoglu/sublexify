import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useProgressStats } from '@/src/api/queries/progress.queries';
import { useKnownWords } from '@/src/api/queries/user.queries';
import { useSettingsStore } from '@/src/store/settingsStore';

type Palette = {
  BG: string; SURFACE: string; SURFACE2: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
};

const STATS = [
  {
    key: 'due',
    icon: 'timer-outline' as const,
    color: '#FF6B6B',
    gradientColors: ['#FF6B6B', '#FF3E3E'] as [string, string],
    route: '/progress/due',
  },
  {
    key: 'learnt',
    icon: 'checkmark-circle-outline' as const,
    color: '#4F9CFF',
    gradientColors: ['#4F9CFF', '#2979FF'] as [string, string],
    route: '/progress/learnt',
  },
  {
    key: 'studied',
    icon: 'pencil-outline' as const,
    color: '#A78BFA',
    gradientColors: ['#A78BFA', '#7C3AED'] as [string, string],
    route: '/progress/studied',
  },
  {
    key: 'difficult',
    icon: 'flash-outline' as const,
    color: '#FBBF24',
    gradientColors: ['#FBBF24', '#F59E0B'] as [string, string],
    route: '/progress/difficult',
  },
];

export default function ProgressScreen() {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation('progress');
  const { isTablet } = useResponsive();
  const router = useRouter();
  const [helpVisible, setHelpVisible] = useState(false);

  const c = useMemo<Palette>(() => ({
    BG: theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surfaceSubtle,
    TEXT_P: theme.colors.textPrimary,
    TEXT_S: theme.colors.textSecondary,
    BORDER: theme.colors.borderDefault,
    PURPLE: theme.colors.primary,
  }), [theme]);

  const { data: stats, isLoading: statsLoading } = useProgressStats();
  const { data: knownWords = [], isLoading: knownLoading } = useKnownWords();
  const { dailyReviewCount } = useSettingsStore();

  const isLoading = statsLoading || knownLoading;
  const totalKnown = knownWords.length;
  const dailyCount = Math.min(dailyReviewCount, stats?.wordsToReviewToday ?? 0);
  const hasData = (stats && (stats.totalWordsLearnt > 0 || stats.totalWordsStudied > 0 || stats.difficultWords > 0)) || totalKnown > 0;

  const statValues = {
    due: dailyCount,
    learnt: stats?.totalWordsLearnt ?? 0,
    studied: stats?.totalWordsStudied ?? 0,
    difficult: stats?.difficultWords ?? 0,
  };

  const statDescs: Record<string, string> = {
    due: t('dueTodayProgress', { count: dailyCount, total: stats?.totalWordsLearnt ?? 0 }),
    learnt: t('totalLearntDesc'),
    studied: t('totalStudiedDesc'),
    difficult: t('difficultHelp'),
  };

  const statLabels: Record<string, string> = {
    due: t('dueTodayTitle'),
    learnt: t('totalLearntTitle'),
    studied: t('totalStudiedTitle'),
    difficult: t('difficultTitle'),
  };

  const helpData = [
    { icon: 'timer-outline' as const, color: '#FF6B6B', label: t('dueTodayTitle'), text: t('dueTodayHelp') },
    { icon: 'checkmark-circle-outline' as const, color: '#4F9CFF', label: t('totalLearntTitle'), text: t('totalLearntHelp') },
    { icon: 'pencil-outline' as const, color: '#A78BFA', label: t('totalStudiedTitle'), text: t('totalStudiedHelp') },
    { icon: 'flash-outline' as const, color: '#FBBF24', label: t('difficultTitle'), text: t('difficultHelp') },
  ];

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: c.BG },
    safe: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: isDark ? '#ffffff12' : '#00000009',
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: c.TEXT_P, fontSize: 28, fontWeight: '800', flex: 1, letterSpacing: -0.5 },
    infoBtn: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: isDark ? '#ffffff12' : '#00000009',
      alignItems: 'center', justifyContent: 'center',
    },

    // Hero ring
    heroWrap: {
      alignItems: 'center', paddingVertical: 28,
    },
    heroRing: {
      width: 140, height: 140, borderRadius: 70,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 3,
      borderColor: isDark ? '#ffffff10' : '#e0e0f0',
    },
    heroInnerRing: {
      width: 116, height: 116, borderRadius: 58,
      alignItems: 'center', justifyContent: 'center',
    },
    heroNum: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
    heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
    heroCaption: { color: c.TEXT_S, fontSize: 13, marginTop: 10, textAlign: 'center' },

    // Section
    sectionLabel: {
      color: c.TEXT_S, fontSize: 11, fontWeight: '700',
      letterSpacing: 1.4, textTransform: 'uppercase',
      marginBottom: 14, marginTop: 4, paddingHorizontal: 20,
    },

    // Stat cards 2x2
    grid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 12,
      paddingHorizontal: 20,
    },
    card: {
      width: '47%',
      backgroundColor: isDark ? '#1C1C2E' : '#FFFFFF',
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: isDark ? '#ffffff0a' : '#f0f0f7',
      overflow: 'hidden' as const,
      // shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    cardIconWrap: {
      width: 42, height: 42, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 14,
    },
    cardValue: { fontSize: 34, fontWeight: '900', letterSpacing: -1 },
    cardLabel: { color: c.TEXT_P, fontSize: 13, fontWeight: '700', marginTop: 4 },
    cardDesc: { color: c.TEXT_S, fontSize: 11, marginTop: 4, lineHeight: 15 },
    cardChevron: {
      position: 'absolute' as const, top: 14, right: 14,
    },
    cardGlow: {
      position: 'absolute' as const,
      top: -20, right: -20,
      width: 80, height: 80, borderRadius: 40,
      opacity: isDark ? 0.12 : 0.07,
    },

    // Empty
    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
    emptyIcon: { fontSize: 56 },
    emptyTitle: { color: c.TEXT_P, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    emptyDesc: { color: c.TEXT_S, fontSize: 14, textAlign: 'center', lineHeight: 22 },
    goBtn: { marginTop: 8, backgroundColor: c.PURPLE, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
    goBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: isDark ? '#1C1C2E' : '#fff',
      borderTopLeftRadius: 32, borderTopRightRadius: 32,
      paddingBottom: 40, maxHeight: '85%',
    },
    modalHandle: { width: 40, height: 4, backgroundColor: isDark ? '#ffffff20' : '#00000012', borderRadius: 2, alignSelf: 'center', marginVertical: 14 },
    modalScroll: { paddingHorizontal: 24 },
    modalTitle: { color: c.TEXT_P, fontSize: 22, fontWeight: '900', marginBottom: 24 },
    helpItem: { marginBottom: 24, gap: 8 },
    helpRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    helpIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    helpLabel: { color: c.TEXT_P, fontSize: 16, fontWeight: '800', flex: 1 },
    helpText: { color: c.TEXT_S, fontSize: 14, lineHeight: 22 },
  }), [c, isDark]);

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.BG} />
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={c.TEXT_P} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('title')}</Text>
          <TouchableOpacity style={s.infoBtn} onPress={() => setHelpVisible(true)} activeOpacity={0.7}>
            <Ionicons name="information-circle-outline" size={22} color={c.TEXT_P} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={c.PURPLE} size="large" />
          </View>
        ) : !hasData ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>📊</Text>
            <Text style={s.emptyTitle}>{t('noProgress')}</Text>
            <Text style={s.emptyDesc}>{t('noProgressDesc')}</Text>
            <TouchableOpacity style={s.goBtn} onPress={() => router.push('/(tabs)/lists' as any)} activeOpacity={0.85}>
              <Text style={s.goBtnText}>{t('goToLists')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

            {/* Hero ring — Öğrenilen kelimeler */}
            <View style={s.heroWrap}>
              <View style={s.heroRing}>
                <LinearGradient
                  colors={['#4F9CFF', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.heroInnerRing}
                >
                  <Text style={s.heroNum}>{stats?.totalWordsLearnt ?? 0}</Text>
                  <Text style={s.heroLabel}>{t('totalLearntTitle')}</Text>
                </LinearGradient>
              </View>
              <Text style={s.heroCaption}>{t('totalLearntDesc')}</Text>
            </View>

            {/* 2x2 stat grid */}
            <Text style={s.sectionLabel}>{t('stats')}</Text>
            <View style={s.grid}>
              {STATS.map((st) => {
                const value = statValues[st.key as keyof typeof statValues];
                return (
                  <TouchableOpacity
                    key={st.key}
                    style={s.card}
                    onPress={() => router.push(st.route as any)}
                    activeOpacity={0.75}
                  >
                    {/* Glow blob */}
                    <View style={[s.cardGlow, { backgroundColor: st.color }]} />

                    <View style={[s.cardIconWrap, { backgroundColor: st.color + '20' }]}>
                      <Ionicons name={st.icon} size={22} color={st.color} />
                    </View>

                    <Text style={[s.cardValue, { color: st.color }]}>{value}</Text>
                    <Text style={s.cardLabel} numberOfLines={1}>{statLabels[st.key]}</Text>
                    <Text style={s.cardDesc} numberOfLines={2}>{statDescs[st.key]}</Text>

                    <View style={s.cardChevron}>
                      <Ionicons name="chevron-forward" size={14} color={c.TEXT_S} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Help Modal */}
        <Modal visible={helpVisible} transparent animationType="slide" onRequestClose={() => setHelpVisible(false)}>
          <Pressable style={s.modalOverlay} onPress={() => setHelpVisible(false)}>
            <Pressable style={s.modalContent}>
              <View style={s.modalHandle} />
              <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={s.modalTitle}>{t('helpTitle')}</Text>
                {helpData.map((item, idx) => (
                  <View key={idx} style={s.helpItem}>
                    <View style={s.helpRow}>
                      <View style={[s.helpIconBox, { backgroundColor: item.color + '22' }]}>
                        <Ionicons name={item.icon} size={18} color={item.color} />
                      </View>
                      <Text style={s.helpLabel}>{item.label}</Text>
                    </View>
                    <Text style={s.helpText}>{item.text}</Text>
                  </View>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

      </SafeAreaView>
    </View>
  );
}
