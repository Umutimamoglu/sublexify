import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import * as Speech from 'expo-speech';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useMediaDetail, useMediaWords, useGenerateListFromMedia } from '@/src/api/queries/media.queries';
import { useKnownWords } from '@/src/api/queries/user.queries';
import { useMarkKnown } from '@/src/api/queries/words.queries';
import AddToListModal from '@/src/components/ui/AddToListModal';
import type { WordDTO, Difficulty } from '@/src/types/api';

type Palette = {
  BG: string; SURFACE: string; SURFACE2: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
};

const DIFF_COLORS: Record<string, string> = {
  A1: '#22C55E', A2: '#84CC16',
  B1: '#F59E0B', B2: '#F97316',
  C1: '#EF4444', C2: '#9333EA',
};

type Filter = 'all' | Difficulty;
const FILTERS: Filter[] = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// ─── Styles ───────────────────────────────────────────────────
function makeStyles(c: Palette, isDark: boolean, isTablet: boolean) {
  const pad = isTablet ? 32 : 16;
  const posterW = isTablet ? 120 : 90;
  const posterH = isTablet ? 173 : 130;
  return StyleSheet.create({
    root:      { flex: 1, backgroundColor: c.BG },
    safeArea:  { flex: 1, backgroundColor: c.BG },

    // Header bar
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: pad, paddingVertical: 12, gap: 10 },
    backBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center' },
    backText:  { color: c.TEXT_P, fontSize: 18 },
    headerTitle: { flex: 1, color: c.TEXT_P, fontSize: 16, fontWeight: '700' },

    // Hero section
    hero:          { flexDirection: 'row', paddingHorizontal: pad, paddingBottom: 16, gap: 14 },
    posterWrap:    { width: posterW, height: posterH, borderRadius: 10, overflow: 'hidden', backgroundColor: c.SURFACE2 },
    poster:        { width: '100%', height: '100%' },
    posterPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    posterIcon:    { fontSize: 32 },
    heroInfo:      { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
    heroTitle:     { color: c.TEXT_P, fontSize: 15, fontWeight: '800', lineHeight: 20 },
    heroBadgeRow:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 },
    heroBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: c.SURFACE2 },
    heroBadgeText: { color: c.TEXT_S, fontSize: 11, fontWeight: '600' },
    heroOverview:  { color: c.TEXT_S, fontSize: 12, lineHeight: 17, marginTop: 8 },

    // Progress section
    progressWrap:  { paddingHorizontal: pad, paddingBottom: 14 },
    progressLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    progressText:  { color: c.TEXT_S, fontSize: 12 },
    progressPct:   { color: c.PURPLE, fontSize: 12, fontWeight: '700' },
    progressBar:   { height: 6, borderRadius: 3, backgroundColor: c.SURFACE2 },
    progressFill:  { height: 6, borderRadius: 3, backgroundColor: c.PURPLE },

    // CEFR distribution bar
    levelBar:      { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 10 },
    levelSegment:  { height: '100%' },

    // Toggle (unknown only)
    toggleWrap:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
    toggleLabel:  { color: c.TEXT_S, fontSize: 13, flex: 1 },
    toggleBtn:    { width: 44, height: 26, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 3 },
    toggleThumb:  { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },

    // Chips
    chipScroll:   { paddingHorizontal: 16, paddingBottom: 12, flexGrow: 0 },
    chip:         { width: 52, height: 34, borderRadius: 20, marginRight: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    chipText:     { fontSize: 12, fontWeight: '700' },

    // Separator
    separator: { height: 1, backgroundColor: c.BORDER, marginHorizontal: 16 },

    // Word row
    row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    rowInfo:     { flex: 1 },
    rowWord:     { color: c.TEXT_P, fontSize: 15, fontWeight: '700' },
    rowMeaning:  { color: c.TEXT_S, fontSize: 12, marginTop: 3, lineHeight: 17 },
    rowDiff:     { fontSize: 10, fontWeight: '700', marginTop: 2 },
    listBtn:     { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.BORDER, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    listBtnText: { color: c.TEXT_S, fontSize: 16 },
    ttsBtn:      { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.BORDER, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    ttsBtnText:  { fontSize: 14 },
    checkBtn:    { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    checkText:   { fontSize: 13, fontWeight: '900' },

    // Bottom CTA
    ctaBar:    { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: isDark ? '#ffffff0f' : '#e0e0ea' },
    ctaBtn:    { backgroundColor: c.PURPLE, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    ctaBtnDis: { opacity: 0.4 },
    ctaText:   { color: '#fff', fontSize: 14, fontWeight: '700' },

    // Empty / center
    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
    emptyText: { color: c.TEXT_S, fontSize: 14 },
  });
}

type Styles = ReturnType<typeof makeStyles>;

// ─── CEFR bar ─────────────────────────────────────────────────
function CefrBar({
  levelCounts,
  total,
  styles,
}: {
  levelCounts: Record<string, number>;
  total: number;
  styles: Styles;
}) {
  if (total === 0) return null;
  const levels: Difficulty[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  return (
    <View style={styles.levelBar}>
      {levels.map((lv) => {
        const count = levelCounts[lv] ?? 0;
        if (count === 0) return null;
        return (
          <View
            key={lv}
            style={[styles.levelSegment, { flex: count / total, backgroundColor: DIFF_COLORS[lv] }]}
          />
        );
      })}
    </View>
  );
}

// ─── Word row ──────────────────────────────────────────────────
function WordRow({
  word,
  isKnown,
  onToggle,
  onAddToList,
  styles,
  c,
}: {
  word: WordDTO;
  isKnown: boolean;
  onToggle: () => void;
  onAddToList: () => void;
  styles: Styles;
  c: Palette;
}) {
  const meaning = word.definition?.meanings?.[0]?.definition;
  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowWord}>{word.word}</Text>
        {!!meaning && (
          <Text style={styles.rowMeaning} numberOfLines={2}>{meaning}</Text>
        )}
        {!!word.difficulty && (
          <Text style={[styles.rowDiff, { color: DIFF_COLORS[word.difficulty] }]}>
            {word.difficulty}
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.listBtn} onPress={onAddToList} activeOpacity={0.7}>
        <Text style={styles.listBtnText}>+</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.ttsBtn, { borderColor: c.BORDER }]}
        onPress={() => Speech.speak(word.word, { language: 'en-US' })}
        activeOpacity={0.7}
      >
        <Text style={styles.ttsBtnText}>🔊</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.checkBtn,
          {
            borderColor: isKnown ? c.PURPLE : c.TEXT_S,
            backgroundColor: isKnown ? c.PURPLE + '22' : 'transparent',
          },
        ]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.checkText, { color: isKnown ? c.PURPLE : c.TEXT_S }]}>✓</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function MediaDetailScreen({ mediaId }: { mediaId: number }) {
  const router = useRouter();
  const { t } = useTranslation('lists');
  const { t: tCommon } = useTranslation('common');
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { isTablet } = useResponsive();
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

  // ─── State ────────────────────────────────────────────────
  const [onlyUnknown, setOnlyUnknown] = useState(false);
  const [filter, setFilter]           = useState<Filter>('all');
  const [knownIds, setKnownIds]       = useState<Set<number>>(new Set());
  const [addModal, setAddModal]       = useState<{ wordId: number; wordName: string } | null>(null);
  const knownIdsInitialized           = useRef(false);

  // ─── Data ─────────────────────────────────────────────────
  const { data: media, isLoading: mediaLoading }            = useMediaDetail(mediaId);
  const { data: wordData, isLoading: wordsLoading }         = useMediaWords(mediaId, onlyUnknown);
  const { data: knownWordsData = [] }                       = useKnownWords();
  const { mutate: toggleKnown }                             = useMarkKnown();
  const { mutate: generateList, isPending: generating }     = useGenerateListFromMedia();

  // Init knownIds once
  React.useEffect(() => {
    if (!knownIdsInitialized.current && knownWordsData.length > 0) {
      setKnownIds(new Set(knownWordsData.map((w) => w.id)));
      knownIdsInitialized.current = true;
    }
  }, [knownWordsData]);


  // ─── Filtered words ───────────────────────────────────────
  const filteredWords = useMemo<WordDTO[]>(() => {
    if (!wordData?.words) return [];
    if (filter === 'all') return wordData.words;
    return wordData.words.filter((w) => w.difficulty === filter);
  }, [wordData?.words, filter]);

  // ─── Toggle known ─────────────────────────────────────────
  const handleToggle = useCallback((wordId: number) => {
    const currentlyKnown = knownIds.has(wordId);
    setKnownIds((prev) => {
      const next = new Set(prev);
      currentlyKnown ? next.delete(wordId) : next.add(wordId);
      return next;
    });
    toggleKnown({ wordId, isKnown: currentlyKnown, mediaId });
  }, [knownIds, toggleKnown, mediaId]);

  // ─── Generate list ────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    Alert.alert(
      t('generateListTitle'),
      t('generateListMessage'),
      [
        { text: tCommon('actions.cancel'), style: 'cancel' },
        {
          text: tCommon('actions.create'),
          onPress: () => {
            generateList(mediaId, {
              onSuccess: (list) => {
                Alert.alert(tCommon('success'), t('generateListCreated', { name: list.name }), [
                  { text: tCommon('actions.ok'), onPress: () => router.push(`/list/${list.id}` as any) },
                ]);
              },
            });
          },
        },
      ],
    );
  }, [generateList, mediaId, router, t, tCommon]);

  // ─── Computed values ──────────────────────────────────────
  const knownPct    = media?.knownWordPercentage ?? 0;
  const levelCounts = media?.levelCounts ?? {};
  const totalWords  = media?.totalWords ?? 0;
  // Derive from media (fast, from useMediaDetail) so it shows before words load
  const unknownCount = useMemo(() => {
    if (media && media.totalWords > 0 && media.knownWordPercentage != null) {
      return Math.round(media.totalWords * (1 - media.knownWordPercentage / 100));
    }
    return wordData?.unknownWords ?? 0;
  }, [media, wordData?.unknownWords]);

  const isLoading = mediaLoading || wordsLoading;

  // ─── Header component ─────────────────────────────────────
  const ListHeader = useMemo(() => (
    <View>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.posterWrap}>
          {media?.posterUrl ? (
            <Image source={{ uri: media.posterUrl }} style={styles.poster} resizeMode="cover" />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Text style={styles.posterIcon}>
                {media?.type === 'MOVIE' ? '🎬' : '📺'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroTitle} numberOfLines={3}>{media?.title ?? '...'}</Text>
          <View style={styles.heroBadgeRow}>
            {!!media?.type && (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{media.type}</Text>
              </View>
            )}
            {!!media?.difficultyLevel && (
              <View style={[styles.heroBadge, {
                backgroundColor: (DIFF_COLORS[media.difficultyLevel] ?? c.SURFACE2) + '33',
              }]}>
                <Text style={[styles.heroBadgeText, {
                  color: DIFF_COLORS[media.difficultyLevel] ?? c.TEXT_S,
                }]}>
                  {media.difficultyLevel}
                </Text>
              </View>
            )}
            {!!media?.voteAverage && (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>⭐ {media.voteAverage.toFixed(1)}</Text>
              </View>
            )}
          </View>
          {!!media?.overview && (
            <Text style={styles.heroOverview} numberOfLines={4}>{media.overview}</Text>
          )}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressLabel}>
          <Text style={styles.progressText}>{t('wordCount', { count: totalWords })} · {unknownCount} {t('unknownWords')}</Text>
          <Text style={styles.progressPct}>{t('wordStatsPct', { pct: Math.round(knownPct) })}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${knownPct}%` }]} />
        </View>
        {Object.keys(levelCounts).length > 0 && (
          <CefrBar levelCounts={levelCounts} total={totalWords} styles={styles} />
        )}
      </View>

      {/* Unknown only toggle */}
      <View style={styles.toggleWrap}>
        <Text style={styles.toggleLabel}>{t('unknownOnlyToggle')}</Text>
        <TouchableOpacity
          style={[styles.toggleBtn, { backgroundColor: onlyUnknown ? c.PURPLE : c.SURFACE2 }]}
          onPress={() => { setOnlyUnknown((v) => !v); setFilter('all'); }}
          activeOpacity={0.8}
        >
          <View style={[
            styles.toggleThumb,
            { alignSelf: onlyUnknown ? 'flex-end' : 'flex-start' },
          ]} />
        </TouchableOpacity>
      </View>

      {/* CEFR chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
      >
        {FILTERS.map((f) => {
          const active = filter === f;
          const color  = f === 'all' ? '#6B7280' : DIFF_COLORS[f];
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, { borderColor: color, backgroundColor: active ? color + '33' : 'transparent' }]}
              onPress={() => setFilter(f)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, { color: active ? color : c.TEXT_S }]}>
                {f === 'all' ? tCommon('actions.all') : f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  ), [media, onlyUnknown, filter, knownPct, levelCounts, totalWords, unknownCount, isDark, styles, c, t, tCommon]);

  // ─── Render ───────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.BG}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Top bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {media?.title ?? '...'}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.PURPLE} size="large" />
          </View>
        ) : (
          <FlatList
            data={filteredWords}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={ListHeader}
            renderItem={({ item }) => (
              <WordRow
                word={item}
                isKnown={knownIds.has(item.id)}
                onToggle={() => handleToggle(item.id)}
                onAddToList={() => setAddModal({ wordId: item.id, wordName: item.word })}
                styles={styles}
                c={c}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => (
              <View style={styles.center}>
                <Text style={styles.emptyText}>{t('noWordsAtLevel')}</Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        )}

        {/* Bottom CTA */}
        {!isLoading && unknownCount > 0 && (
          <View style={styles.ctaBar}>
            <TouchableOpacity
              style={[styles.ctaBtn, generating && styles.ctaBtnDis]}
              onPress={handleGenerate}
              disabled={generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.ctaText}>
                  {t('createSubListCtaMedia', { count: unknownCount })}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>

      <AddToListModal
        visible={!!addModal}
        wordId={addModal?.wordId ?? 0}
        wordName={addModal?.wordName ?? ''}
        onClose={() => setAddModal(null)}
      />
    </View>
  );
}
