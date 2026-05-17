import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Dimensions,
  useWindowDimensions,
  Modal,
  Platform,
} from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { 
  runOnJS, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  interpolate,
  Extrapolation,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { QuizTypeModal } from '@/src/components/ui/QuizTypeModal';
import { WordPreviewOverlay } from '@/src/components/ui/WordPreviewOverlay';
import AddToListModal from '@/src/components/ui/AddToListModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';
import { FlashCardBack } from '@/src/components/ui/FlashCard';
import { useWordSearch, useFrequentWords } from '@/src/api/queries/words.queries';
import { useKnownWords } from '@/src/api/queries/user.queries';
import { useMarkKnown } from '@/src/api/queries/words.queries';
import type { WordDTO } from '@/src/types/api';

const stripTr = (text?: string) => text?.replace(/\s*\([^)]+\)\s*$/, '').trim();

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

// ─── Styles ───────────────────────────────────────────────────
function makeStyles(c: Palette, isDark: boolean, sw: number, sh: number, isTablet: boolean) {
  const pad = isTablet ? 32 : 16;
  const cardW = Math.min(sw - 32, 500);
  const cardH = Math.min(sh * 0.72, 600);
  return StyleSheet.create({
    root:     { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },

    // Header
    header:      { paddingHorizontal: pad, paddingTop: 14, paddingBottom: 10 },
    headerTitle: { color: c.TEXT_P, fontSize: 22, fontWeight: '800', marginBottom: 12 },

    // Search bar
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.SURFACE,
      borderRadius: 12, borderWidth: 1, borderColor: c.BORDER,
      paddingHorizontal: 12, height: 44,
    },
    searchIcon:  { fontSize: 16, marginRight: 8, color: c.TEXT_S },
    searchInput: { flex: 1, color: c.TEXT_P, fontSize: 15 },
    clearBtn:    { padding: 4 },
    clearText:   { color: c.TEXT_S, fontSize: 16 },

    // Section label
    sectionLabel: {
      color: c.TEXT_S, fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
      paddingHorizontal: pad, paddingTop: 16, paddingBottom: 8,
    },

    // Word row
    row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: pad, paddingVertical: 12 },
    rowInfo:    { flex: 1 },
    rowWord:    { color: c.TEXT_P, fontSize: 15, fontWeight: '700' },
    rowMeaning: { color: c.TEXT_S, fontSize: 12, marginTop: 3, lineHeight: 17 },
    rowMeta:    { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
    diffBadge:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
    diffText:   { fontSize: 10, fontWeight: '800' },
    freqDot:    { width: 5, height: 5, borderRadius: 3, backgroundColor: c.SURFACE2 },

    // Check button
    checkBtn:  { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    checkText: { fontSize: 13, fontWeight: '900' },

    // Separator
    separator: { height: 1, backgroundColor: c.BORDER, marginHorizontal: 16 },

    // Empty / center
    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyIcon: { fontSize: 40 },
    emptyText: { color: c.TEXT_S, fontSize: 14, textAlign: 'center' },

    // Stats strip
    statsStrip: {
      flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    statCard:   {
      flex: 1, backgroundColor: c.SURFACE, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: c.BORDER, alignItems: 'center', gap: 4,
    },
    statNum:    { color: c.TEXT_P, fontSize: 20, fontWeight: '800' },
    statLabel:  { color: c.TEXT_S, fontSize: 11 },

    // Chips
    chip: { overflow: 'visible' as const, width: 52, height: 34, borderRadius: 20, marginRight: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    chipText: { fontSize: 12, fontWeight: '700' },
    chipBadge: { position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    chipBadgeText: { fontSize: 9, fontWeight: '800', color: c.TEXT_S },

    // View mode toggle
    toggleRow: { flexDirection: 'row', backgroundColor: c.SURFACE2, borderRadius: 10, padding: 3, gap: 2 },
    toggleBtn: { width: 34, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    toggleActive: { backgroundColor: c.PURPLE },
    toggleIcon: { fontSize: 15 },

    // Study button
    studyBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderColor: c.PURPLE, backgroundColor: c.PURPLE + '15' },
    studyBtnText: { color: c.PURPLE, fontSize: 12, fontWeight: '700' as const },

    // Flashcard
    flashOuter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cardStack: { width: Math.min(Dimensions.get('window').width - 64, 400), height: Math.min(Dimensions.get('window').height * 0.58, 480) },
    card: { width: Math.min(Dimensions.get('window').width - 64, 400), height: Math.min(Dimensions.get('window').height * 0.58, 480), borderRadius: 20, position: 'absolute', borderWidth: 1, borderColor: isDark ? '#ffffff18' : c.BORDER, overflow: 'hidden', backfaceVisibility: 'hidden' as const },
    cardFront: { backgroundColor: c.SURFACE, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
    cardBigWord: { color: c.TEXT_P, fontSize: 34, fontWeight: '900', textAlign: 'center' },
    posBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: c.PURPLE + '22' },
    posBadgeText: { color: c.PURPLE, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    cardExample: { color: c.TEXT_S, fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
    flipHint: { color: c.TEXT_S, fontSize: 11, opacity: 0.5, marginTop: 6 },
    cardKnownBtn: { position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    ttsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    cardTtsBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    ttsBtnText: { fontSize: 13 },
    cardSentenceTtsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, borderRadius: 18, borderWidth: 1, paddingHorizontal: 12 },
    sentenceTtsBtnText: { fontSize: 11, fontWeight: '600' },
    cardAddBtn: { position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

    // Back
    cardBack: { backgroundColor: c.SURFACE2 },
    cardBackInner: { flex: 1, padding: 20 },
    cardBackWord: { color: c.TEXT_P, fontSize: 20, fontWeight: '800', marginBottom: 14 },
    meaningBlock: { marginBottom: 12 },
    meaningDef: { color: c.TEXT_P, fontSize: 13, lineHeight: 19, marginTop: 3 },
    meaningEx: { color: c.TEXT_S, fontSize: 12, fontStyle: 'italic', marginTop: 3, lineHeight: 17 },
    verbGrid: { flexDirection: 'row', gap: 6, marginTop: 8 },
    verbCell: { flex: 1, backgroundColor: c.SURFACE, borderRadius: 8, padding: 8, alignItems: 'center' },
    verbLabel: { color: c.TEXT_S, fontSize: 10, fontWeight: '700' },
    verbValue: { color: c.TEXT_P, fontSize: 12, fontWeight: '600', marginTop: 2 },
    phrasalBlock: { marginBottom: 10 },
    phrasalPhrase: { color: c.PURPLE, fontSize: 13, fontWeight: '700' },
    phrasalDef: { color: c.TEXT_P, fontSize: 13, marginTop: 2 },
    phrasalEx: { color: c.TEXT_S, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
    cardFlipBackBtn: { position: 'absolute', top: 14, right: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: c.SURFACE },
    cardFlipBackText: { color: c.TEXT_S, fontSize: 11 },

    // Difficulty badge (back card)
    cardDiffBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
    cardDiffBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

    // Unenriched fallback (back card)
    unenrichedBox: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, paddingTop: 40 },
    unenrichedIcon: { fontSize: 32 },
    unenrichedText: { color: c.TEXT_S, fontSize: 13, textAlign: 'center' as const },

    // Swipe-to-reveal actions
    swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
    swipeAction: { width: 68, alignItems: 'center', justifyContent: 'center' },
    swipeActionInner: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
    swipeActionAdd: { backgroundColor: c.PURPLE },
    swipeActionTts: { backgroundColor: c.SURFACE2 },
    swipeActionDel: { backgroundColor: '#EF4444' },

    // Navigation & Progress
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center' },
    progressText: { color: c.TEXT_S, fontSize: 13, alignSelf: 'center' },

    // Floating Glass Button (Batch Marking)
    glassBtn: {
      position: 'absolute' as const,
      bottom: 24, left: 16, right: 16,
      borderRadius: 20, overflow: 'hidden' as const,
      borderWidth: 1, 
      borderColor: isDark ? 'rgba(200,170,255,0.35)' : 'rgba(139,92,246,0.40)',
      backgroundColor: isDark ? 'rgba(100,60,220,0.22)' : 'rgba(139,92,246,0.14)',
      shadowColor: c.PURPLE, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28, shadowRadius: 20, elevation: 10,
    },
    glassBtnInner: {
      flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
      gap: 8, paddingVertical: 15, paddingHorizontal: 20,
    },
    glassBtnText: { color: isDark ? 'rgba(220,200,255,0.95)' : c.PURPLE, fontSize: 15, fontWeight: '700' },

    // QuizTypeModal styles
    mkOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' as const },
    mkSheet: {
      backgroundColor: c.SURFACE,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, gap: 16,
    },
    mkTitle: { color: c.TEXT_P, fontSize: 17, fontWeight: '800' as const },
    mkWarningText: { color: c.TEXT_S, fontSize: 13, lineHeight: 19 },
    mkBtnRow: { flexDirection: 'row' as const, gap: 10 },
    mkCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: c.SURFACE2, alignItems: 'center' as const },
    mkConfirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: c.PURPLE, alignItems: 'center' as const },
    mkCancelText: { color: c.TEXT_S, fontWeight: '600' as const, fontSize: 15 },
    mkConfirmText: { color: '#fff', fontWeight: '700' as const, fontSize: 15 },
  });
}

type Styles = ReturnType<typeof makeStyles>;
type ViewMode = 'list' | 'flashcard';

// ─── Swipeable actions ────────────────────────────────────────
function RightActions({ 
  word, 
  onAddToList,
  styles,
  isDark,
}: { 
  word: WordDTO; 
  onAddToList: () => void;
  styles: Styles;
  isDark: boolean;
}) {
  const speak = () => Speech.speak(word.word, { language: 'en-US' });

  return (
    <View style={styles.swipeActions}>
      {Platform.OS === 'ios' ? (
        <BlurView tint="dark" intensity={60} style={styles.swipeAction}>
          <TouchableOpacity style={styles.swipeActionInner} onPress={onAddToList} activeOpacity={0.8}>
            <Ionicons name="list" size={20} color={word.definition ? '#a78bfa' : '#fff'} />
          </TouchableOpacity>
        </BlurView>
      ) : (
        <View style={[styles.swipeAction, { backgroundColor: isDark ? 'rgba(40,40,50,0.92)' : 'rgba(230,230,240,0.92)' }]}>
          <TouchableOpacity style={styles.swipeActionInner} onPress={onAddToList} activeOpacity={0.8}>
            <Ionicons name="list" size={20} color={word.definition ? '#a78bfa' : '#fff'} />
          </TouchableOpacity>
        </View>
      )}

      {Platform.OS === 'ios' ? (
        <BlurView tint="dark" intensity={60} style={styles.swipeAction}>
          <TouchableOpacity style={styles.swipeActionInner} onPress={speak} activeOpacity={0.8}>
            <Ionicons name="volume-medium" size={20} color="#fff" />
          </TouchableOpacity>
        </BlurView>
      ) : (
        <View style={[styles.swipeAction, { backgroundColor: isDark ? 'rgba(50,50,60,0.92)' : 'rgba(220,220,230,0.92)' }]}>
          <TouchableOpacity style={styles.swipeActionInner} onPress={speak} activeOpacity={0.8}>
            <Ionicons name="volume-medium" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Word row ──────────────────────────────────────────────────
function WordRow({
  word,
  isKnown: isKnownProp,
  onToggle,
  onLongPress,
  onAddToList,
  styles,
  c,
  isDark,
}: {
  word: WordDTO;
  isKnown: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
  onAddToList: () => void;
  styles: Styles;
  c: Palette;
  isDark: boolean;
}) {
  const triggerLight = useCallback(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), []);
  const meaning = word.definition?.meanings?.[0]?.definition;
  const diffColor = word.difficulty ? DIFF_COLORS[word.difficulty] : null;

  // Local state = instant visual feedback without waiting for parent re-render
  const [isKnown, setIsKnown] = useState(isKnownProp);
  useEffect(() => { setIsKnown(isKnownProp); }, [isKnownProp]);

  const handleTogglePress = () => {
    const next = !isKnown;
    setIsKnown(next); // instant
    Haptics.impactAsync(next ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const tapGesture = Gesture.Tap()
    .maxDistance(8)
    .onEnd(() => { runOnJS(handleTogglePress)(); });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      runOnJS(triggerLight)();
      if (onLongPress) runOnJS(onLongPress)();
    });

  const rowGesture = Gesture.Simultaneous(tapGesture, longPressGesture);

  return (
    <ReanimatedSwipeable
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={() => (
        <RightActions word={word} onAddToList={onAddToList} styles={styles} isDark={isDark} />
      )}
    >
      <GestureDetector gesture={rowGesture}>
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowWord}>{word.word}</Text>
            {!!meaning && (
              <Text style={styles.rowMeaning} numberOfLines={2}>{meaning}</Text>
            )}
            {(!!word.difficulty || !!word.frequency) && (
              <View style={styles.rowMeta}>
                {!!diffColor && (
                  <View style={[styles.diffBadge, { backgroundColor: diffColor + '22' }]}>
                    <Text style={[styles.diffText, { color: diffColor }]}>{word.difficulty}</Text>
                  </View>
                )}
                {!!word.frequency && word.frequency > 1 && (
                  <Text style={{ color: c.TEXT_S, fontSize: 11 }}>×{word.frequency}</Text>
                )}
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.checkBtn,
              {
                borderColor: isKnown ? c.PURPLE : c.BORDER,
                backgroundColor: isKnown ? c.PURPLE : 'transparent',
              },
            ]}
            onPress={handleTogglePress}
            activeOpacity={0.6}
          >
            <Text style={[styles.checkText, { color: isKnown ? '#fff' : c.TEXT_S }]}>✓</Text>
          </TouchableOpacity>
        </View>
      </GestureDetector>
    </ReanimatedSwipeable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
const FILTERS = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export default function VocabularyScreen() {
  const { t } = useTranslation('vocabulary');
  const { t: tCommon } = useTranslation('common');
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const c = useMemo(() => ({
    BG: theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surfaceSubtle,
    TEXT_P: theme.colors.textPrimary,
    TEXT_S: theme.colors.textSecondary,
    BORDER: theme.colors.borderDefault,
    PURPLE: theme.colors.primary,
  }), [theme]);
  const styles = useMemo(() => makeStyles(c, isDark, width, height, isTablet), [c, isDark, width, height, isTablet]);

  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlippedState, setIsFlippedState] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
  const [onlyUnknown, setOnlyUnknown] = useState(false);

  const [showQuizModal, setShowQuizModal] = useState(false);
  const [selectedQuizTypes, setSelectedQuizTypes] = useState<Set<string>>(new Set(['MULTIPLE_CHOICE', 'FILL_IN_THE_BLANKS', 'LISTENING']));
  const [quizDifficulties, setQuizDifficulties] = useState<Set<string>>(new Set());
  const [poolOnlyUnknown, setPoolOnlyUnknown] = useState(false);
  const [quizSize, setQuizSize] = useState(20);

  const handleToggleQuizType = useCallback((type: string) => {
    setSelectedQuizTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleToggleQuizDifficulty = useCallback((diff: string) => {
    setQuizDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(diff)) next.delete(diff);
      else next.add(diff);
      return next;
    });
  }, []);

  const [previewWord, setPreviewWord] = useState<WordDTO | null>(null);
  const [addModal, setAddModal] = useState<{ wordId: number; wordName: string } | null>(null);
  const knownInitialized = useRef(false);

  const { data: knownWordsData = [] } = useKnownWords();
  const knownIdsSet = useMemo(() => new Set(knownWordsData.map(w => w.id)), [knownWordsData]);

  // Convert Set to Array for API
  const difficultyList = useMemo(() => Array.from(selectedLevels), [selectedLevels]);

  const handleStartStudy = useCallback(() => {
    setShowQuizModal(false);
    const typesStr = Array.from(selectedQuizTypes).join(',');
    const diffsStr = Array.from(quizDifficulties).join(',');
    router.push(`/study/havuz?types=${typesStr}&difficulties=${diffsStr}&onlyUnknown=${poolOnlyUnknown}&size=${quizSize}` as any);
  }, [selectedQuizTypes, quizDifficulties, poolOnlyUnknown, quizSize, router]);

  const { 
    data: frequentWordsData, 
    isLoading: freqLoading,
    isFetching: freqFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useFrequentWords(difficultyList, onlyUnknown, 50); 
  
  const { 
    data: searchResultsData = [], 
    isLoading: searchingLoading, 
    isFetching: searchingFetching 
  } = useWordSearch(query, difficultyList, onlyUnknown);
  const { mutate: toggleKnown } = useMarkKnown();
  const qc = useQueryClient();

  const frequentWords = useMemo(() => {
    if (!frequentWordsData) return [];
    const all = frequentWordsData.pages.flatMap(page => page);
    return Array.from(new Map(all.map(w => [w.id, w])).values());
  }, [frequentWordsData]);

  const searchResults = useMemo(() => {
    const deduped = Array.from(new Map(searchResultsData.map(w => [w.id, w])).values());
    const q = query.trim().toLowerCase();
    return deduped.sort((a, b) => {
      const aw = a.word.toLowerCase();
      const bw = b.word.toLowerCase();
      const rank = (w: string) => w === q ? 0 : w.startsWith(q) ? 1 : 2;
      const rankDiff = rank(aw) - rank(bw);
      if (rankDiff !== 0) return rankDiff;
      if (aw.length !== bw.length) return aw.length - bw.length;
      return aw.localeCompare(bw);
    });
  }, [searchResultsData, query]);

  const isSearching = query.trim().length >= 2;
  const displayWords: WordDTO[] = isSearching ? searchResults : frequentWords;

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of frequentWords) {
      if (w.difficulty) counts[w.difficulty] = (counts[w.difficulty] ?? 0) + 1;
    }
    return counts;
  }, [frequentWords]);
  const isQueryFetching = isSearching ? (searchingLoading || searchingFetching) : (freqLoading || freqFetching);

  // ─── Flashcard animations (Reanimated 4 + Gesture Handler) ──
  const cardX = useSharedValue(0);
  const cardY = useSharedValue(0);
  const flipProgress = useSharedValue(0);
  const isFlippedShared = useSharedValue(false);
  const hapticFired = useSharedValue(false);
  const totalSV = useSharedValue(0);
  const indexSV = useSharedValue(0);
  const buttonActiveRef = useRef(false);

  useEffect(() => { totalSV.value = displayWords.length; }, [displayWords.length]);
  useEffect(() => { indexSV.value = cardIndex; }, [cardIndex]);

  // Reset flip when card changes
  useEffect(() => {
    flipProgress.value = 0;
    isFlippedShared.value = false;
    setIsFlippedState(false);
  }, [cardIndex, flipProgress, isFlippedShared]);

  // Bulk mark known mutation
  const { mutate: markMultipleKnown } = useMutation({
    mutationFn: async (wordIds: number[]) => {
      for (const id of wordIds) {
        toggleKnown({ wordId: id, isKnown: false });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', 'known-words'] });
    }
  });

  const handleToggle = useCallback((wordId: number) => {
    const currentlyKnown = knownIdsSet.has(wordId);
    toggleKnown({ wordId, isKnown: currentlyKnown });
  }, [knownIdsSet, toggleKnown]);

  const toggleLevel = (lv: string) => {
    if (lv === 'all') {
      setSelectedLevels(new Set());
      return;
    }
    const next = new Set(selectedLevels);
    if (next.has(lv)) next.delete(lv);
    else next.add(lv);
    setSelectedLevels(next);
  };

  const triggerLight = useCallback(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), []);
  const triggerMedium = useCallback(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), []);

  const doFlip = useCallback(() => {
    if (buttonActiveRef.current) return;
    const next = !isFlippedShared.value;
    isFlippedShared.value = next;
    setIsFlippedState(next);
    flipProgress.value = withTiming(next ? 1 : 0, { duration: 380, easing: Easing.inOut(Easing.ease) });
  }, [flipProgress, isFlippedShared]);

  // Card container: tilt + scale while dragging
  const cardContainerStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      cardX.value, [-width * 0.5, 0, width * 0.5], [-12, 0, 12], Extrapolation.CLAMP,
    );
    const scale = interpolate(
      Math.abs(cardX.value), [0, width * 0.5], [1, 0.95], Extrapolation.CLAMP,
    );
    return { transform: [{ translateX: cardX.value }, { translateY: cardY.value }, { rotate: `${rotate}deg` }, { scale }] };
  });

  // 3D flip faces
  const frontAnimStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` }],
    backfaceVisibility: 'hidden' as const,
  }));
  const backAnimStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` }],
    backfaceVisibility: 'hidden' as const,
  }));

  // Gestures
  const panGesture = Gesture.Pan()
    .minDistance(5)
    .activeOffsetX([-8, 8])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      cardX.value = e.translationX;
      cardY.value = e.translationY * 0.15;
      if (!hapticFired.value && Math.abs(e.translationX) > 80) {
        hapticFired.value = true;
        runOnJS(triggerLight)();
      }
      if (hapticFired.value && Math.abs(e.translationX) <= 80) {
        hapticFired.value = false;
      }
    })
    .onEnd((e) => {
      hapticFired.value = false;
      const committed = Math.abs(e.translationX) > 80 || Math.abs(e.velocityX) > 500;
      if (committed) {
        const goLeft = e.velocityX < -200 ? true : e.velocityX > 200 ? false : e.translationX < 0;
        const total = totalSV.value;
        const cur = indexSV.value;
        const nextIdx = goLeft ? (cur < total - 1 ? cur + 1 : -1) : (cur > 0 ? cur - 1 : -1);
        runOnJS(triggerMedium)();
        if (nextIdx >= 0) {
          const exitX = goLeft ? -width * 1.5 : width * 1.5;
          const enterX = goLeft ? width * 1.5 : -width * 1.5;
          cardX.value = withTiming(exitX, { duration: 200, easing: Easing.in(Easing.ease) }, () => {
            flipProgress.value = 0;
            isFlippedShared.value = false;
            runOnJS(setCardIndex)(nextIdx);
            cardX.value = enterX;
            cardY.value = 0;
            cardX.value = withSpring(0, { damping: 20, stiffness: 220, mass: 0.85 });
          });
        } else {
          cardX.value = withSpring(0, { damping: 4, stiffness: 180 });
          cardY.value = withSpring(0, { damping: 20, stiffness: 200 });
        }
      } else {
        cardX.value = withSpring(0, { damping: 20, stiffness: 200 });
        cardY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const tapGesture = Gesture.Tap()
    .maxDistance(8)
    .maxDuration(350)
    .onEnd(() => { runOnJS(doFlip)(); });

  const cardGesture = Gesture.Exclusive(panGesture, tapGesture);

  const knownCount = knownWordsData.length;

  const renderList = () => (
      <FlatList
        data={displayWords}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={() => (
          <Text style={styles.sectionLabel}>
            {isSearching
              ? t('searchResultsFor', { query })
              : t('frequentWords')}
          </Text>
        )}
      renderItem={({ item }) => (
        <WordRow
          word={item}
          isKnown={knownIdsSet.has(item.id)}
          onToggle={() => handleToggle(item.id)}
          onLongPress={() => setPreviewWord(item)}
          onAddToList={() => setAddModal({ wordId: item.id, wordName: item.word })}
          styles={styles}
          c={c}
          isDark={isDark}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      showsVerticalScrollIndicator={false}
      onEndReached={() => {
        if (!isSearching && hasNextPage) {
          fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator color={c.PURPLE} size="small" />
          </View>
        ) : null
      }
    />
  );

  const renderFlashcards = () => {
    const currentWord = displayWords[cardIndex];
    if (!currentWord) {
      if (isQueryFetching && displayWords.length === 0) {
        return (
          <View style={styles.center}>
            <ActivityIndicator color={c.PURPLE} size="large" />
          </View>
        );
      }
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('noWordsFound')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.flashOuter}>
        <GestureDetector gesture={cardGesture}>
          <Reanimated.View style={[styles.cardStack, cardContainerStyle]}>
            <Reanimated.View style={[styles.card, styles.cardFront, frontAnimStyle]} pointerEvents={isFlippedState ? 'none' : 'auto'}>
              <Text style={styles.cardBigWord}>{currentWord.word}</Text>
              
              <View style={styles.ttsRow}>
                <TouchableOpacity
                  style={[styles.cardTtsBtn, { borderColor: c.BORDER }]}
                  onPress={() => Speech.speak(currentWord.word, { language: 'en-US' })}
                  onPressIn={() => { buttonActiveRef.current = true; }}
                  onPressOut={() => { buttonActiveRef.current = false; }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ttsBtnText}>🔊</Text>
                </TouchableOpacity>
                {!!stripTr(currentWord.definition?.meanings?.[0]?.example) && (
                  <TouchableOpacity
                    style={[styles.cardSentenceTtsBtn, { borderColor: c.BORDER }]}
                    onPress={() => Speech.speak(stripTr(currentWord.definition!.meanings[0].example)!, { language: 'en-US' })}
                    onPressIn={() => { buttonActiveRef.current = true; }}
                    onPressOut={() => { buttonActiveRef.current = false; }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.ttsBtnText}>💬</Text>
                    <Text style={[styles.sentenceTtsBtnText, { color: c.TEXT_S }]}>{tCommon('sentenceTts')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {currentWord.difficulty && (
                <View style={styles.posBadge}>
                  <Text style={styles.posBadgeText}>{currentWord.difficulty}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.cardAddBtn, { borderColor: c.BORDER }]}
                onPress={() => setAddModal({ wordId: currentWord.id, wordName: currentWord.word })}
                onPressIn={() => { buttonActiveRef.current = true; }}
                onPressOut={() => { buttonActiveRef.current = false; }}
                activeOpacity={0.7}
              >
                <Ionicons name="list" size={18} color={c.TEXT_S} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cardKnownBtn, {
                  borderColor: knownIdsSet.has(currentWord.id) ? c.PURPLE : c.TEXT_S,
                  backgroundColor: knownIdsSet.has(currentWord.id) ? c.PURPLE + '22' : 'transparent',
                }]}
                onPress={() => handleToggle(currentWord.id)}
                onPressIn={() => { buttonActiveRef.current = true; }}
                onPressOut={() => { buttonActiveRef.current = false; }}
                activeOpacity={0.7}
              >
                <Text style={[styles.checkText, { color: knownIdsSet.has(currentWord.id) ? c.PURPLE : c.TEXT_S }]}>✓</Text>
              </TouchableOpacity>
              
              <Text style={styles.flipHint}>Çevirmek için tıkla</Text>
            </Reanimated.View>

            <FlashCardBack
              word={currentWord as any}
              isKnown={knownIdsSet.has(currentWord.id)}
              onToggle={() => handleToggle(currentWord.id)}
              onButtonPressIn={() => { buttonActiveRef.current = true; }}
              onButtonPressOut={() => { buttonActiveRef.current = false; }}
              styles={styles as any}
              c={c}
              animStyle={backAnimStyle}
              pointerEvents={isFlippedState ? 'auto' : 'none'}
              scrollEnabled={false}
            />
          </Reanimated.View>
        </GestureDetector>

        <View style={{ marginTop: 30 }}>
          <Text style={styles.progressText}>
            {cardIndex + 1} / {displayWords.length}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.root}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={c.BG}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text style={[styles.headerTitle, { marginBottom: 0 }]}>{t('title')}</Text>
            
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => setViewMode(viewMode === 'list' ? 'flashcard' : 'list')}
                activeOpacity={0.75}
              >
                <Ionicons 
                  name={viewMode === 'list' ? 'albums-outline' : 'list-outline'} 
                  size={18} 
                  color={c.TEXT_S} 
                />
              </TouchableOpacity>
            </View>
          </View>

        {/* Search bar */}
        <View style={[styles.header, { paddingTop: 0 }]}>
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={c.TEXT_S}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {!!query && (
              <TouchableOpacity style={styles.clearBtn} onPress={() => setQuery('')}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters — sadece arama yokken */}
        {!isSearching && (
          <View>
            <FlatList
              horizontal
              data={['unknown', ...FILTERS]}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: isTablet ? 32 : 16, paddingTop: 8, paddingBottom: 12, gap: 8 }}
              renderItem={({ item: lv }) => {
                if (lv === 'unknown') {
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => setOnlyUnknown(!onlyUnknown)}
                        activeOpacity={0.7}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: onlyUnknown ? c.PURPLE : 'transparent',
                            borderColor: onlyUnknown ? c.PURPLE : c.BORDER,
                            width: 'auto',
                            paddingHorizontal: 12
                          }
                        ]}
                      >
                        <Text style={[styles.chipText, { color: onlyUnknown ? '#fff' : c.TEXT_S }]}>
                          {t('filterUnknown')}
                        </Text>
                      </TouchableOpacity>
                      <View style={{ width: 1, height: 20, backgroundColor: c.BORDER, alignSelf: 'center', marginHorizontal: 4 }} />
                    </View>
                  );
                }
                const active = lv === 'all' ? selectedLevels.size === 0 : selectedLevels.has(lv as string);
                const color = DIFF_COLORS[lv as string] || c.TEXT_S;
                return (
                  <TouchableOpacity
                    onPress={() => toggleLevel(lv as string)}
                    activeOpacity={0.7}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? color : 'transparent',
                        borderColor: active ? color : c.BORDER,
                      }
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? '#fff' : c.TEXT_S }]}>
                      {lv === 'all' ? tCommon('actions.all') : lv}
                    </Text>
                    {lv !== 'all' && active && !!levelCounts[lv as string] && (
                      <View style={[styles.chipBadge, { backgroundColor: '#fff' }]}>
                        <Text style={[styles.chipBadgeText, { color }]}>{levelCounts[lv as string]}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(item) => item}
            />
          </View>
        )}

        {/* Stats strip — sadece arama yokken */}
        {!isSearching && (
          <View style={styles.statsStrip}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{knownCount.toLocaleString()}</Text>
              <Text style={styles.statLabel}>{t('statsKnown')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{displayWords.length}</Text>
              <Text style={styles.statLabel}>{t('statsDisplayed')}</Text>
            </View>
          </View>
        )}
        {/* Main Content */}
        {isQueryFetching && !isFetchingNextPage ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.PURPLE} size="large" />
          </View>
        ) : (
          (viewMode === 'list' || isSearching) ? renderList() : renderFlashcards()
        )}

      </SafeAreaView>

      <WordPreviewOverlay 
        word={previewWord as any}
        visible={!!previewWord}
        onClose={() => setPreviewWord(null)}
        isDark={isDark}
        c={c}
      />

      <AddToListModal
        visible={!!addModal}
        wordId={addModal?.wordId || 0}
        wordName={addModal?.wordName || ''}
        onClose={() => setAddModal(null)}
      />

      <TouchableOpacity
        onPress={() => setShowQuizModal(true)}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          // Tab bar bottom offset (24 iOS / android varies) + tab bar height (64/68) + 12px gap
          bottom: Platform.OS === 'android'
            ? Math.max(insets.bottom + 12, 24) + 68 + 12
            : 24 + 64 + 12,
          right: 20,
          zIndex: 100,
          shadowColor: c.PURPLE,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        <LinearGradient
          colors={[c.PURPLE, '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#ffffff20',
          }}
        >
          <Ionicons name="school" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <QuizTypeModal
        visible={showQuizModal}
        selectedTypes={selectedQuizTypes}
        onToggleType={handleToggleQuizType}
        selectedDifficulties={quizDifficulties}
        onToggleDifficulty={handleToggleQuizDifficulty}
        onlyUnknown={poolOnlyUnknown}
        onToggleOnlyUnknown={setPoolOnlyUnknown}
        quizSize={quizSize}
        onSizeChange={setQuizSize}
        onClose={() => setShowQuizModal(false)}
        onConfirm={handleStartStudy}
        styles={styles}
        c={c}
      />
      </View>
    </GestureHandlerRootView>
  );
}
