import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { useListDetail, useRemoveWordFromList, useCreateSubListFromUnknown } from '@/src/api/queries/lists.queries';
import { useKnownWords } from '@/src/api/queries/user.queries';
import { useMarkKnown } from '@/src/api/queries/words.queries';
import type { ListWord, Difficulty } from '@/src/types/api';

// ─── Palettes (same as DiscoverScreen) ───────────────────────
const DARK = {
  BG: '#0d0d14', SURFACE: '#16161f', SURFACE2: '#1e1e2a',
  TEXT_P: '#f0f0f5', TEXT_S: '#8888aa', BORDER: '#ffffff0f',
  PURPLE: '#7c3aed',
};
const LIGHT = {
  BG: '#f4f4f8', SURFACE: '#ffffff', SURFACE2: '#ededf5',
  TEXT_P: '#111118', TEXT_S: '#888899', BORDER: '#e0e0ea',
  PURPLE: '#6d28d9',
};
const DIFF_COLORS: Record<string, string> = {
  all: '#6B7280',
  A1: '#22C55E', A2: '#84CC16',
  B1: '#F59E0B', B2: '#F97316',
  C1: '#EF4444', C2: '#9333EA',
};

type ViewMode = 'list' | 'flashcard';
type Filter = 'all' | Difficulty;
const FILTERS: Filter[] = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// ─── Styles ───────────────────────────────────────────────────
function makeStyles(c: typeof DARK, isDark: boolean, sw: number, sh: number) {
  const cardW = sw - 32;
  const cardH = sh * 0.72;

  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: c.BG },
    safeArea:{ flex: 1, backgroundColor: c.BG },

    // Header
    header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
    backBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center' },
    backText:  { color: c.TEXT_P, fontSize: 18 },
    title:     { flex: 1, color: c.TEXT_P, fontSize: 17, fontWeight: '700' },
    toggleRow: { flexDirection: 'row', backgroundColor: c.SURFACE2, borderRadius: 10, padding: 3, gap: 2 },
    toggleBtn: { width: 34, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    toggleActive: { backgroundColor: c.PURPLE },
    toggleIcon:   { fontSize: 15 },

    // Chips
    chipScrollWrap: { flexShrink: 0, flexGrow: 0 },
    chipScroll: { paddingHorizontal: 16, paddingBottom: 12, flexGrow: 0 },
    chip:       { width: 52, height: 34, borderRadius: 20, marginRight: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    chipText:   { fontSize: 12, fontWeight: '700' },

    // Separator
    separator: { height: 1, backgroundColor: c.BORDER, marginHorizontal: 16 },

    // List view row
    row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
    rowInfo:    { flex: 1 },
    rowWord:    { color: c.TEXT_P, fontSize: 16, fontWeight: '700' },
    rowMeaning: { color: c.TEXT_S, fontSize: 13, marginTop: 3, lineHeight: 18 },
    checkBtn:   { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    checkText:  { fontSize: 14, fontWeight: '900' },

    // Flashcard container
    flashOuter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cardStack:  { width: cardW, height: cardH },

    // Card (front & back share base)
    card:       { width: cardW, height: cardH, borderRadius: 20, position: 'absolute', borderWidth: 1, borderColor: isDark ? '#ffffff18' : c.BORDER, overflow: 'hidden', backfaceVisibility: 'hidden' },

    // Front
    cardFront:     { backgroundColor: c.SURFACE, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
    cardBigWord:   { color: c.TEXT_P, fontSize: 44, fontWeight: '900', textAlign: 'center' },
    posBadge:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: c.PURPLE + '22' },
    posBadgeText:  { color: c.PURPLE, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    cardExample:   { color: c.TEXT_S, fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
    flipHint:      { color: c.TEXT_S, fontSize: 11, opacity: 0.5, marginTop: 6 },
    cardKnownBtn:  { position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

    // Back
    cardBack:         { backgroundColor: c.SURFACE2 },
    cardBackInner:    { flex: 1, padding: 20 },
    cardBackWord:     { color: c.TEXT_P, fontSize: 20, fontWeight: '800', marginBottom: 14 },
    sectionLabel:     { color: c.TEXT_S, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 14, marginBottom: 6 },
    meaningBlock:     { marginBottom: 12 },
    meaningDef:       { color: c.TEXT_P, fontSize: 13, lineHeight: 19, marginTop: 3 },
    meaningEx:        { color: c.TEXT_S, fontSize: 12, fontStyle: 'italic', marginTop: 3, lineHeight: 17 },
    verbGrid:         { flexDirection: 'row', gap: 6 },
    verbCell:         { flex: 1, backgroundColor: c.SURFACE, borderRadius: 8, padding: 8, alignItems: 'center' },
    verbLabel:        { color: c.TEXT_S, fontSize: 10, fontWeight: '700' },
    verbValue:        { color: c.TEXT_P, fontSize: 12, fontWeight: '600', marginTop: 2 },
    phrasalBlock:     { marginBottom: 10 },
    phrasalPhrase:    { color: c.PURPLE, fontSize: 13, fontWeight: '700' },
    phrasalDef:       { color: c.TEXT_P, fontSize: 13, marginTop: 2 },
    phrasalEx:        { color: c.TEXT_S, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
    cardFlipBackBtn:  { position: 'absolute', top: 14, right: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: c.SURFACE },
    cardFlipBackText: { color: c.TEXT_S, fontSize: 11 },

    // Difficulty badge (back card)
    diffBadge:     { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
    diffBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

    // Unenriched fallback (back card)
    unenrichedBox:  { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, paddingTop: 40 },
    unenrichedIcon: { fontSize: 32 },
    unenrichedText: { color: c.TEXT_S, fontSize: 13, textAlign: 'center' as const },

    // Swipe stamps
    knownStamp: {
      position: 'absolute', top: 28, left: 20, zIndex: 10,
      borderWidth: 3, borderColor: '#22C55E', borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 6,
      transform: [{ rotate: '-15deg' }],
    },
    knownStampText:   { color: '#22C55E', fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },
    unknownStamp: {
      position: 'absolute', top: 28, right: 20, zIndex: 10,
      borderWidth: 3, borderColor: '#EF4444', borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 6,
      transform: [{ rotate: '15deg' }],
    },
    unknownStampText: { color: '#EF4444', fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },

    // Progress
    progressText: { color: c.TEXT_S, fontSize: 13, marginTop: 14, textAlign: 'center' },

    // Remove button on row
    removeBtn:  { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EF444418', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    removeBtnText: { fontSize: 13 },

    // Bottom CTA
    ctaBar:    { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: isDark ? '#ffffff0f' : '#e0e0ea' },
    ctaBtn:    { backgroundColor: c.PURPLE, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    ctaBtnDis: { opacity: 0.4 },
    ctaText:   { color: '#fff', fontSize: 14, fontWeight: '700' },

    // Empty/loading
    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyText: { color: c.TEXT_S, fontSize: 15 },
    emptyIcon: { fontSize: 36 },
  });
}

// ─── WordRow ──────────────────────────────────────────────────
type Styles = ReturnType<typeof makeStyles>;

function WordRow({
  word,
  isKnown,
  onToggle,
  onRemove,
  styles,
  c,
}: {
  word: ListWord;
  isKnown: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  styles: Styles;
  c: typeof DARK;
}) {
  const meaning = word.definition?.meanings?.[0]?.definition;
  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowWord}>{word.word}</Text>
        {!!meaning && (
          <Text style={styles.rowMeaning} numberOfLines={2}>{meaning}</Text>
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
      {!!onRemove && (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove} activeOpacity={0.7}>
          <Text style={styles.removeBtnText}>🗑</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── FlashCardBack ────────────────────────────────────────────
function FlashCardBack({
  word,
  isKnown,
  onToggle,
  onFlipBack,
  styles,
  c,
  animStyle,
}: {
  word: ListWord;
  isKnown: boolean;
  onToggle: () => void;
  onFlipBack: () => void;
  styles: Styles;
  c: typeof DARK;
  animStyle: any;
}) {
  const def = word.definition;
  return (
    <Reanimated.View style={[styles.card, styles.cardBack, animStyle]}>
      <ScrollView style={styles.cardBackInner} showsVerticalScrollIndicator={false}>
        <Text style={styles.cardBackWord}>{word.word}</Text>

        {word.difficulty && (
          <View style={[styles.diffBadge, {
            backgroundColor: DIFF_COLORS[word.difficulty] + '22',
            borderColor: DIFF_COLORS[word.difficulty],
          }]}>
            <Text style={[styles.diffBadgeText, { color: DIFF_COLORS[word.difficulty] }]}>
              {word.difficulty}
            </Text>
          </View>
        )}

        {!def ? (
          <View style={styles.unenrichedBox}>
            <Text style={styles.unenrichedIcon}>⏳</Text>
            <Text style={styles.unenrichedText}>Kelime detayı henüz işlenmedi</Text>
          </View>
        ) : (
          <>
            {/* Meanings */}
            {def.meanings?.map((m, i) => (
              <View key={i} style={styles.meaningBlock}>
                <View style={styles.posBadge}>
                  <Text style={styles.posBadgeText}>{m.pos}</Text>
                </View>
                <Text style={styles.meaningDef}>{m.definition}</Text>
                {!!m.example && <Text style={styles.meaningEx}>{m.example}</Text>}
              </View>
            ))}

            {/* Verb Forms */}
            {def.verb_forms && (
              <>
                <Text style={styles.sectionLabel}>VERB FORMS</Text>
                <View style={styles.verbGrid}>
                  {(['v1', 'v2', 'v3', 'ing'] as const).map((key) => (
                    <View key={key} style={styles.verbCell}>
                      <Text style={styles.verbLabel}>{key.toUpperCase()}</Text>
                      <Text style={styles.verbValue}>{def.verb_forms![key]}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Phrasal Verbs */}
            {def.phrasal_verbs?.length ? (
              <>
                <Text style={styles.sectionLabel}>PHRASAL VERBS</Text>
                {def.phrasal_verbs.map((pv, i) => (
                  <View key={i} style={styles.phrasalBlock}>
                    <Text style={styles.phrasalPhrase}>{pv.phrase}</Text>
                    <Text style={styles.phrasalDef}>{pv.definition}</Text>
                    {!!pv.example && <Text style={styles.phrasalEx}>{pv.example}</Text>}
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Known toggle */}
      <TouchableOpacity
        style={[styles.cardKnownBtn, { position: 'absolute', top: 14, left: 14, borderColor: isKnown ? c.PURPLE : c.TEXT_S, backgroundColor: isKnown ? c.PURPLE + '22' : 'transparent' }]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.checkText, { color: isKnown ? c.PURPLE : c.TEXT_S }]}>✓</Text>
      </TouchableOpacity>

      {/* Flip back */}
      <TouchableOpacity style={styles.cardFlipBackBtn} onPress={onFlipBack}>
        <Text style={styles.cardFlipBackText}>↩ flip</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function ListScreen({ listId }: { listId: number }) {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { width, height } = useWindowDimensions();
  const c = isDark ? DARK : LIGHT;

  const styles = useMemo(() => makeStyles(c, isDark, width, height), [isDark, width, height]);

  // ─── Data ─────────────────────────────────────────────────
  const isKnownList = listId === -1;
  const { data: list, isLoading: listLoading } = useListDetail(listId);
  const { data: knownWordsData = [], isLoading: knownLoading } = useKnownWords();
  const { mutate: toggleKnown }                                = useMarkKnown();
  const { mutate: removeWord }                                 = useRemoveWordFromList();
  const { mutate: generateSubList, isPending: generating }     = useCreateSubListFromUnknown();

  // listId=-1 için knownWordsData'yı ListDetailDTO formatına çevir
  const knownWordsAsDetail = useMemo<typeof list>(() => {
    if (!isKnownList) return undefined;
    return {
      id: -1,
      name: 'Bilinen Kelimeler',
      words: knownWordsData as any as ListWord[],
      createdAt: new Date().toISOString(),
    };
  }, [isKnownList, knownWordsData]);

  const effectiveList = isKnownList ? knownWordsAsDetail : list;
  const isLoading = isKnownList ? knownLoading : listLoading;

  // ─── State ────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filter, setFilter]     = useState<Filter>('all');
  const [cardIndex, setCardIndex] = useState(0);
  const [knownIds, setKnownIds]   = useState<Set<number>>(new Set());
  const knownInitialized = useRef(false);

  // ─── Init known IDs once ───────────────────────────────────
  useEffect(() => {
    if (!knownInitialized.current && knownWordsData.length > 0) {
      setKnownIds(new Set(knownWordsData.map((w) => w.id)));
      knownInitialized.current = true;
    }
  }, [knownWordsData]);

  // ─── Filtered words ───────────────────────────────────────
  const filteredWords = useMemo<ListWord[]>(() => {
    if (!effectiveList?.words) return [];
    if (filter === 'all') return effectiveList.words;
    return effectiveList.words.filter((w) => w.difficulty === filter);
  }, [effectiveList?.words, filter]);

  // Reset card index on filter change
  useEffect(() => { setCardIndex(0); }, [filter]);

  // ─── Toggle known ─────────────────────────────────────────
  const handleToggle = useCallback((wordId: number) => {
    const currentlyKnown = knownIds.has(wordId);
    setKnownIds((prev) => {
      const next = new Set(prev);
      currentlyKnown ? next.delete(wordId) : next.add(wordId);
      return next;
    });
    toggleKnown({ wordId, isKnown: currentlyKnown });
  }, [knownIds, toggleKnown]);

  // ─── Remove word from list ────────────────────────────────
  const handleRemove = useCallback((wordId: number, wordName: string) => {
    Alert.alert(
      'Kelimeyi Kaldır',
      `"${wordName}" kelimesini listeden kaldırmak istiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Kaldır', style: 'destructive', onPress: () => removeWord({ listId, wordId }) },
      ],
    );
  }, [removeWord, listId]);

  // ─── Generate sub-list from unknowns ─────────────────────
  const unknownCount = useMemo(
    () => filteredWords.filter((w) => !knownIds.has(w.id)).length,
    [filteredWords, knownIds],
  );

  const handleGenerateSubList = useCallback(() => {
    Alert.alert(
      'Alt-Liste Oluştur',
      `Bu listedeki ${unknownCount} bilinmeyen kelimeden yeni bir liste oluşturulsun mu?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Oluştur', onPress: () => generateSubList(listId, {
          onSuccess: (newList) => Alert.alert('Başarılı', `"${newList.name}" oluşturuldu.`),
        }) },
      ],
    );
  }, [generateSubList, listId, unknownCount]);

  // ─── Flashcard animations (Reanimated 4 + Gesture Handler) ──
  const cardX        = useSharedValue(0);
  const cardY        = useSharedValue(0);
  const flipProgress = useSharedValue(0);
  const isFlipped    = useSharedValue(false);
  const hapticFired  = useSharedValue(false);
  const totalSV      = useSharedValue(filteredWords.length);
  const indexSV      = useSharedValue(cardIndex);

  useEffect(() => { totalSV.value = filteredWords.length; }, [filteredWords.length]);
  useEffect(() => { indexSV.value = cardIndex; },           [cardIndex]);

  // Reset flip when card changes
  useEffect(() => {
    flipProgress.value = 0;
    isFlipped.value    = false;
  }, [cardIndex]);

  const triggerLight  = useCallback(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),  []);
  const triggerMedium = useCallback(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), []);

  // Card container: tilt + scale while dragging
  const cardContainerStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      cardX.value, [-width * 0.5, 0, width * 0.5], [-14, 0, 14], Extrapolation.CLAMP,
    );
    const scale = interpolate(
      Math.abs(cardX.value), [0, width * 0.5], [1, 0.94], Extrapolation.CLAMP,
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

  const doFlip = useCallback(() => {
    const next = !isFlipped.value;
    isFlipped.value    = next;
    flipProgress.value = withTiming(next ? 1 : 0, { duration: 380, easing: Easing.inOut(Easing.ease) });
  }, [flipProgress, isFlipped]);

  // Gestures
  const panGesture = Gesture.Pan()
    .minDistance(5)
    .activeOffsetX([-8, 8])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      if (isFlipped.value) return;
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
      if (!isFlipped.value && committed) {
        const goLeft  = e.velocityX < -200 ? true : e.velocityX > 200 ? false : e.translationX < 0;
        const total   = totalSV.value;
        const cur     = indexSV.value;
        // sola = ileri (cur+1), sağa = geri (cur-1)
        const nextIdx = goLeft ? (cur < total - 1 ? cur + 1 : -1) : (cur > 0 ? cur - 1 : -1);
        runOnJS(triggerMedium)();
        if (nextIdx >= 0) {
          const exitX  = goLeft ? -width * 1.5 : width * 1.5;
          const enterX = goLeft ?  width * 1.5 : -width * 1.5;
          cardX.value = withTiming(exitX, { duration: 200, easing: Easing.in(Easing.ease) }, () => {
            flipProgress.value = 0;
            isFlipped.value    = false;
            runOnJS(setCardIndex)(nextIdx);
            cardX.value = enterX;
            cardY.value = 0;
            cardX.value = withSpring(0, { damping: 20, stiffness: 220, mass: 0.85 });
          });
        } else {
          // Edge wobble
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

  // ─── Render ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={DARK.PURPLE} size="large" />
      </View>
    );
  }

  const currentWord = filteredWords[cardIndex];

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
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{effectiveList?.name ?? '...'}</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[styles.toggleIcon, { color: viewMode === 'list' ? '#fff' : c.TEXT_S }]}>☰</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'flashcard' && styles.toggleActive]}
              onPress={() => setViewMode('flashcard')}
            >
              <Text style={[styles.toggleIcon, { color: viewMode === 'flashcard' ? '#fff' : c.TEXT_S }]}>⧉</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Difficulty Chips — her iki modda da görünür */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScrollWrap}
          contentContainerStyle={styles.chipScroll}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            const color  = DIFF_COLORS[f];
            return (
              <TouchableOpacity
                key={f}
                style={[styles.chip, { borderColor: color, backgroundColor: active ? color + '33' : 'transparent' }]}
                onPress={() => setFilter(f)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, { color: active ? color : c.TEXT_S }]}>
                  {f === 'all' ? 'Tümü' : f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filteredWords.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Bu seviyede kelime yok</Text>
          </View>
        ) : viewMode === 'list' ? (
          /* ── LIST VIEW ──────────────────────────────────── */
          <FlatList
            data={filteredWords}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <WordRow
                word={item}
                isKnown={knownIds.has(item.id)}
                onToggle={() => handleToggle(item.id)}
                onRemove={!isKnownList ? () => handleRemove(item.id, item.word) : undefined}
                styles={styles}
                c={c}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View style={{ height: 16 }} />}
          />
        ) : (
          /* ── FLASHCARD VIEW ──────────────────────────────── */
          <View style={styles.flashOuter}>
            {currentWord && (
              <GestureDetector gesture={cardGesture}>
                <Reanimated.View style={[styles.cardStack, cardContainerStyle]}>

                  {/* Front */}
                  <Reanimated.View style={[styles.card, styles.cardFront, frontAnimStyle]}>
                    <Text style={styles.cardBigWord}>{currentWord.word}</Text>
                    {currentWord.definition?.meanings?.[0] && (
                      <>
                        <View style={styles.posBadge}>
                          <Text style={styles.posBadgeText}>
                            {currentWord.definition.meanings[0].pos}
                          </Text>
                        </View>
                        <Text style={styles.cardExample} numberOfLines={3}>
                          {currentWord.definition.meanings[0].example}
                        </Text>
                      </>
                    )}
                    <Text style={styles.flipHint}>karta dokun → çevir</Text>
                    <TouchableOpacity
                      style={[styles.cardKnownBtn, {
                        borderColor: knownIds.has(currentWord.id) ? c.PURPLE : c.TEXT_S,
                        backgroundColor: knownIds.has(currentWord.id) ? c.PURPLE + '22' : 'transparent',
                      }]}
                      onPress={() => handleToggle(currentWord.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.checkText, { color: knownIds.has(currentWord.id) ? c.PURPLE : c.TEXT_S }]}>✓</Text>
                    </TouchableOpacity>
                  </Reanimated.View>

                  {/* Back */}
                  <FlashCardBack
                    word={currentWord}
                    isKnown={knownIds.has(currentWord.id)}
                    onToggle={() => handleToggle(currentWord.id)}
                    onFlipBack={doFlip}
                    styles={styles}
                    c={c}
                    animStyle={backAnimStyle}
                  />
                </Reanimated.View>
              </GestureDetector>
            )}

            <Text style={styles.progressText}>
              {cardIndex + 1} / {filteredWords.length}
            </Text>
          </View>
        )}

        {/* Alt-liste CTA — sadece normal listeler için, bilinmeyen kelime varsa */}
        {!isKnownList && viewMode === 'list' && unknownCount > 0 && (
          <View style={styles.ctaBar}>
            <TouchableOpacity
              style={[styles.ctaBtn, generating && styles.ctaBtnDis]}
              onPress={handleGenerateSubList}
              disabled={generating}
              activeOpacity={0.85}
            >
              {generating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.ctaText}>Bilinmeyenlerden Alt-Liste Oluştur ({unknownCount})</Text>
              }
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>
    </View>
  );
}
