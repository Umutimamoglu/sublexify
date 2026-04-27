import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useResponsive } from '@/src/hooks/useResponsive';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  ActivityIndicator,
  Image,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { OverallDifficultyBadge } from '@/src/components/ui';
import { useMedia, useContinueLearning } from '@/src/api/queries/media.queries';
import { useLists, useListsBySeries } from '@/src/api/queries/lists.queries';
import { Modal } from 'react-native';
import { useUserStats } from '@/src/api/queries/user.queries';
import { AllMediaModal } from '@/src/components/ui/AllMediaModal';
import { ContinueLearningModal } from '@/src/components/ui/ContinueLearningModal';
import { useAuthStore } from '@/src/store/authStore';
import { useStreakStore } from '@/src/store/streakStore';
import type { MediaDTO, WordListDTO, UserStatistics } from '@/src/types/api';

type HeroItem = MediaDTO & { _s01e01Id?: number; _seasonCount?: number; _episodeCount?: number };

const CEFR_COLORS: Record<string, string> = {
  A1: '#34D399', A2: '#4ADE80',
  B1: '#FBBF24', B2: '#FB923C',
  C1: '#EF4444', C2: '#A855F7',
};

const CARD_R = 14;

// ─── Card Accent Palette ──────────────────────────────────────
const CARD_ACCENTS = [
  { darkBg: '#1a0f2e', lightBg: '#2d1a4a', accent: '#9333ea' },
  { darkBg: '#0f1a2e', lightBg: '#1a2d4a', accent: '#3b82f6' },
  { darkBg: '#1a1a0f', lightBg: '#2a2a0f', accent: '#ca8a04' },
  { darkBg: '#0f1a1a', lightBg: '#1a2d2d', accent: '#10b981' },
  { darkBg: '#1a0f0f', lightBg: '#2d1515', accent: '#ef4444' },
] as const;

function cardAccent(id: number) {
  return CARD_ACCENTS[id % CARD_ACCENTS.length];
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function listIconName(name: string): IoniconName {
  const n = name.toLowerCase();
  if (n.includes('oxford') || n.includes('essential')) return 'school-outline';
  if (n.includes('business') || n.includes('professional')) return 'briefcase-outline';
  if (n.includes('phrasal')) return 'extension-puzzle-outline';
  if (n.includes('slang')) return 'chatbubbles-outline';
  if (n.includes('adjective')) return 'color-palette-outline';
  if (n.includes('adverb')) return 'flash-outline';
  if (n.includes('verb')) return 'settings-outline';
  return 'library-outline';
}

function episodeLabel(media: MediaDTO): string {
  if (media.type === 'EPISODE' && media.seasonNumber && media.episodeNumber) {
    return `S${media.seasonNumber}:E${media.episodeNumber}`;
  }
  if (media.type === 'MOVIE') return 'Movie';
  return media.type;
}

// Benzersiz gösterimler için: MOVIE'ler + her diziden ilk EPISODE (imdbId bazlı)
type MediaFilter = 'all' | 'movie' | 'series';

function deduplicateMedia(items: MediaDTO[], filter: MediaFilter): MediaDTO[] {
  const seen = new Set<string>();
  return items.filter((m) => {
    if (m.type === 'MOVIE') {
      if (filter === 'series') return false;
      return true;
    }
    if (m.type === 'EPISODE' || m.type === 'SEASON') {
      if (filter === 'movie') return false;
      if (!m.imdbId) return false;
      if (seen.has(m.imdbId)) return false;
      seen.add(m.imdbId);
      return true;
    }
    return false;
  });
}

// Dizi kartı için gösterim başlığı: "Show Title - S1:E1" → "Show Title"
function seriesTitle(media: MediaDTO): string {
  if (media.type !== 'MOVIE') {
    const idx = media.title.indexOf(' - ');
    if (idx > 0) return media.title.substring(0, idx);
  }
  return media.title;
}

// ─── Styles Factory ───────────────────────────────────────────
type Palette = {
  BG: string; SURFACE: string; SURFACE2: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
};

function makeStyles(c: Palette, isDark: boolean, isTablet: boolean, sw: number, sh: number, topInset: number) {
  const pad = isTablet ? 32 : 16;
  const mediaCardW = isTablet ? 340 : 270;
  const heroHeight = sh * 0.46;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.BG },
    scrollContent: { paddingBottom: 100 },

    // ─── Hero Carousel ────────────────────────────────────────
    heroContainer: { width: sw, height: heroHeight },
    heroSlide: { width: sw, height: heroHeight },
    heroImage: { ...StyleSheet.absoluteFillObject, width: sw, height: heroHeight },
    heroGradient: { ...StyleSheet.absoluteFillObject },
    heroContent: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingHorizontal: pad, paddingBottom: 46,
    },
    heroEpisode: { color: '#ffffffbb', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
    heroTitle: { color: '#ffffff', fontSize: 28, fontWeight: '900', letterSpacing: -0.3 },
    heroSubtitle: { color: '#ffffffaa', fontSize: 13, marginTop: 6 },
    heroBtnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
    heroBtnOuter: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    heroBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
        borderTopWidth: 1.5,
        borderBottomWidth: 1.5,
        borderColor: "rgba(255,255,255,0.6)",
    },
    heroBtnPrimaryText: {
        color: "#FEE76C",
        fontWeight: "900",
        fontSize: 15,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    heroBtnSecondary: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10,
      borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    },
    heroBtnSecondaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },

    // Pagination dots
    dotsContainer: {
      position: 'absolute', bottom: 12, left: 0, right: 0,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      gap: 6, zIndex: 10,
    },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.TEXT_S + '55' },
    dotActive: { width: 20, backgroundColor: '#FEE76C' },

    // ─── Floating Header (absolute on hero) ───────────────────
    headerOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0,
      paddingTop: topInset + 8,
      paddingHorizontal: pad, paddingBottom: 10,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      zIndex: 10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    headerGreeting: { color: '#fff', fontSize: 17, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    streakBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(80,10,10,0.75)',
      borderWidth: 1.5, borderColor: 'rgba(220,50,50,0.5)',
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    },
    streakIcon: { fontSize: 16, color: '#ef4444' },
    streakCount: { color: '#ef4444', fontSize: 16, fontWeight: '800' },

    // Streak Modal
    streakModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: pad },
    streakModalContent: { backgroundColor: c.SURFACE, width: '100%', maxWidth: 400, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    streakModalIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    streakModalIcon: { fontSize: 32 },
    streakModalTitle: { color: c.TEXT_P, fontSize: 20, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
    streakModalBody: { color: c.TEXT_S, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
    streakModalBtn: { backgroundColor: c.PURPLE, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, width: '100%', alignItems: 'center' },
    streakModalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // ─── Empty hero (no continue learning) ────────────────────
    heroEmpty: {
      width: sw, height: heroHeight * 0.65,
      alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingTop: topInset,
    },
    heroEmptyIcon: { fontSize: 44 },
    heroEmptyTitle: { color: c.TEXT_P, fontSize: 16, fontWeight: '700' },
    heroEmptySubtitle: { color: c.TEXT_S, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

    // ─── Section ──────────────────────────────────────────────
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: pad, marginBottom: 12 },
    sectionTitle: { color: c.TEXT_P, fontSize: 18, fontWeight: '700' },
    sectionPad: { paddingHorizontal: pad, marginBottom: 12 },
    viewAll: { color: '#FEE76C', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
    hScrollContent: { paddingLeft: pad, paddingRight: 6 },

    // ─── Media Card (Premium Landscape) ───────────────────────
    mediaCard: { 
        width: mediaCardW, 
        height: 140,
        marginRight: 16, 
        borderRadius: 18,
        overflow: 'hidden',
        flexDirection: 'row',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    badgeWrapperWide: { position: 'absolute', top: 10, right: 10, zIndex: 10 },
    
    posterLeft: {
        width: 100,
        height: '100%',
        backgroundColor: '#000',
    },
    poster: { width: '100%', height: '100%' },
    posterPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    posterLetter: { fontSize: 44, fontWeight: '900', opacity: 0.5 },
    
    rightContent: {
        flex: 1,
        paddingTop: 14,
        paddingHorizontal: 14,
        paddingBottom: 12,
        justifyContent: 'space-between',
    },
    mediaTitle: { color: c.TEXT_P, fontSize: 15, fontWeight: '800', textAlign: 'left', marginBottom: 4, paddingRight: 24 },
    mediaStatsWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    mediaStats: { color: c.TEXT_S, fontSize: 12, fontWeight: '600' },
    mediaKnownStats: { color: '#FEE76C', fontSize: 12, fontWeight: '700' },
    
    cefrBarRow: { 
        flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', width: '85%', opacity: 0.85,
    },

    // Filter chips
    filterRow: { flexDirection: 'row', paddingHorizontal: pad, paddingBottom: 12, gap: 8, flexWrap: 'wrap' },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, backgroundColor: c.SURFACE2 },
    filterChipActive: { backgroundColor: c.PURPLE, borderColor: c.PURPLE },
    filterChipText: { color: c.TEXT_S, fontSize: 13, fontWeight: '600' },
    filterChipTextActive: { color: '#ffffff' },

    // ─── List Rows (reference image style) ─────────────────────
    listsContainer: { paddingHorizontal: pad, gap: 14 },
    listRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDark ? '#1a1a1c' : '#ffffff',
      borderRadius: 24, paddingVertical: 18, paddingLeft: 20, paddingRight: 24,
      elevation: isDark ? 0 : 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 10,
    },
    listRowAccent: {
       position: 'absolute', left: 0, top: 22, bottom: 22, width: 4,
       borderTopRightRadius: 4, borderBottomRightRadius: 4,
    },
    listIconCircle: {
      width: 52, height: 52, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 16,
    },
    listRowInfo: { flex: 1, gap: 4 },
    listRowTitle: { color: c.TEXT_P, fontSize: 16, fontWeight: '800' },
    listRowSubtitle: { color: c.TEXT_S, fontSize: 13, fontWeight: '500' },
    listRowStats: { alignItems: 'flex-end', gap: 6 },
    listRowStatNum: { color: c.TEXT_P, fontSize: 24, fontWeight: '800' },
    listRowStatLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },

    emptyCard: { marginHorizontal: pad, height: 110, borderRadius: CARD_R, borderWidth: 1, borderStyle: 'dashed', borderColor: c.BORDER, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.SURFACE },
    emptyIcon: { fontSize: 28 },
    emptyTitle: { color: c.TEXT_P, fontSize: 14, fontWeight: '600', textAlign: 'center' },
    emptySubtitle: { color: c.TEXT_S, fontSize: 12, textAlign: 'center', paddingHorizontal: 24 },

    loader: { marginVertical: 20 },

    // ─── Search Bar ───────────────────────────────────────────
    searchWrapper: {
      marginHorizontal: pad, marginBottom: 16,
      backgroundColor: isDark ? '#1c1c1e' : '#f2f2f7',
      borderRadius: 18, borderWidth: 1,
      borderColor: isDark ? '#ffffff12' : '#e0e0ea',
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10,
    },
    searchInput: {
      flex: 1, paddingVertical: 14,
      color: c.TEXT_P, fontSize: 15,
    },
    searchDropdown: {
      position: 'absolute', top: 58, left: 0, right: 0, zIndex: 99,
      backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
      borderRadius: 18, borderWidth: 1, borderColor: isDark ? '#ffffff12' : '#e0e0ea',
      overflow: 'hidden', marginHorizontal: pad,
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    },
    searchResultRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    searchResultThumb: { width: 42, height: 56, borderRadius: 8, backgroundColor: c.SURFACE, overflow: 'hidden' },
    searchResultThumbImg: { width: '100%', height: '100%' },
    searchResultTitle: { color: c.TEXT_P, fontSize: 14, fontWeight: '700', flex: 1 },
    searchResultType: { color: c.TEXT_S, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
    searchResultKnown: { color: c.PURPLE, fontSize: 12, fontWeight: '700' },
    searchResultDivider: { height: 1, backgroundColor: isDark ? '#ffffff0a' : '#f0f0f5', marginHorizontal: 16 },
    searchEmpty: { paddingVertical: 20, alignItems: 'center' },
    searchEmptyText: { color: c.TEXT_S, fontSize: 13 },

    // ─── Category Cards ───────────────────────────────────────
    categoryRow: { flexDirection: 'row', paddingHorizontal: pad, gap: 10, marginBottom: 24 },
    categoryCard: {
      flex: 1, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 14,
      alignItems: 'center', gap: 8,
      borderWidth: 1, borderColor: isDark ? '#ffffff12' : '#e8e8f0',
      backgroundColor: c.SURFACE,
    },
    categoryCardIcon: {
      width: 46, height: 46, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    categoryCardLabel: { color: c.TEXT_P, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  });
}

// ─── Sub-Components ───────────────────────────────────────────
type Styles = ReturnType<typeof makeStyles>;

function MediaBrowseCard({
  item,
  isDark,
  styles,
  onPress,
}: {
  item: MediaDTO;
  isDark: boolean;
  styles: Styles;
  onPress: () => void;
}) {
  const { t } = useTranslation('discover');
  const { t: tCommon } = useTranslation('common');
  const { darkBg, lightBg, accent } = cardAccent(item.id);
  const title = seriesTitle(item);
  const overallDiff = item.overallDifficulty;

  const cefrTotal = Object.values(item.levelCounts ?? {}).reduce((a, b) => a + b, 0);
  const unknownCount = item.totalWords > 0 && item.knownWordPercentage != null
    ? Math.round(item.totalWords * (1 - item.knownWordPercentage / 100))
    : item.totalWords;
  const knownCount = item.totalWords - unknownCount;

  return (
    <TouchableOpacity
      style={styles.mediaCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Background Poster for Frosted Glass Effect */}
      {item.posterUrl && (
        <Image source={{ uri: item.posterUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      )}
      <BlurView
        intensity={Platform.OS === 'android' ? 100 : (isDark ? 50 : 80)}
        tint={isDark ? "dark" : "light"}
        style={[
          StyleSheet.absoluteFillObject, 
          { backgroundColor: accent + (Platform.OS === 'android' ? (isDark ? 'c0' : 'd0') : '40') }
        ]}
      />

      {overallDiff && (
        <View style={styles.badgeWrapperWide}>
          <OverallDifficultyBadge level={overallDiff} label={tCommon(`media.difficulty_labels.${overallDiff}`)} size="sm" />
        </View>
      )}
      
      <View style={styles.posterLeft}>
        {item.posterUrl ? (
          <Image source={{ uri: item.posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.posterPlaceholder, { backgroundColor: accent + '22' }]}>
            <Text style={[styles.posterLetter, { color: accent }]}>{title.charAt(0)}</Text>
          </View>
        )}
      </View>

      <View style={[styles.rightContent, { justifyContent: 'space-evenly' }]}>
        <Text style={styles.mediaTitle} numberOfLines={2}>{title}</Text>
        <View style={styles.mediaStatsWrap}>
            <Ionicons name="documents" size={12} color="#aaaacc" />
            <Text style={styles.mediaStats}>
                {item.totalWords} {t('words')} · <Text style={styles.mediaKnownStats}>{tCommon('media.known_count', { count: knownCount })}</Text>
            </Text>
        </View>
        
        {/* CEFR dağılım çubuğu */}
        {cefrTotal > 0 && (
        <View style={styles.cefrBarRow}>
            {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((lv) => {
            const count = item.levelCounts?.[lv] ?? 0;
            if (count === 0) return null;
            return (
                <View key={lv} style={{ flex: count / cefrTotal, height: '100%', backgroundColor: CEFR_COLORS[lv] }} />
            );
            })}
        </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Icon colors for list cards ───────────────────────────────
const LIST_ICON_COLORS = [
  '#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#4CAF50', '#FF9800', '#F44336',
];

function getListIconColor(name: string, index: number): string {
  return LIST_ICON_COLORS[index % LIST_ICON_COLORS.length];
}

function KnownWordsCard({ count, stats, loading, styles, onPress }: { count: number; stats?: UserStatistics; loading: boolean; styles: Styles; onPress: () => void }) {
  const { t } = useTranslation('discover');
  const iconColor = '#FF1A5E';
  const learnedToday = stats?.wordsLearnedToday ?? 0;
  
  return (
    <TouchableOpacity style={styles.listRow} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.listRowAccent, { backgroundColor: iconColor }]} />
      <View style={[styles.listIconCircle, { 
        backgroundColor: iconColor,
        shadowColor: iconColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 
      }]}>
        <Ionicons name="book" size={26} color="#fff" />
      </View>
      <View style={styles.listRowInfo}>
        <Text style={styles.listRowTitle}>{t('knownWords')}</Text>
        <Text style={styles.listRowSubtitle}>{t('manageVocabulary')}</Text>
      </View>
      <View style={styles.listRowStats}>
        <Text style={styles.listRowStatNum}>{loading ? '...' : count.toLocaleString()}</Text>
        <Text style={[styles.listRowStatLabel, { color: iconColor }]}>{t('learnedToday', { count: learnedToday })}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ListCard({ item, index, styles, onPress }: { item: WordListDTO; index: number; styles: Styles; onPress: () => void }) {
  const { t } = useTranslation('lists');
  const { t: tDiscover } = useTranslation('discover');
  const isOxford = item.name.toLowerCase().includes('oxford');
  const iconColor = isOxford ? '#FFCA28' : getListIconColor(item.name, index);
  
  const knownWords = item.totalWords - (item.unknownWords || 0);
  const percentage = item.totalWords > 0 ? Math.round((knownWords / item.totalWords) * 100) : 0;

  // Derive a dynamic CEFR level label from level distribution (highest level with >10% words)
  const dynamicLevel = (() => {
    if (!item.levelCounts) return null;
    const levels = ['C2', 'C1', 'B2', 'B1', 'A2', 'A1'];
    const total = Object.values(item.levelCounts).reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    for (const lv of levels) {
      const count = item.levelCounts[lv] ?? 0;
      if (count / total >= 0.1) return lv;
    }
    return null;
  })();

  return (
    <TouchableOpacity style={styles.listRow} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.listRowAccent, { backgroundColor: iconColor }]} />
      <View style={[styles.listIconCircle, { 
        backgroundColor: iconColor,
        shadowColor: iconColor, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8
      }]}>
        <Ionicons name={listIconName(item.name)} size={26} color="#fff" />
      </View>
      <View style={styles.listRowInfo}>
        <Text style={styles.listRowTitle}>{item.name}</Text>
        <Text style={styles.listRowSubtitle}>{isOxford ? tDiscover('coreEnglishProgress') : t('wordCount', { count: item.totalWords })}</Text>
      </View>
      <View style={styles.listRowStats}>
        {isOxford ? (
          <Text style={[styles.listRowStatNum, { color: iconColor }]}>{percentage}%</Text>
        ) : (
          <Text style={styles.listRowStatNum}>{item.totalWords.toLocaleString()}</Text>
        )}
        <Text style={[styles.listRowStatLabel, { color: '#666' }]}>
          {isOxford ? (dynamicLevel ? tDiscover('levelLabel', { level: dynamicLevel }) : tDiscover('oxfordLabel')) : tDiscover('notStarted')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Auto-scroll interval ─────────────────────────────────────
const AUTO_SCROLL_INTERVAL = 5000;

// ─── Main Screen ──────────────────────────────────────────────
export default function DiscoverScreen() {
  const { t } = useTranslation('discover');
  const { t: tCommon } = useTranslation('common');
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { isTablet } = useResponsive();
  const router = useRouter();
  const { width: sw, height: sh } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const c = useMemo<Palette>(() => ({
    BG: theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surfaceSubtle,
    TEXT_P: theme.colors.textPrimary,
    TEXT_S: theme.colors.textSecondary,
    BORDER: theme.colors.borderDefault,
    PURPLE: theme.colors.primary,
  }), [theme]);

  const styles = useMemo(
    () => makeStyles(c, isDark, isTablet, sw, sh, insets.top),
    [c, isDark, isTablet, sw, sh, insets.top],
  );

  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('series');
  const [allMediaModalVisible, setAllMediaModalVisible] = useState(false);
  const [continueModalVisible, setContinueModalVisible] = useState(false);

  // Series Intercept
  const [selectedSeriesImdbId, setSelectedSeriesImdbId] = useState<string | null>(null);
  const [seriesListsModalVisible, setSeriesListsModalVisible] = useState(false);
  const [pendingSeriesItem, setPendingSeriesItem] = useState<MediaDTO | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);

  const { data: allMedia = [], isLoading: mediaLoading, isError: mediaError } = useMedia();
  const { data: allLists = [], isLoading: listsLoading, refetch: refetchLists } = useLists();

  // Refresh lists when screen comes into focus so Oxford % stays up-to-date
  useFocusEffect(useCallback(() => {
    refetchLists();
  }, [refetchLists]));

  const systemLists = useMemo(() => allLists.filter((l) => l.isSystem), [allLists]);
  const { data: userStats, isLoading: knownLoading } = useUserStats();


  const { data: continueMedia = [], isLoading: continueLoading, refetch: refetchContinue } = useContinueLearning(50);

  useFocusEffect(useCallback(() => {
    refetchContinue();
  }, [refetchContinue]));

  // ─── User name & greeting ───────────────────────────────────
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(' ')[0] ?? 'User';
  const avatarInitial = firstName.charAt(0).toUpperCase();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetingMorning');
    if (hour < 18) return t('greetingAfternoon');
    return t('greetingEvening');
  }, [t]);

  // ─── Streak ─────────────────────────────────────────────────
  const currentStreak = useStreakStore((s) => s.currentStreak);

  const browsedMedia = useMemo(() => deduplicateMedia(allMedia, mediaFilter), [allMedia, mediaFilter]);

  const { data: seriesListsData = [], isFetching: checkingSeriesLists } = useListsBySeries(selectedSeriesImdbId);

  const handleNavigate = async (item: MediaDTO) => {
    if (item.type === 'MOVIE') {
      router.push(`/media/${item.id}` as any);
      return;
    }
    const imdbId = item.imdbId;
    if (imdbId) {
      setSelectedSeriesImdbId(imdbId);
      setPendingSeriesItem(item);
      setSeriesListsModalVisible(true);
    } else {
      router.push(`/show/${item.imdbId}` as any);
    }
  };

  const hasContinue = continueMedia.length > 0;
  
  // ─── Hero carousel state ────────────────────────────────────
  const heroItems = useMemo(() => {
    if (continueLoading) return []; // Wait for loading to finish before falling back
    if (hasContinue) return continueMedia.slice(0, 8) as HeroItem[];
    if (!allMedia || allMedia.length === 0) return [];
    
    // Fallback to recommended popular media for new users — deduplicated series with S01E01 navigation
    const seriesMap = new Map<string, { rep: MediaDTO; episodes: MediaDTO[] }>();
    const movies: MediaDTO[] = [];

    for (const m of allMedia) {
      if (!(m.backdropUrl || m.posterUrl)) continue;
      if (m.type === 'MOVIE') {
        movies.push(m);
      } else if (m.imdbId) {
        if (!seriesMap.has(m.imdbId)) {
          seriesMap.set(m.imdbId, { rep: m, episodes: [] });
        }
        const entry = seriesMap.get(m.imdbId)!;
        entry.episodes.push(m);
        if (!entry.rep.backdropUrl && m.backdropUrl) entry.rep = m;
      }
    }

    const seriesItems: HeroItem[] = Array.from(seriesMap.values()).map(({ rep, episodes }) => {
      const s01e01 = episodes.find(e => e.seasonNumber === 1 && e.episodeNumber === 1);
      const maxSeason = Math.max(0, ...episodes.map(e => e.seasonNumber ?? 0));
      return {
        ...rep,
        _s01e01Id: s01e01?.id ?? rep.id,
        _seasonCount: maxSeason,
        _episodeCount: episodes.length,
      };
    });

    return [...movies, ...seriesItems]
      .sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))
      .slice(0, 5);
  }, [continueMedia, allMedia, hasContinue, continueLoading]);
  
  const [heroIndex, setHeroIndex] = useState(0);
  const heroRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // -- Parallax fade effect for header --
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  const onHeroScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / sw);
    setHeroIndex(idx);
  }, [sw]);

  // Auto-scroll
  useEffect(() => {
    if (heroItems.length <= 1) return;
    autoScrollTimer.current = setInterval(() => {
      setHeroIndex((prev) => {
        const next = (prev + 1) % heroItems.length;
        heroRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_INTERVAL);
    return () => {
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, [heroItems.length]);

  // Reset auto-scroll on manual interaction
  const resetAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    if (heroItems.length <= 1) return;
    autoScrollTimer.current = setInterval(() => {
      setHeroIndex((prev) => {
        const next = (prev + 1) % heroItems.length;
        heroRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_INTERVAL);
  }, [heroItems.length]);

  const renderHeroSlide = useCallback(({ item }: { item: HeroItem }) => {
    const title = seriesTitle(item);
    const isSeries = item.type !== 'MOVIE';
    const navTarget = hasContinue
      ? item.generatedListId ? `/list/${item.generatedListId}` : `/media/${item.id}?from=continue`
      : isSeries ? `/media/${item._s01e01Id ?? item.id}` : `/media/${item.id}`;

    const handleHeroPress = () => {
      if (isSeries) {
        handleNavigate(item);
      } else {
        router.push(navTarget as any);
      }
    };

    return (
      <TouchableOpacity
        style={styles.heroSlide}
        activeOpacity={0.95}
        onPress={handleHeroPress}
      >
        {item.posterUrl || item.backdropUrl ? (
          <Image
            source={{ uri: item.backdropUrl || item.posterUrl! }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.heroImage, { backgroundColor: cardAccent(item.id).darkBg }]} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.5, 1]}
          style={styles.heroGradient}
        />
        <View style={styles.heroContent}>
          <Text style={[styles.heroEpisode, !hasContinue && { color: '#FEE76C', letterSpacing: 1.2 }]}>
            {hasContinue ? episodeLabel(item) : '🌟 ÖNERİLEN İÇERİK'}
          </Text>
          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.heroSubtitle}>
            {hasContinue
              ? `${item.totalWords} ${t('words')}${item.knownWordPercentage != null ? ` · %${Math.round(item.knownWordPercentage)} ${t('knownWords').toLowerCase()}` : ''}`
              : isSeries && item._seasonCount
                ? `${item._seasonCount} Sezon · ${item._episodeCount} Bölüm`
                : `${item.totalWords} ${t('words')}`}
          </Text>
          <View style={styles.heroBtnRow}>
            <TouchableOpacity 
              style={styles.heroBtnOuter} 
              activeOpacity={0.8} 
              onPress={handleHeroPress}
            >
                <LinearGradient
                    colors={[
                        "rgba(255,255,255,0.1)",
                        "rgba(255,255,255,0.4)",
                        "rgba(255,255,255,0.4)",
                        "rgba(255,255,255,0.1)",
                    ]}
                    locations={[0, 0.15, 0.85, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.heroBtnInner}
                >
                    <Ionicons name="play" size={18} color="#FEE76C" style={{ marginRight: 8 }} />
                    <Text style={styles.heroBtnPrimaryText} numberOfLines={1}>
                      {hasContinue ? t('continueLearning') : 'Hemen Başla'}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [styles, router, t, hasContinue]);

  const hasHero = heroItems.length > 0 && !continueLoading;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* ─── Hero Carousel ──────────────────────────────────── */}
        {continueLoading ? (
          <View style={[styles.heroEmpty]}>
            <ActivityIndicator color={c.PURPLE} size="large" />
          </View>
        ) : hasHero ? (
          <View style={styles.heroContainer}>
            {/* Floating header over hero */}
            <Animated.View style={[styles.headerOverlay, { opacity: headerOpacity }]}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)} activeOpacity={0.7} style={styles.avatar}>
                  <Text style={styles.avatarText}>{avatarInitial}</Text>
                </TouchableOpacity>
                <Text style={styles.headerGreeting}>{greeting}, {firstName}</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity onPress={() => setShowStreakModal(true)} style={styles.streakBadge} activeOpacity={0.7}>
                  <Text style={styles.streakIcon}>🔥</Text>
                  <Text style={styles.streakCount}>{currentStreak}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <FlatList
              ref={heroRef}
              data={heroItems}
              keyExtractor={(item) => `hero-${item.id}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onHeroScroll}
              onScrollBeginDrag={resetAutoScroll}
              renderItem={renderHeroSlide}
              getItemLayout={(_, index) => ({ length: sw, offset: sw * index, index })}
            />

            {/* Pagination dots */}
            {heroItems.length > 1 && (
              <View style={styles.dotsContainer}>
                {heroItems.map((_, i) => (
                  <View key={i} style={[styles.dot, i === heroIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : continueLoading ? (
          <View style={styles.heroEmpty}>
            <View style={[styles.headerOverlay, { position: 'relative', paddingTop: insets.top + 8 }]}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)} activeOpacity={0.7} style={[styles.avatar, { backgroundColor: c.SURFACE2, borderColor: c.PURPLE + '66' }]}>
                  <Text style={[styles.avatarText, { color: c.TEXT_P }]}>{avatarInitial}</Text>
                </TouchableOpacity>
                <Text style={[styles.headerGreeting, { color: c.TEXT_P, textShadowColor: 'transparent' }]}>{greeting}, {firstName}</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity onPress={() => setShowStreakModal(true)} style={styles.streakBadge} activeOpacity={0.7}>
                  <Text style={styles.streakIcon}>🔥</Text>
                  <Text style={styles.streakCount}>{currentStreak}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ActivityIndicator color="#FEE76C" size="large" />
          </View>
        ) : (
          <View style={styles.heroEmpty}>
            <View style={[styles.headerOverlay, { position: 'relative', paddingTop: insets.top + 8 }]}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)} activeOpacity={0.7} style={[styles.avatar, { backgroundColor: c.SURFACE2, borderColor: c.PURPLE + '66' }]}>
                  <Text style={[styles.avatarText, { color: c.TEXT_P }]}>{avatarInitial}</Text>
                </TouchableOpacity>
                <Text style={[styles.headerGreeting, { color: c.TEXT_P, textShadowColor: 'transparent' }]}>{greeting}, {firstName}</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity onPress={() => setShowStreakModal(true)} style={styles.streakBadge} activeOpacity={0.7}>
                  <Text style={styles.streakIcon}>🔥</Text>
                  <Text style={styles.streakCount}>{currentStreak}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.heroEmptyIcon}>🎬</Text>
            <Text style={styles.heroEmptyTitle}>{t('noContinueTitle')}</Text>
          </View>
        )}


        {/* Spacing after hero — devam eden içerik varsa tümünü gör'ün bıraktığı margin */}
        {hasContinue && <View style={{ marginBottom: 12 }} />}

        {/* Browse Media */}
        <View style={styles.section}>

          {/* Filter chips */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => setAllMediaModalVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.filterChipText}>{t('allContent')}</Text>
            </TouchableOpacity>
            {(['movie', 'series'] as MediaFilter[]).map((f) => {
              const label = f === 'movie' ? t('movies') : t('series');
              const active = mediaFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setMediaFilter(f)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {mediaLoading ? (
            <ActivityIndicator color={c.PURPLE} style={styles.loader} />
          ) : mediaError ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyTitle}>{tCommon('errors.loadFailed')}</Text>
              <Text style={styles.emptySubtitle}>{tCommon('errors.checkServer')}</Text>
            </View>
          ) : browsedMedia.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎬</Text>
              <Text style={styles.emptyTitle}>{t('noContent')}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
              {browsedMedia.map((item) => (
                <MediaBrowseCard
                  key={`${item.id}-${item.imdbId}`}
                  item={item}
                  isDark={isDark}
                  styles={styles}
                  onPress={() =>
                    item.type === 'MOVIE'
                      ? router.push(`/media/${item.id}` as any)
                      : router.push(`/show/${item.imdbId}` as any)
                  }
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Curated Lists */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionPad]}>{t('curatedLists')}</Text>
          {listsLoading ? (
            <ActivityIndicator color={c.PURPLE} style={styles.loader} />
          ) : (
            <View style={styles.listsContainer}>
              <KnownWordsCard count={userStats?.totalKnownWords ?? 0} stats={userStats} loading={knownLoading} styles={styles} onPress={() => router.push('/list/-1' as any)} />
              {systemLists.map((item, index) => (
                <ListCard key={item.id} item={item} index={index + 1} styles={styles} onPress={() => router.push(`/list/${item.id}` as any)} />
              ))}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Continue Learning Modal */}
      <ContinueLearningModal
        visible={continueModalVisible}
        onClose={() => setContinueModalVisible(false)}
        media={continueMedia}
        onNavigate={handleNavigate}
      />

      {/* All Media Modal */}
      <AllMediaModal
        visible={allMediaModalVisible}
        onClose={() => setAllMediaModalVisible(false)}
        allMedia={allMedia}
        loading={mediaLoading}
        onNavigate={handleNavigate}
      />

      {/* Series Lists Intercept Modal */}
      <Modal
        visible={seriesListsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setSeriesListsModalVisible(false); setSelectedSeriesImdbId(null); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: isDark ? '#161822' : '#ffffff',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 24, paddingBottom: 40,
            maxHeight: '80%',
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: c.TEXT_P, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>
                {pendingSeriesItem ? seriesTitle(pendingSeriesItem) : ''}
              </Text>
              <TouchableOpacity onPress={() => { setSeriesListsModalVisible(false); setSelectedSeriesImdbId(null); }}>
                <Ionicons name="close" size={24} color={c.TEXT_S} />
              </TouchableOpacity>
            </View>

            {checkingSeriesLists ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator color={c.PURPLE} size="large" />
              </View>
            ) : seriesListsData.length === 0 ? (
              <View style={{ paddingVertical: 28, alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 36 }}>📭</Text>
                <Text style={{ color: c.TEXT_P, fontSize: 16, fontWeight: '700' }}>Bu dizi için listeniz yok</Text>
                <Text style={{ color: c.TEXT_S, fontSize: 13, textAlign: 'center' }}>Bir bölüme girerek "Bilinmeyen Kelimeler Listesi" oluşturabilirsiniz.</Text>
                <TouchableOpacity
                  onPress={() => {
                    setSeriesListsModalVisible(false);
                    setSelectedSeriesImdbId(null);
                    if (pendingSeriesItem) router.push(`/show/${pendingSeriesItem.imdbId}` as any);
                  }}
                  style={{ marginTop: 8, backgroundColor: c.PURPLE, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Bölümlere Git</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={{ color: c.TEXT_S, fontSize: 13, marginBottom: 16 }}>Bu diziden oluşturduğunuz kelime listelerinden devam edin.</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
                  {seriesListsData.map((list) => (
                    <TouchableOpacity
                      key={list.id}
                      onPress={() => { setSeriesListsModalVisible(false); setSelectedSeriesImdbId(null); router.push(`/list/${list.id}` as any); }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: isDark ? '#1a1a2e' : '#f5f5fa',
                        borderRadius: 16, padding: 16, marginBottom: 10,
                      }}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: c.TEXT_P, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{list.name}</Text>
                        <Text style={{ color: c.TEXT_S, fontSize: 12 }}>{list.totalWords} kelime • {list.unknownWords} öğrenilecek</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={c.PURPLE} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  onPress={() => {
                    setSeriesListsModalVisible(false);
                    setSelectedSeriesImdbId(null);
                    if (pendingSeriesItem) router.push(`/show/${pendingSeriesItem.imdbId}` as any);
                  }}
                  style={{ marginTop: 12, borderRadius: 16, paddingVertical: 13, alignItems: 'center', backgroundColor: isDark ? '#1a1a2e' : '#f0f0f8' }}
                >
                  <Text style={{ color: c.TEXT_S, fontWeight: '700', fontSize: 14 }}>Bölümlere Git</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Streak Info Modal */}
      <Modal visible={showStreakModal} transparent animationType="fade" onRequestClose={() => setShowStreakModal(false)}>
        <TouchableOpacity style={styles.streakModalOverlay} activeOpacity={1} onPress={() => setShowStreakModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.streakModalContent}>
            <View style={styles.streakModalIconBox}>
              <Text style={styles.streakModalIcon}>🔥</Text>
            </View>
            <Text style={styles.streakModalTitle}>{t('streakInfoTitle')}</Text>
            <Text style={styles.streakModalBody}>{t('streakInfoBody')}</Text>
            <TouchableOpacity style={styles.streakModalBtn} onPress={() => setShowStreakModal(false)} activeOpacity={0.8}>
              <Text style={styles.streakModalBtnText}>{t('streakInfoOk')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
