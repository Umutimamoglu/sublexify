import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity, Pressable } from 'react-native';
import Reanimated, { 
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { FlashCardBack } from './FlashCard';
import type { ListWord } from '@/src/types/api';
import { useTranslation } from '@/src/i18n/useTranslation';
import { Text } from '@/src/components/ui/Text';


const stripTr = (text?: string) => text?.replace(/\s*\([^)]+\)\s*$/, '').trim();

export function WordPreviewOverlay({
  word,
  visible,
  onClose,
  c,
  isDark,
  onAddToList,
  onToggleKnown,
  knownIdsSet,
}: {
  word: ListWord | null;
  visible: boolean;
  onClose: () => void;
  c: any;
  isDark: boolean;
  onAddToList?: (wordId: number, wordName: string) => void;
  onToggleKnown?: (wordId: number) => void;
  knownIdsSet?: Set<number>;
}) {
  const { t } = useTranslation('lists');
  const { t: tCommon } = useTranslation('common');
  const { width, height } = useWindowDimensions();
  const [canClose, setCanClose] = useState(false);
  const [localKnown, setLocalKnown] = useState(false);

  const flipProgress = useSharedValue(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const buttonActiveRef = useRef(false);

  // Enable closing after a short delay
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setCanClose(true), 150);
      return () => clearTimeout(timer);
    } else {
      setCanClose(false);
      flipProgress.value = 0;
      setIsFlipped(false);
    }
  }, [visible, flipProgress]);

  useEffect(() => {
    if (word && knownIdsSet) {
      setLocalKnown(knownIdsSet.has(word.id));
    }
  }, [word, knownIdsSet]);

  const cardW = Math.min(width * 0.86, 360);
  const cardH = Math.min(height * 0.55, 460);

  const previewStyles = StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 9999,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bgOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
    },
    cardWrapper: {
      width: cardW,
      height: cardH,
      gap: 10,
    },
    cardListBtn: { position: 'absolute' as const, top: 14, left: 14, width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
    cardKnownBtn: { position: 'absolute' as const, top: 14, right: 14, width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const },
    listBtnText: { color: c.TEXT_S, fontSize: 16 },
    cardOuter: {
      width: cardW,
      height: cardH,
    },
    card: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#ffffff18' : c.BORDER,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 15,
      elevation: 8,
    },
    // Front styles (from ListScreen)
    cardFront: { 
      backgroundColor: c.SURFACE, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 
    },
    cardBigWord: { color: c.TEXT_P, fontSize: 38, fontWeight: '900', textAlign: 'center' },
    diffBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
    diffBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    posBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: c.PURPLE + '22', marginBottom: 8 },
    posBadgeText: { color: c.PURPLE, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    cardExample: { color: c.TEXT_S, fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
    flipHint: { color: c.TEXT_S, fontSize: 11, opacity: 0.5, marginTop: 6 },
    ttsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    cardTtsBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    cardSentenceTtsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, borderRadius: 18, borderWidth: 1, paddingHorizontal: 12 },
    sentenceTtsBtnText: { fontSize: 11, fontWeight: '600' },
    ttsBtnText: { fontSize: 16 },

    // Action buttons row
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    actionBtnText: {
      fontSize: 14,
      fontWeight: '700',
    },

    // FlashCardBack compat styles
    cardBack: { backgroundColor: isDark ? c.SURFACE : '#fcfcfd', flex: 1 },
    cardBackInner: { flex: 1, padding: 20 },
    cardBackWord: { color: c.TEXT_P, fontSize: 24, fontWeight: '900', marginBottom: 12 },
    sectionLabel: { color: c.TEXT_S, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 12, marginBottom: 6 },
    meaningBlock: { marginBottom: 12 },
    meaningDef: { color: c.TEXT_P, fontSize: 14, lineHeight: 20, marginTop: 4 },
    meaningEx: { color: c.TEXT_S, fontSize: 13, fontStyle: 'italic', marginTop: 4, lineHeight: 18 },
    verbGrid: { flexDirection: 'row', gap: 6 },
    verbCell: { flex: 1, backgroundColor: isDark ? '#ffffff0a' : '#f0f0f5', borderRadius: 8, padding: 8, alignItems: 'center' },
    verbLabel: { color: c.TEXT_S, fontSize: 9, fontWeight: '700' },
    verbValue: { color: c.TEXT_P, fontSize: 12, fontWeight: '600', marginTop: 1 },
    phrasalBlock: { marginBottom: 10 },
    phrasalPhrase: { color: c.PURPLE, fontSize: 14, fontWeight: '700' },
    phrasalDef: { color: c.TEXT_P, fontSize: 13, marginTop: 2 },
    phrasalEx: { color: c.TEXT_S, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
    cardFlipBackBtn: { display: 'none' },
    checkText: { fontSize: 14 },
    unenrichedBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    unenrichedIcon: { fontSize: 32 },
    unenrichedText: { color: c.TEXT_S, fontSize: 13, textAlign: 'center' },
  });

  const frontAnimStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` }],
    backfaceVisibility: 'hidden' as const,
  }));
  const backAnimStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` }],
    backfaceVisibility: 'hidden' as const,
  }));

  const doFlip = useCallback(() => {
    if (buttonActiveRef.current) return;
    const next = !isFlipped;
    flipProgress.value = withTiming(next ? 1 : 0, { duration: 350 });
    setIsFlipped(next);
  }, [isFlipped, flipProgress]);

  if (!visible || !word) return null;

  const handleBgPress = () => {
    if (canClose) onClose();
  };

  const handleToggleKnown = () => {
    const next = !localKnown;
    setLocalKnown(next);
    onToggleKnown?.(word.id);
  };

  return (
    <View style={previewStyles.overlay}>
      <Reanimated.View 
        entering={FadeIn.duration(200)} 
        exiting={FadeOut.duration(150)}
        style={StyleSheet.absoluteFill}
      >
        <Pressable style={previewStyles.bgOverlay} onPress={handleBgPress} />
      </Reanimated.View>

      <Reanimated.View 
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={previewStyles.cardWrapper}
      >
        {/* Word card - Flippable */}
        <Pressable style={previewStyles.cardOuter} onPress={doFlip}>
          {/* Front */}
          <Reanimated.View style={[previewStyles.card, previewStyles.cardFront, frontAnimStyle]} pointerEvents={isFlipped ? 'none' : 'auto'}>
            {onAddToList && (
              <TouchableOpacity
                style={[previewStyles.cardListBtn, { borderColor: c.BORDER }]}
                onPress={() => onAddToList(word.id, word.word)}
                onPressIn={() => { buttonActiveRef.current = true; }}
                onPressOut={() => { buttonActiveRef.current = false; }}
                activeOpacity={0.7}
              >
                <Text style={previewStyles.listBtnText}>+</Text>
              </TouchableOpacity>
            )}
            {onToggleKnown && (
              <TouchableOpacity
                style={[previewStyles.cardKnownBtn, {
                  borderColor: localKnown ? c.PURPLE : c.TEXT_S,
                  backgroundColor: localKnown ? c.PURPLE + '22' : 'transparent',
                }]}
                onPress={handleToggleKnown}
                onPressIn={() => { buttonActiveRef.current = true; }}
                onPressOut={() => { buttonActiveRef.current = false; }}
                activeOpacity={0.7}
              >
                <Text style={[previewStyles.checkText, { color: localKnown ? c.PURPLE : c.TEXT_S }]}>✓</Text>
              </TouchableOpacity>
            )}

            <Text style={previewStyles.cardBigWord}>{word.word}</Text>
            <View style={previewStyles.ttsRow}>
              <TouchableOpacity
                style={[previewStyles.cardTtsBtn, { borderColor: c.BORDER }]}
                onPress={() => Speech.speak(word.word, { language: 'en-US' })}
                onPressIn={() => { buttonActiveRef.current = true; }}
                onPressOut={() => { buttonActiveRef.current = false; }}
                activeOpacity={0.7}
              >
                <Text style={previewStyles.ttsBtnText}>🔊</Text>
              </TouchableOpacity>
              {!!stripTr(word.definition?.meanings?.[0]?.example) && (
                <TouchableOpacity
                  style={[previewStyles.cardSentenceTtsBtn, { borderColor: c.BORDER }]}
                  onPress={() => Speech.speak(stripTr(word.definition!.meanings[0].example)!, { language: 'en-US' })}
                  onPressIn={() => { buttonActiveRef.current = true; }}
                  onPressOut={() => { buttonActiveRef.current = false; }}
                  activeOpacity={0.7}
                >
                  <Text style={previewStyles.ttsBtnText}>💬</Text>
                  <Text style={[previewStyles.sentenceTtsBtnText, { color: c.TEXT_S }]}>{tCommon('sentenceTts')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {word.definition?.meanings?.[0] && (
              <>
                {!!word.definition.meanings[0].pos && (
                  <View style={[previewStyles.posBadge, { alignSelf: 'center' }]}>
                    <Text style={previewStyles.posBadgeText}>
                      {word.definition.meanings[0].pos}
                    </Text>
                  </View>
                )}
                <Text style={previewStyles.cardExample} numberOfLines={3}>
                  {stripTr(word.definition.meanings[0].example)}
                </Text>
              </>
            )}
            <Text style={previewStyles.flipHint}>{t('cardFlipHint')}</Text>
          </Reanimated.View>
 
          {/* Back */}
          <FlashCardBack 
            word={word}
            isKnown={localKnown}
            onToggle={handleToggleKnown}
            onButtonPressIn={() => { buttonActiveRef.current = true; }}
            onButtonPressOut={() => { buttonActiveRef.current = false; }}
            styles={previewStyles}
            c={c}
            animStyle={backAnimStyle}
            pointerEvents={isFlipped ? 'auto' : 'none'}
          />
        </Pressable>
      </Reanimated.View>
    </View>
  );
}
