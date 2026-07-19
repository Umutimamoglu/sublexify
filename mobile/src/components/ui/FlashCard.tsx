import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';
import { useTranslation } from '@/src/i18n/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import type { ListWord } from '@/src/types/api';
import { Text } from '@/src/components/ui/Text';


const DIFF_COLORS: Record<string, string> = {
  A1: '#22C55E', A2: '#84CC16',
  B1: '#F59E0B', B2: '#F97316',
  C1: '#EF4444', C2: '#9333EA',
};

// ─── Note Box ─────────────────────────────────────────────────
function NoteBox({
  note,
  onEditPress,
  onPressIn,
  onPressOut,
  c,
}: {
  note?: string | null;
  onEditPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  c: any;
}) {
  if (note) {
    return (
      <TouchableOpacity
        style={[noteStyles.box, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B55' }]}
        onPress={onEditPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.75}
      >
        <View style={noteStyles.boxHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="document-text" size={14} color="#F59E0B" />
            <Text style={noteStyles.boxLabel}>Notun</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[noteStyles.editHint, { color: '#F59E0B' }]}>Düzenle</Text>
            <Ionicons name="pencil" size={12} color="#F59E0B" />
          </View>
        </View>
        <Text style={[noteStyles.boxText, { color: c.TEXT_P }]}>{note}</Text>
      </TouchableOpacity>
    );
  }

  // No note yet — subtle add prompt
  if (onEditPress) {
    return (
      <TouchableOpacity 
        style={noteStyles.addPrompt} 
        onPress={onEditPress} 
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.6}
      >
        <Ionicons name="add-circle-outline" size={18} color="#F59E0B" />
        <Text style={[noteStyles.addPromptText, { color: '#F59E0B' }]}>Kişisel not ekle</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const noteStyles = StyleSheet.create({
  box: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    marginTop: 14,
    marginBottom: 2,
    gap: 6,
  },
  boxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boxLabel: { fontSize: 12, fontWeight: '800', color: '#F59E0B' },
  editHint: { fontSize: 11, fontWeight: '600' },
  boxText: { fontSize: 14, lineHeight: 20 },
  addPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F59E0B55',
    backgroundColor: '#F59E0B10',
  },
  addPromptText: { fontSize: 13, fontWeight: '700' },
});

// ─── FlashCard Back ───────────────────────────────────────────
export function FlashCardBack({
  word,
  isKnown,
  onToggle,
  onButtonPressIn,
  onButtonPressOut,
  onNoteEdit,
  styles,
  c,
  animStyle,
  pointerEvents,
  scrollEnabled = true,
}: {
  word: ListWord;
  isKnown: boolean;
  onToggle: () => void;
  onButtonPressIn?: () => void;
  onButtonPressOut?: () => void;
  /** Called when user wants to add/edit a note */
  onNoteEdit?: () => void;
  styles: any;
  c: any;
  animStyle?: any;
  pointerEvents?: 'auto' | 'none';
  scrollEnabled?: boolean;
}) {
  const { t } = useTranslation('lists');
  const def = word.definition;

  const content = (
    <>
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
          <Ionicons name="hourglass-outline" size={20} color={c.TEXT_S} style={styles.unenrichedIcon} />
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

      {/* ── Personal Note ────────────────────────── */}
      <NoteBox 
        note={word.note} 
        onEditPress={onNoteEdit} 
        onPressIn={onButtonPressIn}
        onPressOut={onButtonPressOut}
        c={c} 
      />

      <View style={{ height: 80 }} />
    </>
  );

  return (
    <Reanimated.View style={[styles.card, styles.cardBack, animStyle]} pointerEvents={pointerEvents}>
      {scrollEnabled
        ? <ScrollView style={styles.cardBackInner} showsVerticalScrollIndicator={false}>{content}</ScrollView>
        : <View style={styles.cardBackInner}>{content}</View>
      }

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
        <Text style={[styles.checkText, { color: isKnown ? '#34C759' : c.TEXT_S }]}>✓</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}
