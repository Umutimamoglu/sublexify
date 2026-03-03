import { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { useSeriesEpisodes } from '@/src/api/queries/media.queries';
import type { MediaDTO } from '@/src/types/api';

// ─── Colour Palettes ──────────────────────────────────────────
const DARK = {
  BG: '#0d0d14',
  SURFACE: '#16161f',
  SURFACE2: '#1e1e2a',
  TEXT_P: '#f0f0f5',
  TEXT_S: '#8888aa',
  BORDER: '#ffffff0f',
  PURPLE: '#7c3aed',
};
const LIGHT = {
  BG: '#f4f4f8',
  SURFACE: '#ffffff',
  SURFACE2: '#ededf5',
  TEXT_P: '#111118',
  TEXT_S: '#888899',
  BORDER: '#e0e0ea',
  PURPLE: '#6d28d9',
};

type Palette = typeof DARK;

function makeStyles(c: Palette) {
  return StyleSheet.create({
    root:        { flex: 1, backgroundColor: c.BG },
    safeArea:    { flex: 1, backgroundColor: c.BG },
    header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
    backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center' },
    backText:    { color: c.TEXT_P, fontSize: 18 },
    headerTitle: { color: c.TEXT_P, fontSize: 20, fontWeight: '700', flex: 1 },

    seasonHeader:     { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
    seasonHeaderText: { color: c.PURPLE, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },

    episodeRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.BORDER },
    epNumberBox:  { width: 36, height: 36, borderRadius: 10, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    epNumber:     { color: c.TEXT_S, fontSize: 13, fontWeight: '700' },
    epInfo:       { flex: 1 },
    epTitle:      { color: c.TEXT_P, fontSize: 15, fontWeight: '600', marginBottom: 2 },
    epSubtitle:   { color: c.TEXT_S, fontSize: 12 },
    epChevron:    { color: c.TEXT_S, fontSize: 18, marginLeft: 8 },

    loader:    { marginTop: 60 },
    emptyCard: { margin: 24, padding: 32, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.BORDER, alignItems: 'center', gap: 8 },
    emptyIcon:  { fontSize: 36 },
    emptyText:  { color: c.TEXT_S, fontSize: 14, textAlign: 'center' },

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

// ─── Flat list data item types ─────────────────────────────────
type RowSeason  = { kind: 'season'; season: number };
type RowEpisode = { kind: 'episode'; item: MediaDTO };
type Row = RowSeason | RowEpisode;

// ─── Main Screen ──────────────────────────────────────────────
export default function ShowDetailScreen({ imdbId }: { imdbId: string }) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const styles = useMemo(() => makeStyles(c), [isDark]);
  const router = useRouter();

  const { data: episodes = [], isLoading, isError } = useSeriesEpisodes(imdbId);

  const showTitle = useMemo(() => {
    if (!episodes.length) return '';
    const raw = episodes[0].title;
    const idx = raw.indexOf(' - ');
    return idx > 0 ? raw.substring(0, idx) : raw;
  }, [episodes]);

  const rows: Row[] = useMemo(() => {
    const sections = groupBySeasons(episodes);
    const result: Row[] = [];
    for (const { season, episodes: eps } of sections) {
      result.push({ kind: 'season', season });
      for (const ep of eps) result.push({ kind: 'episode', item: ep });
    }
    return result;
  }, [episodes]);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? DARK.BG : LIGHT.BG}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{showTitle}</Text>
        </View>

        {/* Content */}
        {isLoading ? (
          <ActivityIndicator color={DARK.PURPLE} style={styles.loader} />
        ) : isError || episodes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📺</Text>
            <Text style={styles.emptyText}>Bölüm bulunamadı</Text>
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
                return (
                  <View style={styles.seasonHeader}>
                    <Text style={styles.seasonHeaderText}>Sezon {row.season}</Text>
                  </View>
                );
              }
              const ep = row.item;
              const name = episodeName(ep.title);
              return (
                <TouchableOpacity
                  style={styles.episodeRow}
                  activeOpacity={0.75}
                  onPress={() => router.push(`/media/${ep.id}` as any)}
                >
                  <View style={styles.epNumberBox}>
                    <Text style={styles.epNumber}>{ep.episodeNumber}</Text>
                  </View>
                  <View style={styles.epInfo}>
                    <Text style={styles.epTitle} numberOfLines={1}>{name}</Text>
                    <Text style={styles.epSubtitle}>
                      {ep.seasonNumber && ep.episodeNumber
                        ? `S${ep.seasonNumber}:E${ep.episodeNumber}`
                        : ''}
                    </Text>
                  </View>
                  <Text style={styles.epChevron}>›</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
