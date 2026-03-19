import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
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
} from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { 
  runOnJS, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { WordPreviewOverlay } from '@/src/components/ui/WordPreviewOverlay';
import AddToListModal from '@/src/components/ui/AddToListModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';
import { FlashCardBack } from '@/src/components/ui/FlashCard';
import { useWordSearch, useFrequentWords } from '@/src/api/queries/words.queries';
import { useKnownWords } from '@/src/api/queries/user.queries';
import { useMarkKnown } from '@/src/api/queries/words.queries';
import type { WordDTO } from '@/src/types/api';

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
    chip: { width: 52, height: 34, borderRadius: 20, marginRight: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    chipText: { fontSize: 12, fontWeight: '700' },

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
    cardStack: { width: Math.min(Dimensions.get('window').width - 32, 500), height: Math.min(Dimensions.get('window').height * 0.72, 600) },
    card: { width: Math.min(Dimensions.get('window').width - 32, 500), height: Math.min(Dimensions.get('window').height * 0.72, 600), borderRadius: 20, position: 'absolute', borderWidth: 1, borderColor: isDark ? '#ffffff18' : c.BORDER, overflow: 'hidden', backfaceVisibility: 'hidden' as const },
    cardFront: { backgroundColor: c.SURFACE, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
    cardBigWord: { color: c.TEXT_P, fontSize: 44, fontWeight: '900', textAlign: 'center' },
    posBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: c.PURPLE + '22' },
    posBadgeText: { color: c.PURPLE, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    cardExample: { color: c.TEXT_S, fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
    flipHint: { color: c.TEXT_S, fontSize: 11, opacity: 0.5, marginTop: 6 },
    cardKnownBtn: { position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    cardTtsBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 8 },

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
  });
}

type Styles = ReturnType<typeof makeStyles>;
type ViewMode = 'list' | 'flashcard';

// ─── Swipeable actions ────────────────────────────────────────
function RightActions({ 
  word, 
  onAddToList,
  styles 
}: { 
  word: WordDTO; 
  onAddToList: () => void;
  styles: Styles;
}) {
  const speak = () => Speech.speak(word.word, { language: 'en-US' });

  return (
    <View style={styles.swipeActions}>
      <TouchableOpacity 
        style={[styles.swipeAction, styles.swipeActionAdd]} 
        onPress={onAddToList}
        activeOpacity={0.8}
      >
        <Ionicons name="list" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.swipeAction, styles.swipeActionTts]} 
        onPress={speak}
        activeOpacity={0.8}
      >
        <Ionicons name="volume-medium" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Word row ──────────────────────────────────────────────────
function WordRow({
  word,
  isKnown,
  onToggle,
  onLongPress,
  onAddToList,
  styles,
  c,
}: {
  word: WordDTO;
  isKnown: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
  onAddToList: () => void;
  styles: Styles;
  c: Palette;
}) {
  const triggerLight = useCallback(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), []);
  const meaning = word.definition?.meanings?.[0]?.definition;
  const diffColor = word.difficulty ? DIFF_COLORS[word.difficulty] : null;

  const tapGesture = Gesture.Tap()
    .maxDistance(8)
    .onEnd(() => { runOnJS(onToggle)(); });

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
        <RightActions word={word} onAddToList={onAddToList} styles={styles} />
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
  const { isTablet } = useResponsive();
  const { width, height } = useWindowDimensions();
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
  const [knownIds, setKnownIds] = useState<Set<number>>(new Set());
  const [previewWord, setPreviewWord] = useState<WordDTO | null>(null);
  const [addModal, setAddModal] = useState<{ wordId: number; wordName: string } | null>(null);
  const knownInitialized = useRef(false);

  // Convert Set to Array for API
  const difficultyList = useMemo(() => Array.from(selectedLevels), [selectedLevels]);

  const { data: knownWordsData = [] } = useKnownWords();
  const { 
    data: frequentWordsData, 
    isLoading: freqLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useFrequentWords(difficultyList, onlyUnknown, 50); 
  
  const { data: searchResults = [], isLoading: searching } = useWordSearch(query, difficultyList, onlyUnknown);
  const { mutate: toggleKnown } = useMarkKnown();
  const qc = useQueryClient();

  const frequentWords = useMemo(() => {
    if (!frequentWordsData) return [];
    return frequentWordsData.pages.flatMap(page => page);
  }, [frequentWordsData]);

  // Bulk mark known mutation
  const { mutate: markMultipleKnown } = useMutation({
    mutationFn: async (wordIds: number[]) => {
      // In a real app we might have a batch endpoint, for now we can do multiple calls or just UI optimistic update
      // But let's assume we want to call the markKnown for each (inefficient but works for now if no batch endpoint)
      for (const id of wordIds) {
        toggleKnown({ wordId: id, isKnown: false });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', 'known-words'] });
    }
  });

  const handleMarkAllKnown = () => {
    const unknownInDisplay = displayWords.filter(w => !knownIds.has(w.id)).map(w => w.id);
    if (unknownInDisplay.length === 0) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markMultipleKnown(unknownInDisplay);
    
    // Optimistic update
    setKnownIds(prev => {
      const next = new Set(prev);
      unknownInDisplay.forEach(id => next.add(id));
      return next;
    });
  };

  // Init knownIds once from server data
  React.useEffect(() => {
    if (!knownInitialized.current && knownWordsData.length > 0) {
      setKnownIds(new Set(knownWordsData.map((w) => w.id)));
      knownInitialized.current = true;
    }
  }, [knownWordsData]);

  const handleToggle = useCallback((wordId: number) => {
    const currentlyKnown = knownIds.has(wordId);
    setKnownIds((prev) => {
      const next = new Set(prev);
      currentlyKnown ? next.delete(wordId) : next.add(wordId);
      return next;
    });
    toggleKnown({ wordId, isKnown: currentlyKnown });
  }, [knownIds, toggleKnown]);

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

  const isSearching = query.trim().length >= 2;
  const displayWords: WordDTO[] = isSearching ? searchResults : frequentWords;
  const isLoading = isSearching ? searching : freqLoading;

  const knownCount = knownWordsData.length;

  const renderList = () => (
    <FlatList
      data={displayWords}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={() => (
        <Text style={styles.sectionLabel}>
          {isSearching
            ? t('searchResultsFor', { query })
            : 'Sık Geçen Kelimeler'}
        </Text>
      )}
      renderItem={({ item }) => (
        <WordRow
          word={item}
          isKnown={knownIds.has(item.id)}
          onToggle={() => handleToggle(item.id)}
          onLongPress={() => setPreviewWord(item)}
          onAddToList={() => setAddModal({ wordId: item.id, wordName: item.word })}
          styles={styles}
          c={c}
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
    if (isLoading && frequentWords.length === 0) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={c.PURPLE} size="large" />
        </View>
      );
    }

    const currentWord = frequentWords[cardIndex];
    if (!currentWord) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Kelime bulunamadı</Text>
        </View>
      );
    }

    return (
      <View style={styles.flashOuter}>
        <View style={styles.cardStack}>
          {isFlippedState ? (
            <TouchableOpacity 
              activeOpacity={1}
              onPress={() => setIsFlippedState(false)}
              style={{ flex: 1 }}
            >
              <FlashCardBack 
                word={currentWord as any} 
                isKnown={knownIds.has(currentWord.id)}
                onToggle={() => handleToggle(currentWord.id)}
                styles={styles as any} 
                c={c} 
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              activeOpacity={1}
              onPress={() => setIsFlippedState(true)}
              style={[styles.card, styles.cardFront]}
            >
              <Text style={styles.cardBigWord}>{currentWord.word}</Text>
              {currentWord.difficulty && (
                <View style={styles.posBadge}>
                  <Text style={styles.posBadgeText}>{currentWord.difficulty}</Text>
                </View>
              )}
              <Text style={styles.flipHint}>Çevirmek için tıkla</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', marginTop: 30, gap: 20 }}>
          <TouchableOpacity 
            onPress={() => {
              setCardIndex(prev => Math.max(0, prev - 1));
              setIsFlippedState(false);
            }}
            disabled={cardIndex === 0}
            style={[styles.backBtn, cardIndex === 0 && { opacity: 0.3 }]}
          >
            <Ionicons name="arrow-back" size={24} color={c.TEXT_P} />
          </TouchableOpacity>
          
          <Text style={styles.progressText}>
            {cardIndex + 1} / {frequentWords.length}
          </Text>

          <TouchableOpacity 
            onPress={() => {
              if (cardIndex === frequentWords.length - 1 && hasNextPage) {
                fetchNextPage();
              }
              setCardIndex(prev => prev + 1);
              setIsFlippedState(false);
            }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-forward" size={24} color={c.TEXT_P} />
          </TouchableOpacity>
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
            <Text style={[styles.headerTitle, { marginBottom: 0 }]}>Kelime Havuzu</Text>
            
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TouchableOpacity 
                style={styles.studyBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="play" size={14} color={c.PURPLE} />
                <Text style={styles.studyBtnText}>Pratik</Text>
              </TouchableOpacity>

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
                  onPress={() => setViewMode('list')}
                >
                  <Ionicons name="list" color={viewMode === 'list' ? '#fff' : c.TEXT_S} size={18} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, viewMode === 'flashcard' && styles.toggleActive]}
                  onPress={() => setViewMode('flashcard')}
                >
                  <Ionicons name="grid" color={viewMode === 'flashcard' ? '#fff' : c.TEXT_S} size={18} />
                </TouchableOpacity>
              </View>
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
              contentContainerStyle={{ paddingHorizontal: isTablet ? 32 : 16, paddingBottom: 12, gap: 8 }}
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
                          Bilinmeyenler
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
              <Text style={styles.statLabel}>Gösterilen</Text>
            </View>
          </View>
        )}

        {viewMode === 'list' || isSearching ? (
          isLoading && displayWords.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={c.PURPLE} size="large" />
            </View>
          ) : renderList()
        ) : renderFlashcards()}

        {/* Batch marking — sadece seviye seçiliyse ve bilinmeyen varsa */}
        {!isSearching && selectedLevels.size > 0 && viewMode === 'list' && displayWords.some(w => !knownIds.has(w.id)) && (
          <TouchableOpacity 
            style={styles.glassBtn} 
            onPress={handleMarkAllKnown}
            activeOpacity={0.8}
          >
            <View style={styles.glassBtnInner}>
              <Ionicons name="checkmark-circle" size={20} color={isDark ? '#rgba(220,200,255,0.95)' : c.PURPLE} />
              <Text style={styles.glassBtnText}>
                Tümünü Biliniyor İşaretle ({displayWords.filter(w => !knownIds.has(w.id)).length})
              </Text>
            </View>
          </TouchableOpacity>
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
      </View>
    </GestureHandlerRootView>
  );
}
