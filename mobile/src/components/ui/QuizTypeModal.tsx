import React from 'react';
import { Modal, TouchableOpacity, View, Text, ScrollView, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DIFFICULTIES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const DIFF_COLORS: Record<string, string> = {
  A1: '#34D399', A2: '#4ADE80', B1: '#FBBF24',
  B2: '#FB923C', C1: '#EF4444', C2: '#A855F7',
};
const QUIZ_SIZES = [10, 20, 30, 50, 75, 100];

type Props = {
  visible: boolean;
  // Quiz types
  selectedTypes: Set<string>;
  onToggleType: (type: string) => void;
  // Difficulty
  selectedDifficulties: Set<string>;
  onToggleDifficulty: (diff: string) => void;
  // Known words
  onlyUnknown: boolean;
  onToggleOnlyUnknown: (val: boolean) => void;
  // Size
  quizSize: number;
  onSizeChange: (size: number) => void;
  // Actions
  onClose: () => void;
  onConfirm: () => void;
  // Theme
  styles: any;
  c: any;
};

export function QuizTypeModal({
  visible,
  selectedTypes,
  onToggleType,
  selectedDifficulties,
  onToggleDifficulty,
  onlyUnknown,
  onToggleOnlyUnknown,
  quizSize,
  onSizeChange,
  onClose,
  onConfirm,
  styles,
  c,
}: Props) {
  const quizTypes = [
    { id: 'MULTIPLE_CHOICE', label: 'Çoktan Seçmeli', icon: 'list-outline' },
    { id: 'FILL_IN_THE_BLANKS', label: 'Boşluk Doldurma', icon: 'create-outline' },
    { id: 'LISTENING', label: 'Dinleme', icon: 'volume-medium-outline' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.mkOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.mkSheet} activeOpacity={1}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

            <Text style={styles.mkTitle}>Pratik Ayarları</Text>

            {/* ── Difficulty ── */}
            <Text style={[styles.mkWarningText, { marginTop: 14, marginBottom: 8, fontWeight: '700', color: c.TEXT_P }]}>
              Zorluk Seviyesi
            </Text>
            <Text style={[styles.mkWarningText, { marginBottom: 10, fontSize: 12 }]}>
              Seçilmezse tüm seviyeler dahil edilir.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {DIFFICULTIES.map((diff) => {
                const active = selectedDifficulties.has(diff);
                const color = DIFF_COLORS[diff];
                return (
                  <TouchableOpacity
                    key={diff}
                    onPress={() => onToggleDifficulty(diff)}
                    activeOpacity={0.75}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 9,
                      borderRadius: 20, borderWidth: 1.5,
                      borderColor: active ? color : c.BORDER,
                      backgroundColor: active ? color + '22' : c.SURFACE2,
                    }}
                  >
                    <Text style={{ color: active ? color : c.TEXT_S, fontWeight: '700', fontSize: 13 }}>
                      {diff}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Divider ── */}
            <View style={{ height: 1, backgroundColor: c.BORDER, marginBottom: 16 }} />

            {/* ── Question Count ── */}
            <Text style={[styles.mkWarningText, { marginBottom: 10, fontWeight: '700', color: c.TEXT_P }]}>
              Soru Sayısı
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {QUIZ_SIZES.map((s) => {
                const active = quizSize === s;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => onSizeChange(s)}
                    activeOpacity={0.75}
                    style={{
                      paddingHorizontal: 18, paddingVertical: 9,
                      borderRadius: 20, borderWidth: 1.5,
                      borderColor: active ? c.PURPLE : c.BORDER,
                      backgroundColor: active ? c.PURPLE + '22' : c.SURFACE2,
                    }}
                  >
                    <Text style={{ color: active ? c.PURPLE : c.TEXT_S, fontWeight: '700', fontSize: 13 }}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Divider ── */}
            <View style={{ height: 1, backgroundColor: c.BORDER, marginBottom: 16 }} />

            {/* ── Quiz Types ── */}
            <Text style={[styles.mkWarningText, { marginBottom: 10, fontWeight: '700', color: c.TEXT_P }]}>
              Soru Türleri
            </Text>
            <View style={{ gap: 10, marginBottom: 16 }}>
              {quizTypes.map((qt) => {
                const checked = selectedTypes.has(qt.id);
                return (
                  <TouchableOpacity
                    key={qt.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      padding: 14, borderRadius: 12, borderWidth: 1,
                      borderColor: checked ? c.PURPLE : c.BORDER,
                      backgroundColor: checked ? c.PURPLE + '15' : c.SURFACE2,
                    }}
                    onPress={() => onToggleType(qt.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={checked ? c.PURPLE : c.TEXT_S}
                    />
                    <Text style={{ flex: 1, color: c.TEXT_P, fontSize: 15, fontWeight: '600' }}>
                      {qt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Divider ── */}
            <View style={{ height: 1, backgroundColor: c.BORDER, marginBottom: 16 }} />

            {/* ── Only Unknown Toggle ── */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingVertical: 6, marginBottom: 20,
            }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: c.TEXT_P, fontSize: 15, fontWeight: '600' }}>
                  Sadece bilinmeyenler
                </Text>
                <Text style={{ color: c.TEXT_S, fontSize: 12, marginTop: 2 }}>
                  Öğrenilmiş kelimeler dahil edilmez
                </Text>
              </View>
              <Switch
                value={onlyUnknown}
                onValueChange={onToggleOnlyUnknown}
                trackColor={{ false: c.BORDER, true: c.PURPLE + '80' }}
                thumbColor={onlyUnknown ? c.PURPLE : (Platform.OS === 'android' ? c.SURFACE2 : '#fff')}
              />
            </View>

            {/* ── Buttons ── */}
            <View style={styles.mkBtnRow}>
              <TouchableOpacity style={styles.mkCancelBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.mkCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mkConfirmBtn, selectedTypes.size === 0 && { opacity: 0.5 }]}
                onPress={onConfirm}
                disabled={selectedTypes.size === 0}
                activeOpacity={0.85}
              >
                <Text style={styles.mkConfirmText}>Başla 🚀</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
