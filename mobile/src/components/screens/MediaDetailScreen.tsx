import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import * as Speech from 'expo-speech';
import { speakText } from '@/src/utils/tts';
import * as Haptics from 'expo-haptics';
import { View, FlatList, ScrollView, TouchableOpacity, Modal, StyleSheet, StatusBar, ActivityIndicator, Image, Alert, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useMediaDetail, useMediaWords, useGenerateListFromMedia, useSeriesEpisodes } from '@/src/api/queries/media.queries';
import { useLocalSearchParams } from 'expo-router';
import { useKnownWords } from '@/src/api/queries/user.queries';
import { useGuidedFlowStore } from '@/src/store/guidedFlowStore';
import { useMarkKnown, useMarkKnownBatch } from '@/src/api/queries/words.queries';
import { Ionicons } from '@expo/vector-icons';
import AddToListModal from '@/src/components/ui/AddToListModal';
import { ShimmerOverlay } from '@/src/components/ui/ShimmerOverlay';
import { BlurView } from 'expo-blur';
import type { WordDTO, Difficulty } from '@/src/types/api';
import { Text } from '@/src/components/ui/Text';


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

const OVERALL_DIFF_BG: Record<string, string>   = { EASY: '#22C55E22', MEDIUM: '#F59E0B22', HARD: '#EF444422' };
const OVERALL_DIFF_TEXT: Record<string, string>  = { EASY: '#22C55E',   MEDIUM: '#F59E0B',   HARD: '#EF4444'   };

// Difficulty labels are now handled by i18n in common.json

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
    chipScroll:   { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, flexGrow: 0 },
    chip:         { width: 52, height: 34, borderRadius: 20, marginRight: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    chipText:     { fontSize: 12, fontWeight: '700' },
    chipBadge:    { position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    chipBadgeText:{ fontSize: 9, fontWeight: '800' },

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
    ctaBar:         { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: isDark ? '#ffffff0f' : '#e0e0ea', flexDirection: 'row' as const, gap: 10 },
    ctaBtn:         { flex: 1, backgroundColor: c.PURPLE, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center' as const, justifyContent: 'center' as const, flexDirection: 'row' as const, gap: 4 },
    ctaBtnOutline:  { backgroundColor: c.PURPLE + '15', borderWidth: 1.5, borderColor: c.PURPLE },
    ctaBtnDis:      { opacity: 0.4 },
    ctaText:        { color: '#fff', fontSize: 12, fontWeight: '700' as const, textAlign: 'center' as const },
    ctaTextOutline: { color: c.PURPLE, fontSize: 12, fontWeight: '700' as const, textAlign: 'center' as const },

    // Mark Known Modal
    mkOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' as const },
    mkSheet:   { backgroundColor: c.SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
    mkTitle:   { color: c.TEXT_P, fontSize: 17, fontWeight: '800' as const },
    mkLevelRow:    { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
    mkLevelBadge:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    mkLevelBadgeText: { fontSize: 13, fontWeight: '700' as const },
    mkWarningBox:  { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, backgroundColor: '#F59E0B18', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F59E0B44' },
    mkWarningText: { flex: 1, color: c.TEXT_S, fontSize: 13, lineHeight: 19 },
    mkBtnRow:      { flexDirection: 'row' as const, gap: 10 },
    mkCancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: c.SURFACE2, alignItems: 'center' as const },
    mkConfirmBtn:  { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: c.PURPLE, alignItems: 'center' as const },
    mkCancelText:  { color: c.TEXT_S, fontWeight: '600' as const, fontSize: 15 },
    mkConfirmText: { color: '#fff', fontWeight: '700' as const, fontSize: 15 },

    // Empty / center
    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
    emptyText: { color: c.TEXT_S, fontSize: 14 },
  });
}

type Styles = ReturnType<typeof makeStyles>;

function MarkKnownModal({
  visible, levels, wordCount, onClose, onConfirm, loading, styles,
}: {
  visible: boolean; levels: string[]; wordCount: number;
  onClose: () => void; onConfirm: () => void; loading: boolean;
  styles: Styles;
}) {
  const { t: tCommon } = useTranslation('common');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.mkOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.mkSheet} activeOpacity={1}>
          <View style={styles.mkLevelRow}>
            {levels.map((lv) => (
              <View key={lv} style={[styles.mkLevelBadge, { backgroundColor: DIFF_COLORS[lv] + '33' }]}>
                <Text style={[styles.mkLevelBadgeText, { color: DIFF_COLORS[lv] }]}>{lv}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.mkTitle}>{tCommon('media.mark_batch_known', { count: wordCount })}</Text>
          <View style={styles.mkWarningBox}>
            <Ionicons name="warning-outline" size={18} color="#F59E0B" />
            <Text style={styles.mkWarningText}>
              {tCommon('media.mark_batch_warning')}
            </Text>
          </View>
          <View style={styles.mkBtnRow}>
            <TouchableOpacity style={styles.mkCancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.mkCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mkConfirmBtn, loading && { opacity: 0.6 }]}
              onPress={onConfirm} disabled={loading} activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.mkConfirmText}>Onayla</Text>
              }
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

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
  isKnown: isKnownProp,
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
  // Local state = instant visual feedback without waiting for parent re-render
  const [isKnown, setIsKnown] = React.useState(isKnownProp);

  // Sync from prop only when it changes externally (e.g. after batch-mark)
  React.useEffect(() => { setIsKnown(isKnownProp); }, [isKnownProp]);

  const handlePress = () => {
    setIsKnown(v => !v); // instant — no parent involved
    onToggle();
  };

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
        onPress={() => speakText(word.word, 'en-US')}
        activeOpacity={0.7}
      >
        <Text style={styles.ttsBtnText}>🔊</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.checkBtn,
          {
            borderColor: isKnown ? c.PURPLE : c.BORDER,
            backgroundColor: isKnown ? c.PURPLE : 'transparent',
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.6}
      >
        <Text style={[styles.checkText, { color: isKnown ? '#fff' : c.TEXT_S }]}>✓</Text>
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
  const [onlyUnknown, setOnlyUnknown]   = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
  const [showMarkModal, setShowMarkModal]   = useState(false);
  const [addModal, setAddModal]             = useState<{ wordId: number; wordName: string } | null>(null);
  const [dismissedNext, setDismissedNext]   = useState(false);

  // ─── Data ─────────────────────────────────────────────────
  const { data: media, isLoading: mediaLoading }            = useMediaDetail(mediaId);
  const { data: wordData, isLoading: wordsLoading }         = useMediaWords(mediaId, onlyUnknown);
  const { data: knownWordsData = [] }                       = useKnownWords();
  // Derive directly from query cache — onMutate keeps it in sync instantly (same as VocabularyScreen)
  const knownIdsSet = useMemo(() => new Set(knownWordsData.map((w) => w.id)), [knownWordsData]);
  const { mutate: toggleKnown }                             = useMarkKnown();
  const { mutate: generateList, isPending: generating }     = useGenerateListFromMedia();
  const { mutate: markKnownBatch, isPending: marking }      = useMarkKnownBatch();

  // ─── Next Episode (Continue Learning) ───────────────────────
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromContinue = from === 'continue';
  const seriesImdbId = media?.imdbId ?? '';
  const { data: seriesEpisodes = [] } = useSeriesEpisodes(
    fromContinue && !!seriesImdbId ? seriesImdbId : '',
  );
  const nextEpisode = useMemo(() => {
    if (!fromContinue || !media || !seriesEpisodes.length) return null;
    const sorted = [...seriesEpisodes].sort((a, b) => {
      const sa = (a.seasonNumber ?? 0) * 1000 + (a.episodeNumber ?? 0);
      const sb = (b.seasonNumber ?? 0) * 1000 + (b.episodeNumber ?? 0);
      return sa - sb;
    });
    const idx = sorted.findIndex(ep => ep.id === media.id);
    return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
  }, [fromContinue, media, seriesEpisodes]);

  // ─── Guided flow ─────────────────────────────────────────────
  const { active: guidedActive, step: guidedStep, finish: finishGuided } = useGuidedFlowStore();
  const isGuidedMedia = guidedActive && guidedStep === 'media';

  // Intro tooltip shown when guided media mode begins.
  // NOTE: gated by a `useRef` (not AsyncStorage), so it RE-SHOWS on every remount
  // (Fast Refresh / re-entering the screen). This is intentional for now —
  // practical while iterating in dev. In production it naturally appears only once
  // because the guided flow itself runs a single time (gated by guidedFlowStore /
  // finishGuided). If we ever decouple the intro from the guided flow, switch this
  // ref to an AsyncStorage flag like '@guided_intro_shown'.
  const [showGuidedIntro, setShowGuidedIntro] = useState(false);
  const guidedIntroShown = useRef(false);

  // Auto-select A1 when guided mode activates
  useEffect(() => {
    if (isGuidedMedia) {
      setSelectedLevels(new Set(['A1']));
      if (!guidedIntroShown.current) {
        guidedIntroShown.current = true;
        setShowGuidedIntro(true);
      }
    }
  }, [isGuidedMedia]);

  // Bouncing arrow ref — effect runs after guidedReady is declared below
  const arrowAnim = useRef(new Animated.Value(0)).current;

  // ─── Filtered words ───────────────────────────────────────
  const filteredWords = useMemo<WordDTO[]>(() => {
    if (!wordData?.words) return [];
    if (selectedLevels.size === 0) return wordData.words;
    return wordData.words.filter((w) => w.difficulty && selectedLevels.has(w.difficulty));
  }, [wordData?.words, selectedLevels]);

  // ─── Mark known batch ─────────────────────────────────────
  const wordsToMark = useMemo(
    () => (wordData?.words ?? []).filter(
      (w) => w.difficulty && selectedLevels.has(w.difficulty) && !knownIdsSet.has(w.id),
    ),
    [wordData?.words, selectedLevels, knownIdsSet],
  );

  const handleMarkKnown = useCallback(() => {
    const ids = wordsToMark.map((w) => w.id);
    if (ids.length === 0) { setShowMarkModal(false); return; }
    markKnownBatch(ids, {
      onSuccess: () => {
        setShowMarkModal(false);
        setSelectedLevels(new Set());
      },
    });
  }, [wordsToMark, markKnownBatch]);

  // ─── Toggle known ─────────────────────────────────────────
  const handleToggle = useCallback((wordId: number) => {
    const currentlyKnown = knownIdsSet.has(wordId);
    Haptics.impactAsync(
      currentlyKnown ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
    );
    toggleKnown({ wordId, isKnown: currentlyKnown, mediaId });
  }, [knownIdsSet, toggleKnown, mediaId]);

  // ─── Generate list ────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (isGuidedMedia) {
      generateList(mediaId, {
        onSuccess: () => {
          finishGuided();
          router.replace('/(tabs)/lists' as any);
        },
      });
      return;
    }
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
  }, [generateList, mediaId, router, t, tCommon, isGuidedMedia, finishGuided]);

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

  // Guided: count A1 words the user has marked as KNOWN (tapped ✓).
  // Counts from ALL words (not the active filter) so it stays stable after we
  // deselect the A1 chip once the user hits 10.
  const guidedKnownCount = useMemo(() => {
    if (!isGuidedMedia) return 0;
    return (wordData?.words ?? []).filter(w => w.difficulty === 'A1' && knownIdsSet.has(w.id)).length;
  }, [isGuidedMedia, wordData?.words, knownIdsSet]);

  // Latch "ready" once the user reaches 10, then drop the A1 filter so the
  // full unknown list shows and the Create-List button becomes the focus.
  const [guidedReady, setGuidedReady] = useState(false);
  useEffect(() => {
    if (isGuidedMedia && !guidedReady && guidedKnownCount >= 10) {
      setGuidedReady(true);
      setSelectedLevels(new Set());
    }
  }, [isGuidedMedia, guidedReady, guidedKnownCount]);

  // Progress 0→1 as user marks words 0→10
  const guidedProgress = guidedReady ? 1 : Math.min(guidedKnownCount / 10, 1);
  // Button color interpolates: #333 (dark gray) → #2BFF88 (neon green)
  const guidedBtnColor = guidedReady ? '#2BFF88' : (() => {
    const r = Math.round(0x33 + (0x2B - 0x33) * guidedProgress);
    const g = Math.round(0x33 + (0xFF - 0x33) * guidedProgress);
    const b = Math.round(0x33 + (0x88 - 0x33) * guidedProgress);
    return `rgb(${r},${g},${b})`;
  })();
  const guidedBtnOpacity = guidedReady ? 1 : 0.4 + 0.6 * guidedProgress;

  useEffect(() => {
    if (!guidedReady) { arrowAnim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 8, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [guidedReady, arrowAnim]);

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
            {!!media?.overallDifficulty && (
              <View style={[styles.heroBadge, { backgroundColor: OVERALL_DIFF_BG[media.overallDifficulty] }]}>
                <Text style={[styles.heroBadgeText, { color: OVERALL_DIFF_TEXT[media.overallDifficulty] }]}>
                  {tCommon(`media.difficulty_labels.${media.overallDifficulty}`)}
                </Text>
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
          onPress={() => { setOnlyUnknown((v) => !v); setSelectedLevels(new Set()); }}
          activeOpacity={0.8}
        >
          <View style={[
            styles.toggleThumb,
            { alignSelf: onlyUnknown ? 'flex-end' : 'flex-start' },
          ]} />
        </TouchableOpacity>
      </View>

      {/* CEFR chips — multi-select */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
      >
        {FILTERS.map((f) => {
          const active = f === 'all' ? selectedLevels.size === 0 : selectedLevels.has(f);
          const color  = f === 'all' ? '#6B7280' : DIFF_COLORS[f];
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, { borderColor: color, backgroundColor: active ? color : 'transparent' }]}
              onPress={() => {
                if (f === 'all') {
                  setSelectedLevels(new Set());
                } else {
                  setSelectedLevels((prev) => {
                    const next = new Set(prev);
                    if (next.has(f)) { next.delete(f); } else { next.add(f); }
                    return next;
                  });
                }
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : c.TEXT_S }]}>
                {f === 'all' ? tCommon('actions.all') : f}
              </Text>
              {f !== 'all' && active && !!levelCounts[f] && (
                <View style={styles.chipBadge}>
                  <Text style={[styles.chipBadgeText, { color }]}>{levelCounts[f]}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  ), [media, onlyUnknown, selectedLevels, knownPct, levelCounts, totalWords, unknownCount, isDark, styles, c, t, tCommon]);

  // ─── Render ───────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.BG}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

        {/* Top bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={c.TEXT_P} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {media?.title ?? '...'}
          </Text>
        </View>

        {/* Guided instruction banner */}
        {isGuidedMedia && !isLoading && !guidedReady && (
          <View style={{
            marginHorizontal: 16, marginTop: 12, marginBottom: 8,
            paddingHorizontal: 18, paddingVertical: 14,
            backgroundColor: '#2BFF8812',
            borderRadius: 18,
            borderWidth: 1.5, borderColor: '#2BFF8850',
            flexDirection: 'row', alignItems: 'center', gap: 14,
            shadowColor: '#2BFF88',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 5,
          }}>
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: '#2BFF8820',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="pencil-outline" size={20} color="#2BFF88" />
            </View>
            <Text style={{ color: '#2BFF88', fontSize: 13, fontWeight: '700', flex: 1, lineHeight: 19 }}>
              Bildiğin kelimelere dokunarak işaretle
            </Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.PURPLE} size="large" />
          </View>
        ) : (
          <>
          <FlatList
            data={filteredWords}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={ListHeader}
            renderItem={({ item }) => (
              <WordRow
                word={item}
                isKnown={knownIdsSet.has(item.id)}
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
            extraData={knownIdsSet}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
          </>
        )}

        {/* Guided: progress bar + counter / bounce arrow */}
        {isGuidedMedia && !isLoading && unknownCount > 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
            {guidedReady ? (
              <View style={{ alignItems: 'center', paddingVertical: 2 }}>
                <Animated.Text style={{ fontSize: 22, transform: [{ translateY: arrowAnim }] }}>
                  👇
                </Animated.Text>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: c.TEXT_S, fontSize: 12, fontWeight: '600' }}>
                    Bildiğin kelimeleri işaretle
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: guidedBtnColor }}>
                    {guidedKnownCount} / 10
                  </Text>
                </View>
                {/* Progress bar */}
                <View style={{ height: 5, borderRadius: 3, backgroundColor: c.SURFACE2, overflow: 'hidden' }}>
                  <View style={{
                    height: '100%',
                    borderRadius: 3,
                    width: `${guidedProgress * 100}%`,
                    backgroundColor: guidedBtnColor,
                    shadowColor: guidedBtnColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: guidedProgress > 0.5 ? 0.8 : 0,
                    shadowRadius: 6,
                  }} />
                </View>
              </>
            )}
          </View>
        )}

        {/* Bottom CTA */}
        {!isLoading && (selectedLevels.size > 0 || unknownCount > 0) && (
          <View style={styles.ctaBar}>
            {selectedLevels.size > 0 && !isGuidedMedia && (
              <TouchableOpacity
                style={[
                  styles.ctaBtn,
                  styles.ctaBtnOutline,
                  isGuidedMedia && !guidedReady && {
                    opacity: guidedBtnOpacity,
                    borderColor: c.BORDER,
                    borderStyle: 'dashed' as const,
                  },
                ]}
                onPress={() => setShowMarkModal(true)}
                disabled={isGuidedMedia && !guidedReady}
                activeOpacity={0.85}
              >
                {isGuidedMedia && !guidedReady
                  ? <Ionicons name="lock-closed" size={14} color={c.TEXT_S} />
                  : <Ionicons name="checkmark-circle-outline" size={15} color={c.PURPLE} />
                }
                <Text style={[styles.ctaTextOutline, isGuidedMedia && !guidedReady && { color: c.TEXT_S }]} numberOfLines={1}>
                  {[...selectedLevels].sort().join(' · ')} → {tCommon('media.known_count', { count: 0 }).replace('0', '').trim()}
                </Text>
              </TouchableOpacity>
            )}
            {unknownCount > 0 && (
              <TouchableOpacity
                style={[
                  styles.ctaBtn,
                  { overflow: 'hidden' },
                  generating && styles.ctaBtnDis,
                  isGuidedMedia && !guidedReady && {
                    opacity: guidedBtnOpacity,
                    backgroundColor: guidedBtnColor,
                    shadowColor: guidedBtnColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: guidedProgress * 0.6,
                    shadowRadius: guidedProgress * 12,
                    elevation: Math.round(guidedProgress * 8),
                  },
                  guidedReady && {
                    backgroundColor: '#2BFF88',
                    shadowColor: '#2BFF88',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.7,
                    shadowRadius: 18,
                    elevation: 12,
                  },
                ]}
                onPress={handleGenerate}
                disabled={generating || (isGuidedMedia && !guidedReady)}
                activeOpacity={0.85}
              >
                {/* Shimmer draws attention to the locked CTA while user marks words */}
                {isGuidedMedia && !guidedReady && <ShimmerOverlay active />}
                {generating ? (
                  <ActivityIndicator color={guidedReady ? '#0B0D12' : '#fff'} size="small" />
                ) : isGuidedMedia && !guidedReady ? (
                  <>
                    <Ionicons name="lock-closed" size={13} color={c.TEXT_S} />
                    <Text style={[styles.ctaText, { color: c.TEXT_S }]} numberOfLines={2}>
                      {t('createSubListCtaMedia', { count: unknownCount })}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.ctaText, guidedReady && { color: '#0B0D12', fontWeight: '900' }]} numberOfLines={2}>
                    {t('createSubListCtaMedia', { count: unknownCount })}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Next Episode Bar — only shown when coming from Continue Learning */}
        {fromContinue && nextEpisode && !dismissedNext && (() => {
          const epName = (() => {
            const idx = nextEpisode.title.indexOf(' - ');
            return idx > 0 ? nextEpisode.title.slice(idx + 3) : nextEpisode.title;
          })();
          return (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 12, paddingVertical: 10,
              borderTopWidth: 1, borderTopColor: isDark ? '#ffffff0f' : '#0000000a',
              backgroundColor: isDark ? '#1a1a1c' : '#fcfcfc',
              gap: 10,
            }}>
              <View style={{ flex: 1, paddingLeft: 4 }}>
                <Text style={{ color: c.TEXT_S, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>
                  Sonraki: S{nextEpisode.seasonNumber} E{nextEpisode.episodeNumber}
                </Text>
                <Text style={{ color: c.TEXT_P, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                  {epName}
                </Text>
              </View>
              
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push(`/media/${nextEpisode.id}?from=continue` as any)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 10, paddingVertical: 6,
                  backgroundColor: c.PURPLE, borderRadius: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Geç</Text>
                <Ionicons name="arrow-forward" size={12} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.5}
                onPress={() => setDismissedNext(true)}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={16} color={c.TEXT_S} />
              </TouchableOpacity>
            </View>
          );
        })()}

      </SafeAreaView>

      <MarkKnownModal
        visible={showMarkModal}
        levels={[...selectedLevels].sort()}
        wordCount={wordsToMark.length}
        onClose={() => setShowMarkModal(false)}
        onConfirm={handleMarkKnown}
        loading={marking}
        styles={styles}
      />

      <AddToListModal
        visible={!!addModal}
        wordId={addModal?.wordId ?? 0}
        wordName={addModal?.wordName ?? ''}
        onClose={() => setAddModal(null)}
      />

      {/* Guided intro tooltip — one-time explainer when entering guided mode */}
      <Modal visible={showGuidedIntro} transparent animationType="fade" onRequestClose={() => setShowGuidedIntro(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{
            width: '100%', maxWidth: 340, borderRadius: 24, overflow: 'hidden',
            borderWidth: 1.5, borderColor: 'rgba(43,255,136,0.85)',
            shadowColor: '#2BFF88', shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6, shadowRadius: 32, elevation: 20,
          }}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={{ padding: 24 }}>
              <View style={{
                width: 52, height: 52, borderRadius: 26, marginBottom: 16,
                backgroundColor: '#2BFF8822', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="checkmark-done-outline" size={28} color="#2BFF88" />
              </View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10, letterSpacing: -0.3 }}>
                Bildiğin kelimeleri işaretle
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 22, marginBottom: 6 }}>
                Bu listedeki kelimelerden <Text style={{ color: '#2BFF88', fontWeight: '800' }}>zaten bildiklerinin</Text> yanındaki ✓ işaretine dokun.
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 22 }}>
                En az <Text style={{ color: '#2BFF88', fontWeight: '800' }}>10 kelime</Text> işaretleyince, geri kalan bilmediğin kelimelerden çalışma listen otomatik hazırlanacak.
              </Text>
              <TouchableOpacity
                onPress={() => setShowGuidedIntro(false)}
                activeOpacity={0.85}
                style={{ marginTop: 22, backgroundColor: '#2BFF88', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
              >
                <Text style={{ color: '#0B0D12', fontSize: 15, fontWeight: '800' }}>Anladım, başlayalım!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
