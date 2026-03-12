import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Reanimated, { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { WordPreviewOverlay } from '@/src/components/ui/WordPreviewOverlay';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
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
function makeStyles(c: Palette, isDark: boolean, isTablet: boolean) {
  const pad = isTablet ? 32 : 16;
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
  });
}

type Styles = ReturnType<typeof makeStyles>;

// ─── Word row ──────────────────────────────────────────────────
function WordRow({
  word,
  isKnown,
  onToggle,
  onLongPress,
  onPressOut,
  styles,
  c,
}: {
  word: WordDTO;
  isKnown: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
  onPressOut?: () => void;
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
    })
    .onEnd(() => {
      // Stay open until user taps background
    });

  const rowGesture = Gesture.Simultaneous(tapGesture, longPressGesture);

  return (
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
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function VocabularyScreen() {
  const { t } = useTranslation('vocabulary');
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
  const styles = useMemo(() => makeStyles(c, isDark, isTablet), [c, isDark, isTablet]);

  const [query, setQuery] = useState('');
  const [knownIds, setKnownIds] = useState<Set<number>>(new Set());
  const [previewWord, setPreviewWord] = useState<WordDTO | null>(null);
  const knownInitialized = useRef(false);

  const { data: knownWordsData = [] }        = useKnownWords();
  const { data: frequentWords = [], isLoading: freqLoading } = useFrequentWords(60);
  const { data: searchResults = [], isLoading: searching }   = useWordSearch(query);
  const { mutate: toggleKnown }              = useMarkKnown();

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

  const isSearching = query.trim().length >= 2;
  const displayWords: WordDTO[] = isSearching ? searchResults : frequentWords;
  const isLoading = isSearching ? searching : freqLoading;

  const knownCount = knownWordsData.length;
  const knownFromFrequent = useMemo(
    () => frequentWords.filter((w) => knownIds.has(w.id)).length,
    [frequentWords, knownIds],
  );

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.BG}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('title')}</Text>

          {/* Search bar */}
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

        {/* Stats strip — sadece arama yokken */}
        {!isSearching && (
          <View style={styles.statsStrip}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{knownCount.toLocaleString()}</Text>
              <Text style={styles.statLabel}>{t('statsKnown')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{knownFromFrequent}</Text>
              <Text style={styles.statLabel}>{t('statsTop60')}</Text>
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.PURPLE} size="large" />
          </View>
        ) : (
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
                isKnown={knownIds.has(item.id)}
                onToggle={() => handleToggle(item.id)}
                onLongPress={() => setPreviewWord(item)}
                styles={styles}
                c={c}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      <WordPreviewOverlay 
        word={previewWord as any}
        visible={!!previewWord}
        onClose={() => setPreviewWord(null)}
        isDark={isDark}
        c={c}
      />
    </View>
  );
}
