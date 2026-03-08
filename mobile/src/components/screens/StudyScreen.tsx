import React, { useState, useMemo, useCallback } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useStudyBatch, useSubmitStudyResults } from '@/src/api/queries/study.queries';
import type { StudyResultDTO } from '@/src/types/api';

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
      padding: 32, alignItems: 'center', justifyContent: 'center',
      minHeight: isTablet ? 220 : 160, marginBottom: 24,
    },
    wordText: {
      color: c.TEXT_P,
      fontSize: isTablet ? 52 : 40,
      fontWeight: '900', textAlign: 'center',
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
    feedbackLabel: { fontSize: 18, fontWeight: '900' },
    feedbackAnswer: { color: c.TEXT_S, fontSize: 14, textAlign: 'center' },

    // Next button
    nextBtn: {
      marginTop: 20, backgroundColor: c.PURPLE, borderRadius: 14,
      paddingVertical: 16, alignItems: 'center',
    },
    nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },

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

    // Summary modal
    overlay: { flex: 1, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center', padding: 24 },
    summaryCard: {
      backgroundColor: c.SURFACE, borderRadius: 24, padding: 28,
      width: '100%', maxWidth: 420, alignItems: 'center', gap: 16,
    },
    summaryTitle: { color: c.TEXT_P, fontSize: 22, fontWeight: '900' },
    scoreText: { color: c.PURPLE, fontSize: 32, fontWeight: '900' },
    statsRow: { flexDirection: 'row', gap: 24 },
    statItem: { alignItems: 'center', gap: 4 },
    statNum: { fontSize: 24, fontWeight: '800' },
    statLabel: { color: c.TEXT_S, fontSize: 12 },
    finishBtn: {
      backgroundColor: c.PURPLE, borderRadius: 14,
      paddingVertical: 14, paddingHorizontal: 48, marginTop: 8,
    },
    finishBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function StudyScreen({ listId }: { listId: number }) {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation('study');
  const { isTablet } = useResponsive();
  const router = useRouter();

  const c: Palette = {
    BG: theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surfaceVariant ?? theme.colors.surface,
    TEXT_P: theme.colors.textPrimary,
    TEXT_S: theme.colors.textSecondary,
    BORDER: theme.colors.border,
    PURPLE: theme.colors.primary,
  };

  const styles = useMemo(() => makeStyles(c, isDark, isTablet), [c, isDark, isTablet]);

  const { data: questions = [], isLoading } = useStudyBatch(listId);
  const { mutate: submitResults, isPending: submitting } = useSubmitStudyResults();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<StudyResultDTO[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [fillValue, setFillValue] = useState('');
  const [fillFocused, setFillFocused] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

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
  }, [revealed, question]);

  const handleFillCheck = useCallback(() => {
    if (!fillValue.trim() || revealed) return;
    const isCorrect = fillValue.trim().toLowerCase() === question.correctAnswer.toLowerCase();
    setRevealed(true);
    setAnswers((prev) => [...prev, { wordId: question.wordId, isCorrect }]);
  }, [fillValue, revealed, question]);

  const handleNext = useCallback(() => {
    setSelectedChoice(null);
    setRevealed(false);
    setFillValue('');
    setFillFocused(false);

    if (currentIndex + 1 >= total) {
      submitResults(answers, {
        onSuccess: () => setShowSummary(true),
        onError: () => setShowSummary(true), // show summary even on error
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

            {/* Word / sentence card */}
            {question?.questionType === 'FILL_IN_THE_BLANKS' ? (
              <View style={styles.sentenceCard}>
                <Text style={styles.sentenceText}>
                  {question.contextSentence ?? question.word}
                </Text>
              </View>
            ) : (
              <View style={styles.wordCard}>
                <Text style={styles.wordText}>{question?.definition}</Text>
              </View>
            )}

            {/* Listen button (LISTENING type) */}
            {question?.questionType === 'LISTENING' && (
              <TouchableOpacity style={styles.listenBtn} onPress={handleListen} activeOpacity={0.8}>
                <Ionicons name="volume-high-outline" size={18} color={c.PURPLE} />
                <Text style={styles.listenText}>{t('listen')}</Text>
              </TouchableOpacity>
            )}

            {/* Choices (MULTIPLE_CHOICE / LISTENING) */}
            {question?.questionType !== 'FILL_IN_THE_BLANKS' && (
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

            {/* Fill in the blanks input */}
            {question?.questionType === 'FILL_IN_THE_BLANKS' && !revealed && (
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

            {/* Feedback */}
            {revealed && (
              <>
                <View style={[
                  styles.feedbackRow,
                  answers[answers.length - 1]?.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
                ]}>
                  <Text style={[
                    styles.feedbackLabel,
                    { color: answers[answers.length - 1]?.isCorrect ? '#22C55E' : '#EF4444' },
                  ]}>
                    {answers[answers.length - 1]?.isCorrect ? t('correct') : t('wrong')}
                  </Text>
                  {!answers[answers.length - 1]?.isCorrect && (
                    <Text style={styles.feedbackAnswer}>
                      {t('correctAnswer', { answer: question?.correctAnswer })}
                    </Text>
                  )}
                </View>

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
      <Modal visible={showSummary} transparent animationType="fade">
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
                <Text style={[styles.statNum, { color: '#EF4444' }]}>{total - correctCount}</Text>
                <Text style={styles.statLabel}>{t('wrong_count')}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.finishBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Text style={styles.finishBtnText}>{t('finish')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
