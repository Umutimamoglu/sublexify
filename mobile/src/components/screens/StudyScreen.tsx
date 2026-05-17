import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useStudyBatch, useSubmitStudyResults } from '@/src/api/queries/study.queries';
import { useKnownWords } from '@/src/api/queries/user.queries';
import { useMarkKnown } from '@/src/api/queries/words.queries';
import type { StudyResultDTO, ListWord, StudyQuestionDTO } from '@/src/types/api';
import { WordPreviewOverlay } from '@/src/components/ui/WordPreviewOverlay';
import AddToListModal from '@/src/components/ui/AddToListModal';


type Palette = {
  BG: string; SURFACE: string; SURFACE2: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
};

function makeStyles(c: Palette, isDark: boolean, isTablet: boolean) {
  const pad = isTablet ? 32 : 16;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: pad, paddingVertical: 12, gap: 10,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { flex: 1, color: c.TEXT_P, fontSize: 17, fontWeight: '700' },
    counterText: { color: c.TEXT_S, fontSize: 14, fontWeight: '600' },

    // Progress bar
    progressBar: { height: 3, backgroundColor: isDark ? '#ffffff18' : '#e0e0ea', marginHorizontal: pad },
    progressFill: { height: 3, backgroundColor: c.PURPLE, borderRadius: 2 },

    // Body
    body: { flex: 1, paddingHorizontal: pad, paddingTop: 24 },

    // Question type label
    questionTypeLabel: {
      color: c.TEXT_S, fontSize: 12, fontWeight: '700',
      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16,
    },

    // Word card (for MULTIPLE_CHOICE / LISTENING)
    wordCard: {
      backgroundColor: c.SURFACE,
      borderRadius: 20, borderWidth: 1,
      borderColor: isDark ? '#ffffff18' : c.BORDER,
      paddingHorizontal: 24,
      paddingVertical: 36,
      alignItems: 'center', justifyContent: 'center',
      minHeight: isTablet ? 220 : 160, marginBottom: 24,
      position: 'relative',
    },
    hintBadge: {
      position: 'absolute',
      top: 14,
      left: 16,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.PURPLE,
      backgroundColor: c.PURPLE + '12',
    },
    hintText: {
      color: c.PURPLE,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    wordText: {
      color: c.TEXT_P,
      fontSize: isTablet ? 32 : 22,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: isTablet ? 42 : 30,
      marginTop: 20,
    },

    // Context sentence card (for FILL_IN_THE_BLANKS)
    sentenceCard: {
      backgroundColor: c.SURFACE,
      borderRadius: 20, borderWidth: 1,
      borderColor: isDark ? '#ffffff18' : c.BORDER,
      padding: 24, marginBottom: 24,
    },
    sentenceText: {
      color: c.TEXT_P,
      fontSize: isTablet ? 20 : 17,
      lineHeight: isTablet ? 30 : 26,
      textAlign: 'center',
    },

    // Listen button
    listenBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 10, paddingHorizontal: 20,
      borderRadius: 12, borderWidth: 1.5, borderColor: c.PURPLE,
      backgroundColor: c.PURPLE + '15', marginBottom: 24, alignSelf: 'center',
    },
    listenText: { color: c.PURPLE, fontSize: 14, fontWeight: '700' },

    // Choice buttons
    choicesGrid: { gap: 10 },
    choiceBtn: {
      borderRadius: 14, borderWidth: 1.5, borderColor: c.BORDER,
      backgroundColor: c.SURFACE, padding: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    choiceBtnCorrect: { borderColor: '#22C55E', backgroundColor: '#22C55E22' },
    choiceBtnWrong: { borderColor: '#EF4444', backgroundColor: '#EF444422' },
    choiceBtnSelected: { borderColor: c.PURPLE, backgroundColor: c.PURPLE + '22' },
    choiceText: { color: c.TEXT_P, fontSize: isTablet ? 17 : 15, fontWeight: '600' },

    // Fill-in input
    fillRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    fillInput: {
      flex: 1, backgroundColor: c.SURFACE, borderRadius: 14,
      borderWidth: 1.5, borderColor: c.BORDER,
      padding: 14, color: c.TEXT_P, fontSize: 16,
    },
    fillInputFocused: { borderColor: c.PURPLE },
    checkBtn: {
      backgroundColor: c.PURPLE, borderRadius: 14,
      padding: 14, alignItems: 'center', justifyContent: 'center',
    },
    checkBtnDis: { opacity: 0.4 },

    // Feedback row (after reveal)
    feedbackRow: {
      marginTop: 20, padding: 16, borderRadius: 14, borderWidth: 1,
      alignItems: 'center', gap: 6,
    },
    feedbackCorrect: { backgroundColor: '#22C55E22', borderColor: '#22C55E' },
    feedbackWrong: { backgroundColor: '#EF444422', borderColor: '#EF4444' },
    feedbackSkipped: { backgroundColor: '#EAB30815', borderColor: '#EAB308' },
    feedbackLabel: { fontSize: 18, fontWeight: '900' },
    feedbackAnswer: { color: c.TEXT_S, fontSize: 14, textAlign: 'center' },

    // Next button
    nextBtn: {
      marginTop: 20, backgroundColor: c.PURPLE, borderRadius: 14,
      paddingVertical: 16, alignItems: 'center',
    },
    nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Skip button
    skipBtn: {
      marginTop: 16, borderWidth: 1.5,
      borderColor: isDark ? '#ffffff20' : c.BORDER,
      borderRadius: 14, paddingVertical: 14,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    skipText: { color: c.TEXT_S, fontSize: 15, fontWeight: '600' },

    // Empty state
    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: pad },
    emptyIcon: { fontSize: 56 },
    emptyTitle: { color: c.TEXT_P, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    emptyDesc: { color: c.TEXT_S, fontSize: 15, textAlign: 'center', lineHeight: 22 },
    emptyBtn: {
      marginTop: 8, backgroundColor: c.PURPLE, borderRadius: 14,
      paddingHorizontal: 32, paddingVertical: 14,
    },
    emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Summary modal (Full-screen high-fidelity Recap Dashboard)
    overlay: { flex: 1, backgroundColor: c.BG, paddingHorizontal: pad, paddingTop: 30 },
    summaryCard: { flex: 1, width: '100%', gap: 16 },
    summaryTitle: { color: c.TEXT_P, fontSize: 24, fontWeight: '900', textAlign: 'center' },
    scoreText: { color: c.PURPLE, fontSize: 36, fontWeight: '900', textAlign: 'center', marginTop: 4 },
    statsRow: { flexDirection: 'row', gap: 16, justifyContent: 'center', width: '100%', marginTop: 8 },
    statItem: { flex: 1, backgroundColor: isDark ? '#ffffff06' : '#00000004', borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: isDark ? '#ffffff10' : c.BORDER },
    statNum: { fontSize: 20, fontWeight: '800' },
    statLabel: { color: c.TEXT_S, fontSize: 11, fontWeight: '600' },
    finishBtn: {
      backgroundColor: c.PURPLE, borderRadius: 14,
      paddingVertical: 15, alignItems: 'center', marginVertical: 16,
      shadowColor: c.PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    finishBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Recap list styles
    recapScroll: { flex: 1, marginTop: 12 },
    recapItem: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      gap: 12,
    },
    recapCorrect: { backgroundColor: '#22C55E10', borderColor: '#22C55E40' },
    recapWrong: { backgroundColor: '#EF444410', borderColor: '#EF444440' },
    recapSkipped: { backgroundColor: '#EAB30810', borderColor: '#EAB30840' },
    recapInfo: { flex: 1, gap: 4 },
    recapHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    recapWord: { fontSize: 16, fontWeight: '800', color: c.TEXT_P },
    recapPos: { fontSize: 10, fontWeight: '700', color: c.TEXT_S, backgroundColor: isDark ? '#ffffff12' : '#00000008', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, textTransform: 'uppercase' },
    recapDefinition: { fontSize: 13, color: c.TEXT_S, lineHeight: 18, marginTop: 2 },
    recapAnswers: { fontSize: 12, fontWeight: '600', color: c.TEXT_P, marginTop: 4 },
    recapInspectBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.PURPLE + '15',
      alignItems: 'center', justifyContent: 'center',
    },

    // ─── Word Chip (after answer reveal) ─────────────────────
    wordChip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between',
      marginTop: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? '#ffffff15' : c.BORDER,
      backgroundColor: isDark ? '#ffffff08' : c.SURFACE,
    },
    wordChipLeft: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginRight: 12 },
    wordChipWord: { color: c.TEXT_P, fontSize: 16, fontWeight: '800' },
    wordChipDiff: { flex: 1, color: c.TEXT_S, fontSize: 12, fontWeight: '600' },
    wordChipInfoBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: c.PURPLE + '20',
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
  });
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface SessionAnswer {
  question: StudyQuestionDTO;
  userAnswer: string | null;
  isCorrect: boolean;
  skipped: boolean;
}

export default function StudyScreen({ 
  listId, 
  types, 
  difficulties, 
  onlyUnknown,
  size = 20,
}: { 
  listId: number | null; 
  types?: string[];
  difficulties?: string[];
  onlyUnknown?: boolean;
  size?: number;
}) {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation('study');
  const { isTablet } = useResponsive();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const c: Palette = {
    BG: theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surfaceSubtle,
    TEXT_P: theme.colors.textPrimary,
    TEXT_S: theme.colors.textSecondary,
    BORDER: theme.colors.borderDefault,
    PURPLE: theme.colors.primary,
  };

  const styles = useMemo(() => makeStyles(c, isDark, isTablet), [c, isDark, isTablet]);

  const { data: questions = [], isLoading } = useStudyBatch(listId, types, difficulties, onlyUnknown, size);
  const { mutate: submitResults, isPending: submitting } = useSubmitStudyResults();
  const { mutate: toggleKnown } = useMarkKnown();
  const { data: knownWordsData = [] } = useKnownWords();
  const knownIdsSet = useMemo(() => new Set<number>(knownWordsData.map((w: { id: number }) => w.id)), [knownWordsData]);

  // Helper: StudyQuestionDTO → ListWord (for preview overlay)
  const questionToListWord = useCallback((q: typeof questions[0]): ListWord => ({
    id: q.wordId,
    word: q.word,
    language: 'en',
    difficulty: (q.difficulty as any) || null,
    definition: q.definition ? {
      word: q.word,
      difficulty: q.difficulty || '',
      meanings: [{ pos: q.pos || '', definition: q.definition, example: q.contextSentence ?? '' }],
      phrasal_verbs: [],
      verb_forms: null,
    } : null,
    isEnriched: true,
    isKnown: knownIdsSet.has(q.wordId),
  }), [knownIdsSet]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<StudyResultDTO[]>([]);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [fillValue, setFillValue] = useState('');
  const [fillFocused, setFillFocused] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [previewWord, setPreviewWord] = useState<ListWord | null>(null);
  const [addModal, setAddModal] = useState<{ wordId: number; wordName: string } | null>(null);

  const handleNextRef = useRef<() => void>(null);

  useEffect(() => {
    handleNextRef.current = handleNext;
  });

  const question = questions[currentIndex];
  const total = questions.length;

  const isCorrectChoice = useCallback(
    (choice: string) => choice === question?.correctAnswer,
    [question],
  );

  const handleChoiceSelect = useCallback((choice: string) => {
    if (revealed) return;
    setSelectedChoice(choice);
    setRevealed(true);
    const isCorrect = choice === question.correctAnswer;
    setAnswers((prev) => [...prev, { wordId: question.wordId, isCorrect }]);
    setSessionAnswers((prev) => [...prev, { question, userAnswer: choice, isCorrect, skipped: false }]);
  }, [revealed, question]);

  const handleFillCheck = useCallback(() => {
    if (!fillValue.trim() || revealed) return;
    const isCorrect = fillValue.trim().toLowerCase() === question.correctAnswer.toLowerCase();
    setRevealed(true);
    setAnswers((prev) => [...prev, { wordId: question.wordId, isCorrect }]);
    setSessionAnswers((prev) => [...prev, { question, userAnswer: fillValue.trim(), isCorrect, skipped: false }]);
  }, [fillValue, revealed, question]);

  const handleSkip = useCallback(() => {
    if (revealed) return;
    setSkipped(true);
    setRevealed(true);
    setAnswers((prev) => [...prev, { wordId: question.wordId, isCorrect: false }]);
    setSessionAnswers((prev) => [...prev, { question, userAnswer: null, isCorrect: false, skipped: true }]);
  }, [revealed, question]);

  const handleNext = useCallback(() => {
    setSelectedChoice(null);
    setRevealed(false);
    setSkipped(false);
    setFillValue('');
    setFillFocused(false);
    setPreviewWord(null);

    if (currentIndex + 1 >= total) {
      submitResults(answers, {
        onSuccess: () => setShowSummary(true),
        onError: () => setShowSummary(true),
      });
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, total, answers, submitResults]);

  const handleListen = useCallback(() => {
    if (question?.word) {
      Speech.speak(question.word, { language: 'en-US' });
    }
  }, [question]);

  const correctCount = answers.filter((a) => a.isCorrect).length;

  // ─── Loading ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={c.PURPLE} size="large" />
      </View>
    );
  }

  // ─── Empty state ──────────────────────────────────────────
  if (!isLoading && questions.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.BG} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color={c.TEXT_P} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('title')}</Text>
          </View>
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>{t('noQuestions')}</Text>
            <Text style={styles.emptyDesc}>{t('noQuestionsDesc')}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()}>
              <Text style={styles.emptyBtnText}>{t('finish')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Main render ──────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.BG} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color={c.TEXT_P} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('title')}</Text>
            <Text style={styles.counterText}>{t('question', { current: currentIndex + 1, total })}</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((currentIndex + 1) / total) * 100}%` }]} />
          </View>

          {/* Body */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Question type label */}
            <Text style={styles.questionTypeLabel}>
              {question && t(`questionTypes.${question.questionType}`)}
            </Text>

            {/* Top Card */}
            {question?.questionType === 'LISTENING' ? (
              <View style={[styles.wordCard, { paddingVertical: 40, gap: 16 }]}>
                <TouchableOpacity
                  style={{
                    width: 72, height: 72, borderRadius: 36,
                    backgroundColor: c.PURPLE + '20',
                    alignItems: 'center', justifyContent: 'center', alignSelf: 'center'
                  }}
                  onPress={handleListen} activeOpacity={0.8}
                >
                  <Ionicons name="volume-high" size={36} color={c.PURPLE} />
                </TouchableOpacity>
                <Text style={{ color: c.TEXT_S, textAlign: 'center', fontSize: 16 }}>
                  Dinlemek için tıklayın
                </Text>
              </View>
            ) : (
              <View style={styles.wordCard}>
                {(question?.difficulty || question?.pos) && (
                  <View style={styles.hintBadge}>
                    <Text style={styles.hintText}>
                      {[question.difficulty, question.pos].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                )}
                <Text style={styles.wordText} adjustsFontSizeToFit numberOfLines={4}>
                  {question?.definition}
                </Text>
              </View>
            )}

            {/* Choices (MULTIPLE_CHOICE) */}
            {question?.questionType === 'MULTIPLE_CHOICE' && (
              <View style={styles.choicesGrid}>
                {question?.choices?.map((choice) => {
                  const isSelected = selectedChoice === choice;
                  const isCorrect = isCorrectChoice(choice);
                  const choiceStyle = revealed
                    ? isCorrect
                      ? styles.choiceBtnCorrect
                      : isSelected
                        ? styles.choiceBtnWrong
                        : undefined
                    : isSelected
                      ? styles.choiceBtnSelected
                      : undefined;

                  return (
                    <TouchableOpacity
                      key={choice}
                      style={[styles.choiceBtn, choiceStyle]}
                      onPress={() => handleChoiceSelect(choice)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.choiceText}>{choice}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Text Input (FILL_IN_THE_BLANKS / LISTENING) */}
            {(question?.questionType === 'FILL_IN_THE_BLANKS' || question?.questionType === 'LISTENING') && !revealed && (
              <View style={styles.fillRow}>
                <TextInput
                  style={[styles.fillInput, fillFocused && styles.fillInputFocused]}
                  placeholder={t('typeAnswer')}
                  placeholderTextColor={c.TEXT_S}
                  value={fillValue}
                  onChangeText={setFillValue}
                  onFocus={() => setFillFocused(true)}
                  onBlur={() => setFillFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={handleFillCheck}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.checkBtn, !fillValue.trim() && styles.checkBtnDis]}
                  onPress={handleFillCheck}
                  disabled={!fillValue.trim()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Skip Button */}
            {!revealed && (
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleSkip}
                activeOpacity={0.8}
              >
                <Text style={styles.skipText}>{t('skip')}</Text>
              </TouchableOpacity>
            )}

            {/* Feedback */}
            {revealed && (
              <>
                <View style={[
                  styles.feedbackRow,
                  skipped 
                    ? styles.feedbackSkipped 
                    : answers[answers.length - 1]?.isCorrect 
                      ? styles.feedbackCorrect 
                      : styles.feedbackWrong,
                ]}>
                  <Text style={[
                    styles.feedbackLabel,
                    { 
                      color: skipped 
                        ? '#EAB308' 
                        : answers[answers.length - 1]?.isCorrect 
                          ? '#22C55E' 
                          : '#EF4444' 
                    },
                  ]}>
                    {skipped 
                      ? t('skipped') 
                      : answers[answers.length - 1]?.isCorrect 
                        ? t('correct') 
                        : t('wrong')
                    }
                  </Text>
                  {(!answers[answers.length - 1]?.isCorrect || skipped) && (
                    <Text style={styles.feedbackAnswer}>
                      {t('correctAnswer', { answer: question?.correctAnswer })}
                    </Text>
                  )}
                </View>

                {/* ── Word Chip ── */}
                {!!question && (
                  <TouchableOpacity
                    style={styles.wordChip}
                    onPress={() => setPreviewWord(questionToListWord(question))}
                    activeOpacity={0.75}
                  >
                    <View style={styles.wordChipLeft}>
                      <Text style={styles.wordChipWord}>{question.word}</Text>
                      {!!question.definition && (
                        <Text style={styles.wordChipDiff} numberOfLines={1}>
                          {question.definition.length > 40
                            ? question.definition.substring(0, 40) + '…'
                            : question.definition}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.wordChipInfoBtn}
                      onPress={() => setPreviewWord(questionToListWord(question))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="information-circle-outline" size={20} color={c.PURPLE} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.nextBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleNext}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.nextText}>{t('next')}</Text>
                  }
                </TouchableOpacity>
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Summary modal */}
      <Modal visible={showSummary} transparent={false} animationType="slide">
        <View style={{ flex: 1, backgroundColor: c.BG, paddingTop: Math.max(insets.top, 16) }}>
          <View style={styles.overlay}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{t('sessionComplete')}</Text>
              <Text style={styles.scoreText}>
                {t('score', { correct: correctCount, total })}
              </Text>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: '#22C55E' }]}>{correctCount}</Text>
                  <Text style={styles.statLabel}>{t('correct_count')}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: '#EF4444' }]}>
                    {total - correctCount - sessionAnswers.filter((sa) => sa.skipped).length}
                  </Text>
                  <Text style={styles.statLabel}>{t('wrong_count')}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: '#EAB308' }]}>
                    {sessionAnswers.filter((sa) => sa.skipped).length}
                  </Text>
                  <Text style={styles.statLabel}>{t('skipped_count')}</Text>
                </View>
              </View>

              <Text style={[styles.summaryTitle, { marginTop: 16, fontSize: 18, textAlign: 'left', alignSelf: 'flex-start' }]}>
                {t('recapTitle')}
              </Text>

              <ScrollView style={styles.recapScroll} showsVerticalScrollIndicator={false}>
                {sessionAnswers.map((item, idx) => {
                  const isCorrect = item.isCorrect;
                  const isSkipped = item.skipped;
                  const statusStyle = isCorrect 
                    ? styles.recapCorrect 
                    : isSkipped 
                      ? styles.recapSkipped 
                      : styles.recapWrong;
                  
                  const iconName = isCorrect 
                    ? 'checkmark-circle' 
                    : isSkipped 
                      ? 'ban' 
                      : 'close-circle';
                  
                  const iconColor = isCorrect 
                    ? '#22C55E' 
                    : isSkipped 
                      ? '#EAB308' 
                      : '#EF4444';

                  return (
                    <View key={idx} style={[styles.recapItem, statusStyle]}>
                      <View style={styles.recapInfo}>
                        <View style={styles.recapHeader}>
                          <Ionicons name={iconName} size={20} color={iconColor} />
                          <Text style={styles.recapWord}>{item.question.word}</Text>
                          {!!item.question.pos && (
                            <Text style={styles.recapPos}>{item.question.pos}</Text>
                          )}
                          {!!item.question.difficulty && (
                            <Text style={styles.recapPos}>{item.question.difficulty}</Text>
                          )}
                        </View>
                        <Text style={styles.recapDefinition} numberOfLines={2}>
                          {item.question.definition}
                        </Text>
                        
                        {/* Answer Comparison details */}
                        {isCorrect ? (
                          <Text style={[styles.recapAnswers, { color: '#22C55E' }]}>
                            {t('yourAnswer')} "{item.userAnswer}" ✓
                          </Text>
                        ) : isSkipped ? (
                          <Text style={[styles.recapAnswers, { color: '#EAB308' }]}>
                            {t('skipped')} | {t('correctAnswerLabel')} "{item.question.correctAnswer}"
                          </Text>
                        ) : (
                          <Text style={[styles.recapAnswers, { color: '#EF4444' }]}>
                            {t('yourAnswer')} "{item.userAnswer || '-'}" | {t('correctAnswerLabel')} "{item.question.correctAnswer}"
                          </Text>
                        )}
                      </View>

                      {/* Word Preview/Inspection Info button */}
                      <TouchableOpacity
                        style={styles.recapInspectBtn}
                        onPress={() => setPreviewWord(questionToListWord(item.question))}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="information-circle-outline" size={20} color={c.PURPLE} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={styles.finishBtn} onPress={() => router.back()} activeOpacity={0.85}>
                <Text style={styles.finishBtnText}>{t('finish')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Word Preview Overlay */}
      <WordPreviewOverlay
        word={previewWord}
        visible={!!previewWord}
        onClose={() => setPreviewWord(null)}
        isDark={isDark}
        c={c}
        onAddToList={(wordId, wordName) => {
          setPreviewWord(null);
          setAddModal({ wordId, wordName });
        }}
        onToggleKnown={(wordId) => {
          toggleKnown({ wordId, isKnown: knownIdsSet.has(wordId) });
        }}
        knownIdsSet={knownIdsSet}
      />

      {/* Add To List Modal */}
      <AddToListModal
        visible={!!addModal}
        wordId={addModal?.wordId || 0}
        wordName={addModal?.wordName || ''}
        onClose={() => setAddModal(null)}
      />
    </View>
  );
}
