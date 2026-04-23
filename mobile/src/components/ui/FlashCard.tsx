import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useTranslation } from '@/src/i18n/useTranslation';
import type { ListWord } from '@/src/types/api';

const DIFF_COLORS: Record<string, string> = {
  A1: '#22C55E', A2: '#84CC16',
  B1: '#F59E0B', B2: '#F97316',
  C1: '#EF4444', C2: '#9333EA',
};

export function FlashCardBack({
  word,
  isKnown,
  onToggle,
  onButtonPressIn,
  onButtonPressOut,
  styles,
  c,
  animStyle,
  pointerEvents,
}: {
  word: ListWord;
  isKnown: boolean;
  onToggle: () => void;
  onButtonPressIn?: () => void;
  onButtonPressOut?: () => void;
  styles: any;
  c: any;
  animStyle?: any;
  pointerEvents?: 'auto' | 'none';
  scrollEnabled?: boolean;
}) {
  const { t } = useTranslation('lists');
  const def = word.definition;

  return (
    <Reanimated.View style={[styles.card, styles.cardBack, animStyle]} pointerEvents={pointerEvents}>
      <ScrollView style={styles.cardBackInner} showsVerticalScrollIndicator={false} scrollEnabled={scrollEnabled ?? true}>
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
            <Text style={styles.unenrichedText}>{t('notEnriched')}</Text>
          </View>
        ) : (
          <>
            {def.meanings?.map((m, i) => (
              <View key={i} style={styles.meaningBlock}>
                <View style={styles.posBadge}>
                  <Text style={styles.posBadgeText}>{m.pos}</Text>
                </View>
                <Text style={styles.meaningDef}>{m.definition}</Text>
                {!!m.example && <Text style={styles.meaningEx}>{m.example}</Text>}
              </View>
            ))}

            {def.verb_forms && (
              <>
                <Text style={styles.sectionLabel}>{t('verbForms')}</Text>
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

            {def.phrasal_verbs?.length ? (
              <>
                <Text style={styles.sectionLabel}>{t('phrasalVerbs')}</Text>
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

        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.cardKnownBtn, {
          borderColor: isKnown ? c.PURPLE : c.TEXT_S,
          backgroundColor: isKnown ? c.PURPLE + '22' : 'transparent',
        }]}
        onPress={onToggle}
        onPressIn={onButtonPressIn}
        onPressOut={onButtonPressOut}
        activeOpacity={0.7}
      >
        <Text style={[styles.checkText, { color: isKnown ? c.PURPLE : c.TEXT_S }]}>✓</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}
