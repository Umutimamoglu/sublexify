import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useSeriesEpisodes, useWatchedMediaIds, useToggleWatched } from '@/src/api/queries/media.queries';
import type { MediaDTO } from '@/src/types/api';

type Palette = {
  BG: string; SURFACE: string; SURFACE2: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
};

function makeStyles(c: Palette, isTablet: boolean) {
  const pad = isTablet ? 32 : 16;
  return StyleSheet.create({
    root:     { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },
    header:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: pad, paddingVertical: 14 },
    backBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center' },
    backText: { color: c.TEXT_P, fontSize: 18 },
    headerTitle: { color: c.TEXT_P, fontSize: 20, fontWeight: '700', flex: 1 },

    // Accordion season row
    seasonRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 16,
      backgroundColor: c.SURFACE,
      borderBottomWidth: 1, borderBottomColor: c.BORDER,
      marginTop: 12,
    },
    seasonRowOpen: { backgroundColor: c.SURFACE2 },
    seasonLabel:   { color: c.PURPLE, fontSize: 14, fontWeight: '700', flex: 1, letterSpacing: 0.3 },
    seasonMeta:    { color: c.TEXT_S, fontSize: 12, marginRight: 10 },
    seasonChevron: { color: c.TEXT_S, fontSize: 16, width: 16, textAlign: 'center' },

    // Episode row
    episodeRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.BORDER, backgroundColor: c.BG },
    epNumberBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    epNumberBoxWatched: { backgroundColor: '#22C55E' },
    epNumber:    { color: c.TEXT_S, fontSize: 13, fontWeight: '700' },
    epInfo:      { flex: 1 },
    epTitle:     { color: c.TEXT_P, fontSize: 15, fontWeight: '600', marginBottom: 2 },
    epSubtitle:  { color: c.TEXT_S, fontSize: 12 },
    epChevron:   { color: c.TEXT_S, fontSize: 18, marginLeft: 8 },

    loader:    { marginTop: 60 },
    emptyCard: { margin: 24, padding: 32, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.BORDER, alignItems: 'center', gap: 8 },
    emptyIcon: { fontSize: 36 },
    emptyText: { color: c.TEXT_S, fontSize: 14, textAlign: 'center' },
    listContent: { paddingBottom: 32 },
  });
}

// ─── Helpers ──────────────────────────────────────────────────
function episodeName(fullTitle: string): string {
  const idx = fullTitle.indexOf(' - ');
  return idx > 0 ? fullTitle.slice(idx + 3) : fullTitle;
}

type SeasonSection = { season: number; episodes: MediaDTO[] };

function groupBySeasons(episodes: MediaDTO[]): SeasonSection[] {
  const map = new Map<number, MediaDTO[]>();
  for (const ep of episodes) {
    const s = ep.seasonNumber ?? 0;
    if (!map.has(s)) map.set(s, []);
    map.get(s)!.push(ep);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([season, eps]) => ({ season, episodes: eps }));
}

// ─── Flat list row types ───────────────────────────────────────
type RowSeason  = { kind: 'season';  season: number; epCount: number; isOpen: boolean };
type RowEpisode = { kind: 'episode'; item: MediaDTO };
type Row = RowSeason | RowEpisode;

// ─── WatchButton ───────────────────────────────────────────────
function WatchButton({ isWatched, onToggle, isDark }: { isWatched: boolean; onToggle: () => void; isDark: boolean }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.25, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    onToggle();
  };

  const unselectedBorder = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
  const unselectedBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View
        style={[
          {
            width: 32, height: 32, borderRadius: 16,
            alignItems: 'center', justifyContent: 'center',
            marginRight: 14,
            backgroundColor: isWatched ? '#22C55E' : unselectedBg,
            borderWidth: isWatched ? 0 : 1.5,
            borderColor: isWatched ? 'transparent' : unselectedBorder,
          },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {isWatched
          ? <Ionicons name="checkmark" size={18} color="#fff" />
          : <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
        }
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function ShowDetailScreen({ imdbId }: { imdbId: string }) {
  const { t } = useTranslation('discover');
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { isTablet } = useResponsive();
  const c = useMemo(() => ({
    BG: theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surfaceSubtle,
    TEXT_P: theme.colors.textPrimary,
    TEXT_S: theme.colors.textSecondary,
    BORDER: theme.colors.borderDefault,
    PURPLE: theme.colors.primary,
  }), [theme]);
  const styles = useMemo(() => makeStyles(c, isTablet), [c, isTablet]);
  const router = useRouter();

  const { data: episodes = [], isLoading, isError } = useSeriesEpisodes(imdbId);
  const { data: watchedIds = [] } = useWatchedMediaIds();
  const { mutate: toggleWatched } = useToggleWatched();

  const sections = useMemo(() => groupBySeasons(episodes), [episodes]);

  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set());
  const initializedRef = useRef(false);

  // Veri yüklenince ilk sezonu bir kez aç
  useEffect(() => {
    if (!initializedRef.current && sections.length > 0) {
      initializedRef.current = true;
      setOpenSeasons(new Set([sections[0].season]));
    }
  }, [sections]);

  const showTitle = useMemo(() => {
    if (!episodes.length) return '';
    const raw = episodes[0].title;
    const idx = raw.indexOf(' - ');
    return idx > 0 ? raw.substring(0, idx) : raw;
  }, [episodes]);

  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    for (const { season, episodes: eps } of sections) {
      const isOpen = openSeasons.has(season);
      result.push({ kind: 'season', season, epCount: eps.length, isOpen });
      if (isOpen) {
        for (const ep of eps) result.push({ kind: 'episode', item: ep });
      }
    }
    return result;
  }, [sections, openSeasons]);

  function toggleSeason(season: number) {
    setOpenSeasons(prev => {
      const next = new Set(prev);
      if (next.has(season)) next.delete(season);
      else next.add(season);
      return next;
    });
  }

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.BG}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={c.TEXT_P} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{showTitle}</Text>
        </View>

        {/* Content */}
        {isLoading ? (
          <ActivityIndicator color={c.PURPLE} style={styles.loader} />
        ) : isError || episodes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📺</Text>
            <Text style={styles.emptyText}>{t('noEpisodes')}</Text>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row, i) =>
              row.kind === 'season' ? `season-${row.season}` : `ep-${row.item.id}-${i}`
            }
            contentContainerStyle={styles.listContent}
            renderItem={({ item: row }) => {
              if (row.kind === 'season') {
                const isOpen = row.isOpen;
                return (
                  <TouchableOpacity
                    style={[styles.seasonRow, isOpen && styles.seasonRowOpen]}
                    activeOpacity={0.75}
                    onPress={() => toggleSeason(row.season)}
                  >
                    <Text style={styles.seasonLabel}>{t('season')} {row.season}</Text>
                    <Text style={styles.seasonMeta}>{t('episodeCount', { count: row.epCount })}</Text>
                    <Ionicons name={isOpen ? "chevron-down" : "chevron-forward"} size={16} color={c.TEXT_S} />
                  </TouchableOpacity>
                );
              }
              const ep = row.item;
              const name = episodeName(ep.title);
              const isWatched = watchedIds.includes(ep.id);
              return (
                <TouchableOpacity
                  style={styles.episodeRow}
                  activeOpacity={0.75}
                  onPress={() => router.push(`/media/${ep.id}` as any)}
                >
                  <WatchButton
                    isWatched={isWatched}
                    onToggle={() => toggleWatched(ep.id)}
                    isDark={isDark}
                  />
                  <View style={styles.epInfo}>
                    <Text style={styles.epTitle} numberOfLines={1}>{name}</Text>
                    <Text style={styles.epSubtitle}>
                      {ep.seasonNumber && ep.episodeNumber
                        ? `S${ep.seasonNumber}:E${ep.episodeNumber}`
                        : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.TEXT_S} />
                </TouchableOpacity>
              );
            }}
          />
        )}

      </SafeAreaView>
    </View>
  );
}

