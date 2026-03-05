import { useMemo, useState } from 'react';
import { useResponsive } from '@/src/hooks/useResponsive';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useTheme } from '@/src/context/ThemeContext';
import { DifficultyBadge } from '@/src/components/ui';
import { useMedia, useContinueLearning } from '@/src/api/queries/media.queries';
import { useStandardLists } from '@/src/api/queries/lists.queries';
import { useUserStats } from '@/src/api/queries/user.queries';
import type { MediaDTO, WordListDTO } from '@/src/types/api';

const STREAK_BG = '#7f1d1d';
const STREAK_T  = '#fca5a5';

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

function listIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('oxford') || n.includes('essential')) return '🎓';
  if (n.includes('business') || n.includes('professional')) return '💼';
  if (n.includes('phrasal')) return '🧩';
  if (n.includes('slang')) return '🎬';
  if (n.includes('adjective')) return '🌈';
  if (n.includes('adverb')) return '⚡';
  if (n.includes('verb')) return '⚙️';
  return '📚';
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
  PURPLE: string; STREAK_BG: string; STREAK_T: string;
};

function makeStyles(c: Palette, isDark: boolean, isTablet: boolean) {
  const pad = isTablet ? 32 : 16;
  const mediaCardW = isTablet ? 160 : 112;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },
    scrollContent: { paddingBottom: 8 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: pad, paddingVertical: 12 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.PURPLE + '66' },
    avatarText: { color: c.TEXT_P, fontSize: 15, fontWeight: '700' },
    headerGreeting: { color: c.TEXT_P, fontSize: 17, fontWeight: '700' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center' },
    headerIconText: { color: c.TEXT_S, fontSize: 18 },
    streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.STREAK_BG, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    streakIcon: { fontSize: 13 },
    streakCount: { color: c.STREAK_T, fontSize: 13, fontWeight: '700' },

    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: pad, marginBottom: 12 },
    sectionTitle: { color: c.TEXT_P, fontSize: 18, fontWeight: '700' },
    sectionPad: { paddingHorizontal: pad, marginBottom: 12 },
    viewAll: { color: c.PURPLE, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
    hScrollContent: { paddingLeft: pad, paddingRight: 6 },

    continueCard: { height: 148, borderRadius: CARD_R, overflow: 'hidden', justifyContent: 'flex-end', marginRight: 10, borderWidth: 1, borderColor: '#ffffff15' },
    continueOverlay: { ...StyleSheet.absoluteFillObject },
    continueContent: { padding: 12 },
    continueEpisode: { color: '#aaaacc', fontSize: 11, marginBottom: 3 },
    continueTitle: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

    mediaCard: { width: mediaCardW, borderRadius: CARD_R, overflow: 'hidden', marginRight: 10, borderWidth: 1, borderColor: '#ffffff15' },
    badgeWrapper: { position: 'absolute', top: 8, left: 8, zIndex: 10 },
    poster: { width: '100%', height: 155 },
    posterPlaceholder: { height: 155, alignItems: 'center', justifyContent: 'center' },
    posterLetter: { fontSize: 52, fontWeight: '900', opacity: 0.7 },
    mediaTitle: { color: '#ffffff', fontSize: 12, fontWeight: '600', textAlign: 'center', paddingVertical: 8, paddingHorizontal: 6 },

    // Filter chips
    filterRow: { flexDirection: 'row', paddingHorizontal: pad, paddingBottom: 12, gap: 8 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, backgroundColor: c.SURFACE2 },
    filterChipActive: { backgroundColor: c.PURPLE, borderColor: c.PURPLE },
    filterChipText: { color: c.TEXT_S, fontSize: 13, fontWeight: '600' },
    filterChipTextActive: { color: '#ffffff' },

    listsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: pad, gap: 10 },
    listCard: {
      backgroundColor: c.SURFACE, borderRadius: CARD_R, padding: 18, alignItems: 'center', gap: 5,
      borderWidth: 1, borderColor: c.BORDER, minHeight: 110,
      shadowColor: isDark ? 'transparent' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.07,
      shadowRadius: 6,
      elevation: isDark ? 0 : 2,
    },
    listIcon: { fontSize: 30, marginBottom: 2 },
    listTitle: { color: c.TEXT_P, fontSize: 14, fontWeight: '700', textAlign: 'center' },
    listSubtitle: { color: c.TEXT_S, fontSize: 11, textAlign: 'center' },

    emptyCard: { marginHorizontal: pad, height: 110, borderRadius: CARD_R, borderWidth: 1, borderStyle: 'dashed', borderColor: c.BORDER, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.SURFACE },
    emptyIcon: { fontSize: 28 },
    emptyTitle: { color: c.TEXT_P, fontSize: 14, fontWeight: '600', textAlign: 'center' },
    emptySubtitle: { color: c.TEXT_S, fontSize: 12, textAlign: 'center', paddingHorizontal: 24 },

    knownCountBadge: { backgroundColor: c.PURPLE + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    knownCountText: { color: c.PURPLE, fontSize: 12, fontWeight: '700' },
    wordChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.SURFACE2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: c.BORDER },
    wordChipText: { color: c.TEXT_P, fontSize: 14, fontWeight: '600' },
    wordChipLevel: { color: c.PURPLE, fontSize: 10, fontWeight: '700' },

    loader: { marginVertical: 20 },
  });
}

// ─── Sub-Components ───────────────────────────────────────────
type Styles = ReturnType<typeof makeStyles>;

function ContinueLearningCard({
  item,
  wide,
  isDark,
  styles,
  onPress,
}: {
  item: MediaDTO;
  wide?: boolean;
  isDark: boolean;
  styles: Styles;
  onPress: () => void;
}) {
  const { width } = useWindowDimensions();
  const { darkBg, lightBg, accent } = cardAccent(item.id);
  return (
    <TouchableOpacity
      style={[
        styles.continueCard,
        { backgroundColor: isDark ? darkBg : lightBg },
        wide ? { width: width * 0.57 } : { width: width * 0.36 },
      ]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.continueOverlay, { backgroundColor: accent + '22' }]} />
      <View style={styles.continueContent}>
        <Text style={styles.continueEpisode}>{episodeLabel(item)}</Text>
        <Text style={styles.continueTitle} numberOfLines={1}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );
}

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
  const { darkBg, lightBg, accent } = cardAccent(item.id);
  const title = seriesTitle(item);
  const diff = (item.difficultyLevel as any) ?? '-';
  return (
    <TouchableOpacity
      style={[
        styles.mediaCard,
        { backgroundColor: isDark ? darkBg : lightBg },
      ]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.badgeWrapper}>
        <DifficultyBadge difficulty={diff} size="sm" />
      </View>
      {item.posterUrl ? (
        <Image source={{ uri: item.posterUrl }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={[styles.posterPlaceholder, { backgroundColor: accent + '22' }]}>
          <Text style={[styles.posterLetter, { color: accent }]}>
            {title.charAt(0)}
          </Text>
        </View>
      )}
      <Text style={styles.mediaTitle} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );
}

function KnownWordsCard({ count, loading, styles, onPress }: { count: number; loading: boolean; styles: Styles; onPress: () => void }) {
  const { t } = useTranslation('discover');
  const { t: tLists } = useTranslation('lists');
  const { width } = useWindowDimensions();
  const cardWidth = (width - 42) / 2;
  return (
    <TouchableOpacity style={[styles.listCard, { width: cardWidth }]} activeOpacity={0.85} onPress={onPress}>
      <Text style={styles.listIcon}>📖</Text>
      <Text style={styles.listTitle}>{t('knownWords')}</Text>
      <Text style={styles.listSubtitle}>{loading ? '...' : tLists('wordCount', { count })}</Text>
    </TouchableOpacity>
  );
}

function ListCard({ item, styles, onPress }: { item: WordListDTO; styles: Styles; onPress: () => void }) {
  const { t } = useTranslation('lists');
  const { width } = useWindowDimensions();
  const cardWidth = (width - 42) / 2;
  return (
    <TouchableOpacity style={[styles.listCard, { width: cardWidth }]} activeOpacity={0.85} onPress={onPress}>
      <Text style={styles.listIcon}>{listIcon(item.name)}</Text>
      <Text style={styles.listTitle}>{item.name}</Text>
      <Text style={styles.listSubtitle}>{t('wordCount', { count: item.totalWords })}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function DiscoverScreen() {
  const { t } = useTranslation('discover');
  const { t: tCommon } = useTranslation('common');
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
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
    STREAK_BG,
    STREAK_T,
  }), [theme]);

  const styles = useMemo(
    () => makeStyles(c, isDark, isTablet),
    [c, isDark, isTablet],
  );

  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');

  const { data: continueMedia = [], isLoading: continueLoading } = useContinueLearning(5);
  const { data: allMedia = [], isLoading: mediaLoading, isError: mediaError } = useMedia();
  const { data: standardLists = [], isLoading: listsLoading } = useStandardLists();
  const { data: userStats, isLoading: knownLoading } = useUserStats();

  const browsedMedia = useMemo(
    () => deduplicateMedia(allMedia, mediaFilter),
    [allMedia, mediaFilter],
  );

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.BG}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>S</Text>
            </View>
            <Text style={styles.headerGreeting}>Sublex</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconBtn}>
              <Text style={styles.headerIconText}>⌕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Continue Learning */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('continueLearning')}</Text>
              <TouchableOpacity>
                <Text style={styles.viewAll}>{t('viewAll')}</Text>
              </TouchableOpacity>
            </View>
            {continueLoading ? (
              <ActivityIndicator color={c.PURPLE} style={styles.loader} />
            ) : continueMedia.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🎬</Text>
                <Text style={styles.emptyTitle}>{t('noContinueTitle')}</Text>
                <Text style={styles.emptySubtitle}>{t('noContinueSubtitle')}</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
                {continueMedia.map((item, index) => (
                  <ContinueLearningCard
                    key={item.id}
                    item={item}
                    wide={index === 0}
                    isDark={isDark}
                    styles={styles}
                    onPress={() => router.push(`/media/${item.id}` as any)}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Browse Media */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('browseMedia')}</Text>
            </View>

            {/* Filter chips */}
            <View style={styles.filterRow}>
              {(['all', 'movie', 'series'] as MediaFilter[]).map((f) => {
                const label = f === 'all' ? t('allContent') : f === 'movie' ? t('movies') : t('series');
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
              <View style={styles.listsGrid}>
                <KnownWordsCard count={userStats?.totalKnownWords ?? 0} loading={knownLoading} styles={styles} onPress={() => router.push('/list/-1' as any)} />
                {standardLists.map((item) => (
                  <ListCard key={item.id} item={item} styles={styles} onPress={() => router.push(`/list/${item.id}` as any)} />
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

      </SafeAreaView>
    </View>
  );
}
