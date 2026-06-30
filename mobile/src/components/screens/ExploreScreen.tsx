import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Image, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useMedia } from '@/src/api/queries/media.queries';
import type { MediaDTO } from '@/src/types/api';
import { Text } from '@/src/components/ui/Text';
import { useExploreTourStore } from '@/src/store/exploreTourStore';
import { useAuth } from '@/src/context/AuthContext';
import { TourOverlay } from '@/src/components/ui/TourOverlay';
import { TOUR_NEON, TOUR_CARD_STYLE, TourTooltipContent } from '@/src/components/ui/TourTooltip';
import Tooltip from 'react-native-walkthrough-tooltip';


type MediaFilter = 'all' | 'MOVIE' | 'EPISODE';

// Tur demosu: sırayla bir dizi, bir film, bir dizi, bir film... şeklinde
// "Anladım"a basılana kadar döngüde aratır.
const EXPLORE_TOUR_DEMO: { filter: Exclude<MediaFilter, 'all'>; word: string }[] = [
  { filter: 'MOVIE',   word: 'Avengers' },
  { filter: 'EPISODE', word: 'Dexter' },
  { filter: 'MOVIE',   word: 'Guardians of the Galaxy' },
  { filter: 'EPISODE', word: 'Sherlock' },
  { filter: 'MOVIE',   word: 'Ice Age' },
  { filter: 'EPISODE', word: 'Ben 10' },
];

type Palette = {
  BG: string; SURFACE: string; SURFACE2: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
};

function makeStyles(c: Palette, pad: number) {
  return StyleSheet.create({
    root:     { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },

    header:      { paddingHorizontal: pad, paddingTop: 16, paddingBottom: 10 },
    headerTitle: { color: c.TEXT_P, fontSize: 26, fontWeight: '900', marginBottom: 14 },

    searchWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.SURFACE, borderRadius: 14,
      borderWidth: 1, borderColor: c.BORDER,
      paddingHorizontal: 14, height: 46,
    },
    searchInput: { flex: 1, color: c.TEXT_P, fontSize: 15, marginLeft: 8 },
    clearBtn:    { padding: 4 },

    filterRow:      { flexDirection: 'row', paddingHorizontal: pad, paddingVertical: 12, gap: 8 },
    chip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: c.SURFACE, borderWidth: 1, borderColor: c.BORDER },
    chipActive:     { backgroundColor: c.PURPLE, borderColor: c.PURPLE },
    chipText:       { color: c.TEXT_S, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#fff', fontSize: 13, fontWeight: '600' },

    sectionLabel: {
      color: c.TEXT_S, fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
      paddingHorizontal: pad, paddingTop: 4, paddingBottom: 10,
    },

    storiesRow: { paddingLeft: pad, paddingBottom: 16 },
    storyItem:  { alignItems: 'center', marginRight: 14, width: 72 },
    storyRing:  {
      width: 68, height: 68, borderRadius: 34,
      borderWidth: 2, borderColor: c.PURPLE,
      padding: 2, marginBottom: 6,
    },
    storyImg:            { width: '100%', height: '100%', borderRadius: 30 },
    storyImgPlaceholder: {
      width: '100%', height: '100%', borderRadius: 30,
      backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center',
    },
    storyLabel: { color: c.TEXT_S, fontSize: 10, textAlign: 'center', maxWidth: 68 },

    gridContent: { paddingHorizontal: pad - 4, paddingBottom: 24 },
    gridCard: {
      flex: 1, margin: 4, borderRadius: 12,
      overflow: 'hidden', backgroundColor: c.SURFACE,
      aspectRatio: 0.67,
    },
    gridImg:             { width: '100%', height: '80%' },
    gridImgPlaceholder:  {
      width: '100%', height: '80%',
      backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center',
    },
    gridInfo:  { padding: 6, flex: 1, justifyContent: 'center' },
    gridTitle: { color: c.TEXT_P, fontSize: 11, fontWeight: '700' },
    gridType:  { color: c.TEXT_S, fontSize: 9, marginTop: 1 },

    typeBadge: {
      position: 'absolute', top: 6, left: 6,
      paddingHorizontal: 6, paddingVertical: 2,
      borderRadius: 6, backgroundColor: '#000000aa',
    },
    typeBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyIcon: { fontSize: 40 },
    emptyText: { color: c.TEXT_S, fontSize: 14, textAlign: 'center' },
  });
}

type Styles = ReturnType<typeof makeStyles>;

// ─── Story bubble ─────────────────────────────────────────────
function StoryItem({ item, onPress, styles }: { item: MediaDTO; onPress: () => void; styles: Styles }) {
  const label = item.type === 'EPISODE' ? item.title.split(' - ')[0] : item.title;
  return (
    <TouchableOpacity style={styles.storyItem} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.storyRing}>
        {item.posterUrl ? (
          <Image source={{ uri: item.posterUrl }} style={styles.storyImg} resizeMode="cover" />
        ) : (
          <View style={styles.storyImgPlaceholder}>
            <Ionicons name={item.type === 'MOVIE' ? 'film-outline' : 'tv-outline'} size={22} color="#888" />
          </View>
        )}
      </View>
      <Text style={styles.storyLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Grid card ────────────────────────────────────────────────
function GridCard({ item, onPress, styles, movieLabel, showLabel }: {
  item: MediaDTO;
  onPress: () => void;
  styles: Styles;
  movieLabel: string;
  showLabel: string;
}) {
  return (
    <TouchableOpacity style={styles.gridCard} onPress={onPress} activeOpacity={0.85}>
      {item.posterUrl ? (
        <Image source={{ uri: item.posterUrl }} style={styles.gridImg} resizeMode="cover" />
      ) : (
        <View style={styles.gridImgPlaceholder}>
          <Ionicons name={item.type === 'MOVIE' ? 'film-outline' : 'tv-outline'} size={28} color="#888" />
        </View>
      )}
      <View style={styles.typeBadge}>
        <Text style={styles.typeBadgeText}>{item.type === 'MOVIE' ? movieLabel : showLabel}</Text>
      </View>
      <View style={styles.gridInfo}>
        <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
        {item.voteAverage != null && item.voteAverage > 0 && (
          <Text style={styles.gridType}>⭐ {item.voteAverage.toFixed(1)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function ExploreScreen() {
  const router = useRouter();
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { isTablet } = useResponsive();
  const { t } = useTranslation('explore');

  const pad = isTablet ? 32 : 16;

  const c = useMemo<Palette>(() => ({
    BG:      theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surfaceSubtle,
    TEXT_P:  theme.colors.textPrimary,
    TEXT_S:  theme.colors.textSecondary,
    BORDER:  theme.colors.borderDefault,
    PURPLE:  theme.colors.primary,
  }), [theme]);

  const styles = useMemo(() => makeStyles(c, pad), [c, pad]);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MediaFilter>('all');
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // ─── Onboarding tour (arama tanıtımı + otomatik film/dizi arama demosu) ──
  const { show: showTour, initializeTour, finishTour } = useExploreTourStore();

  useEffect(() => {
    initializeTour();
  }, [initializeTour]);

  // Tur açıkken: Film sekmesini seçip "Avengers", sonra Dizi sekmesini seçip
  // "Dexter" yazıp aratır; kullanıcı "Anladım"a basana kadar döngüde kalır.
  useEffect(() => {
    if (!showTour) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => timers.push(setTimeout(resolve, ms)));

    const run = async () => {
      let idx = 0;
      while (!cancelled) {
        const step = EXPLORE_TOUR_DEMO[idx % EXPLORE_TOUR_DEMO.length];
        setFilter(step.filter);       // sekmeyi seç (Film / Dizi)
        await wait(700);              // sekme seçimi görünsün
        if (cancelled) break;
        for (let i = 1; i <= step.word.length && !cancelled; i++) {
          setQuery(step.word.slice(0, i));  // harf harf yaz
          await wait(150);
        }
        if (cancelled) break;
        await wait(1800);            // sonuçları göster
        if (cancelled) break;
        setQuery('');                // temizle
        await wait(450);
        idx++;
      }
    };
    run();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      setQuery('');
      setFilter('all');
    };
  }, [showTour]);

  const { data: allMedia = [], isLoading } = useMedia();

  const rootMedia = useMemo(() => {
    const movies = allMedia.filter(m => m.type === 'MOVIE');
    const episodes = allMedia.filter(m => m.type === 'EPISODE');
    
    const uniqueSeriesMap = new Map<string, MediaDTO>();
    episodes.forEach(ep => {
      if (ep.imdbId && !uniqueSeriesMap.has(ep.imdbId)) {
        uniqueSeriesMap.set(ep.imdbId, ep);
      }
    });
    
    return [...movies, ...Array.from(uniqueSeriesMap.values())];
  }, [allMedia]);

  const stories = useMemo(() =>
    [...rootMedia]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15),
  [rootMedia]);

  const isSearching = query.trim().length >= 2;

  const filtered = useMemo(() => {
    let base = rootMedia;
    if (filter !== 'all') base = base.filter(m => m.type === filter);
    if (isSearching) {
      const q = query.trim().toLowerCase();
      base = base.filter(m => m.title.toLowerCase().includes(q));
    }
    return base.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rootMedia, filter, query, isSearching]);

  const navigate = useCallback((item: MediaDTO) => {
    if (item.type === 'EPISODE') {
      router.push(`/show/${item.imdbId}` as any);
    } else {
      router.push(`/media/${item.id}` as any);
    }
  }, [router]);

  const numCols = isTablet ? 4 : 3;

  const movieLabel = t('movie');
  const showLabel = t('show');

  const renderGrid = useCallback(({ item }: { item: MediaDTO }) => (
    <GridCard
      item={item}
      onPress={() => navigate(item)}
      styles={styles}
      movieLabel={movieLabel}
      showLabel={showLabel}
    />
  ), [navigate, styles, movieLabel, showLabel]);

  const filters: { label: string; value: MediaFilter }[] = [
    { label: t('filterAll'),    value: 'all' },
    { label: t('filterMovies'), value: 'MOVIE' },
    { label: t('filterSeries'), value: 'EPISODE' },
  ];

  const sectionTitle = isSearching
    ? t('searchResults')
    : filter === 'all' ? t('allContent') : filter === 'MOVIE' ? t('movies') : t('series');

  const sectionCount = isSearching
    ? t('searchResultCount', { count: filtered.length })
    : t('contentCount', { count: filtered.length });

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.BG} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('title')}</Text>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={c.TEXT_S} />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={c.TEXT_S}
              value={query}
              onChangeText={setQuery}
              editable={!showTour}
              returnKeyType="search"
              autoCorrect={false}
            />
            {!!query && (
              <TouchableOpacity style={styles.clearBtn} onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={c.TEXT_S} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filterRow}>
          {filters.map(f => (
            <TouchableOpacity
              key={f.value}
              style={[styles.chip, filter === f.value && styles.chipActive]}
              onPress={() => setFilter(f.value)}
              activeOpacity={0.8}
            >
              <Text style={filter === f.value ? styles.chipTextActive : styles.chipText}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.PURPLE} size="large" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            numColumns={numCols}
            key={numCols}
            renderItem={renderGrid}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                {!isSearching && stories.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>{t('newlyAdded')}</Text>
                    <FlatList
                      data={stories}
                      keyExtractor={item => `story-${item.id}`}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      renderItem={({ item }) => (
                        <StoryItem item={item} onPress={() => navigate(item)} styles={styles} />
                      )}
                      contentContainerStyle={styles.storiesRow}
                    />
                  </>
                )}
                <Text style={styles.sectionLabel}>
                  {sectionTitle}
                  {'  '}
                  <Text style={{ fontWeight: '400', letterSpacing: 0 }}>{sectionCount}</Text>
                </Text>
              </>
            }
            ListEmptyComponent={
              <View style={[styles.center, { paddingVertical: 40 }]}>
                <Text style={styles.emptyIcon}>🎬</Text>
                <Text style={styles.emptyText}>
                  {isSearching ? t('noResults') : t('noContent')}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* Onboarding turu — ekranın altında serbest açıklama kartı (oksuz).
          Üstte sekme seçimi + otomatik arama net görünsün diye aşağıda. */}
      {showTour && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 96,
            alignItems: 'center',
            paddingHorizontal: 16,
            zIndex: 300,
          }}
        >
          <Tooltip
            isVisible={showTour}
            content={
              <TourTooltipContent
                title="Dizi & film arama 🔎"
                text="Buradan tüm dizi ve filmleri arayabilirsin. Üstteki sekmelerden film mi dizi mi istediğini seç, sonra adını yazıp ara. İzlediğin içeriğin kelimelerini çalışmaya başla!"
                isLast={false}
                onPress={finishTour}
              />
            }
            placement="top"
            onClose={finishTour}
            backgroundColor="rgba(0,0,0,0.65)"
            closeOnBackgroundInteraction={false}
            contentStyle={TOUR_CARD_STYLE}
            arrowStyle={{ borderBottomColor: TOUR_NEON }}
            disableShadow={false}
          >
            <View style={{ width: 1, height: 1 }} />
          </Tooltip>
        </View>
      )}
    </View>
  );
}
