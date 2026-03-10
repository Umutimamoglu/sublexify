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
  Modal,
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
  type SharedValue,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useListDetail, useLists, useRemoveWordFromList, useCreateSubListFromUnknown } from '@/src/api/queries/lists.queries';
import { useKnownWords } from '@/src/api/queries/user.queries';
import { useMarkKnown, useMarkKnownBatch } from '@/src/api/queries/words.queries';
import { Ionicons } from '@expo/vector-icons';
import AddToListModal from '@/src/components/ui/AddToListModal';
import type { ListWord, Difficulty } from '@/src/types/api';

type Palette = {
  BG: string; SURFACE: string; SURFACE2: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
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
function makeStyles(c: Palette, isDark: boolean, sw: number, sh: number, isTablet: boolean) {
  const pad = isTablet ? 32 : 16;
  const cardW = Math.min(sw - 32, 500);
  const cardH = Math.min(sh * 0.72, 600);

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: pad, paddingVertical: 12, gap: 10 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center' },
    backText: { color: c.TEXT_P, fontSize: 18 },
    title: { flex: 1, color: c.TEXT_P, fontSize: 17, fontWeight: '700' },
    toggleRow: { flexDirection: 'row', backgroundColor: c.SURFACE2, borderRadius: 10, padding: 3, gap: 2 },
    toggleBtn: { width: 34, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    toggleActive: { backgroundColor: c.PURPLE },
    toggleIcon: { fontSize: 15 },

    // Study button (header)
    studyBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderColor: c.PURPLE, backgroundColor: c.PURPLE + '15' },
    studyBtnText: { color: c.PURPLE, fontSize: 12, fontWeight: '700' as const },

    // Chips
    chipScrollWrap: { flexShrink: 0, flexGrow: 0 },
    chipScroll: { paddingHorizontal: pad, paddingBottom: 12, flexGrow: 0 },
    chip: { width: 52, height: 34, borderRadius: 20, marginRight: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    chipText: { fontSize: 12, fontWeight: '700' },

    // Separator
    separator: { height: 1, backgroundColor: c.BORDER, marginHorizontal: pad },

    // List view row
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: pad, paddingVertical: 13 },
    rowInfo: { flex: 1 },
    rowWord: { color: c.TEXT_P, fontSize: 16, fontWeight: '700' },
    rowMeaning: { color: c.TEXT_S, fontSize: 13, marginTop: 3, lineHeight: 18 },
    checkBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    checkText: { fontSize: 14, fontWeight: '900' },

    // Flashcard container
    flashOuter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cardStack: { width: cardW, height: cardH },

    // Card (front & back share base)
    card: { width: cardW, height: cardH, borderRadius: 20, position: 'absolute', borderWidth: 1, borderColor: isDark ? '#ffffff18' : c.BORDER, overflow: 'hidden', backfaceVisibility: 'hidden' },

    // Front
    cardFront: { backgroundColor: c.SURFACE, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
    cardBigWord: { color: c.TEXT_P, fontSize: 44, fontWeight: '900', textAlign: 'center' },
    posBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: c.PURPLE + '22' },
    posBadgeText: { color: c.PURPLE, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    cardExample: { color: c.TEXT_S, fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
    flipHint: { color: c.TEXT_S, fontSize: 11, opacity: 0.5, marginTop: 6 },
    cardKnownBtn: { position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    cardListBtn: { position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    cardTtsBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 8 },

    // Back
    cardBack: { backgroundColor: c.SURFACE2 },
    cardBackInner: { flex: 1, padding: 20 },
    cardBackWord: { color: c.TEXT_P, fontSize: 20, fontWeight: '800', marginBottom: 14 },
    sectionLabel: { color: c.TEXT_S, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 14, marginBottom: 6 },
    meaningBlock: { marginBottom: 12 },
    meaningDef: { color: c.TEXT_P, fontSize: 13, lineHeight: 19, marginTop: 3 },
    meaningEx: { color: c.TEXT_S, fontSize: 12, fontStyle: 'italic', marginTop: 3, lineHeight: 17 },
    verbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    verbCell: { minWidth: '47%', flexGrow: 1, backgroundColor: c.SURFACE, borderRadius: 8, padding: 8, alignItems: 'center' },
    verbLabel: { color: c.TEXT_S, fontSize: 10, fontWeight: '700' },
    verbValue: { color: c.TEXT_P, fontSize: 12, fontWeight: '600', marginTop: 2, textAlign: 'center' },
    phrasalBlock: { marginBottom: 10 },
    phrasalPhrase: { color: c.PURPLE, fontSize: 13, fontWeight: '700' },
    phrasalDef: { color: c.TEXT_P, fontSize: 13, marginTop: 2 },
    phrasalEx: { color: c.TEXT_S, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
    cardFlipBackBtn: { position: 'absolute', top: 14, right: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: c.SURFACE },
    cardFlipBackText: { color: c.TEXT_S, fontSize: 11 },

    // Difficulty badge (back card)
    diffBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
    diffBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

    // Unenriched fallback (back card)
    unenrichedBox: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, paddingTop: 40 },
    unenrichedIcon: { fontSize: 32 },
    unenrichedText: { color: c.TEXT_S, fontSize: 13, textAlign: 'center' as const },

    // Swipe stamps
    knownStamp: {
      position: 'absolute', top: 28, left: 20, zIndex: 10,
      borderWidth: 3, borderColor: '#22C55E', borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 6,
      transform: [{ rotate: '-15deg' }],
    },
    knownStampText: { color: '#22C55E', fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },
    unknownStamp: {
      position: 'absolute', top: 28, right: 20, zIndex: 10,
      borderWidth: 3, borderColor: '#EF4444', borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 6,
      transform: [{ rotate: '15deg' }],
    },
    unknownStampText: { color: '#EF4444', fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },

    // Progress
    progressText: { color: c.TEXT_S, fontSize: 13, marginTop: 14, textAlign: 'center' },

    // Add-to-list button on row
    listBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: c.BORDER, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    listBtnText: { color: c.TEXT_S, fontSize: 16 },

    // TTS button on row
    ttsBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: c.BORDER, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    ttsBtnText: { fontSize: 12 },

    // Remove button on row
    removeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EF444418', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    removeBtnText: { fontSize: 13 },

    // Bottom CTA
    ctaBar: {
      paddingHorizontal: pad,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#ffffff0f' : '#e0e0ea',
      flexDirection: 'row' as const,
      gap: 10,
    },
    ctaBtn: {
      flex: 1,
      backgroundColor: c.PURPLE,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      gap: 6,
    },
    ctaBtnOutline: {
      backgroundColor: c.PURPLE + '15',
      borderWidth: 1.5,
      borderColor: c.PURPLE,
    },
    ctaBtnDis: { opacity: 0.4 },
    ctaText: { color: '#fff', fontSize: 13, fontWeight: '700' as const },
    ctaTextOutline: { color: c.PURPLE, fontSize: 13, fontWeight: '700' as const },

    // Swipe-to-reveal actions
    swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
    swipeAction: { width: 68, alignItems: 'center', justifyContent: 'center' },
    swipeActionAdd: { backgroundColor: c.PURPLE },
    swipeActionTts: { backgroundColor: c.SURFACE2 },
    swipeActionDel: { backgroundColor: '#EF4444' },

    // Mark as Known — floating glass button
    glassBtn: {
      position: 'absolute' as const,
      left: pad,
      right: pad,
      borderRadius: 20,
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(200,170,255,0.35)' : 'rgba(139,92,246,0.40)',
      backgroundColor: isDark ? 'rgba(100,60,220,0.22)' : 'rgba(139,92,246,0.14)',
      shadowColor: c.PURPLE,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 20,
      elevation: 10,
    },
    glassBtnInner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      paddingVertical: 15,
      paddingHorizontal: 20,
    },
    glassBtnHighlight: {
      position: 'absolute' as const,
      top: 0, left: 0, right: 0,
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.75)',
    },
    glassBtnText: {
      color: isDark ? 'rgba(220,200,255,0.95)' : c.PURPLE,
      fontSize: 14,
      fontWeight: '700' as const,
      letterSpacing: 0.2,
    },

    // Mark Known Modal
    mkOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' as const },
    mkSheet: {
      backgroundColor: c.SURFACE,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      gap: 16,
    },
    mkTitle: { color: c.TEXT_P, fontSize: 17, fontWeight: '800' as const },
    mkLevelRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
    mkLevelBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    mkLevelBadgeText: { fontSize: 13, fontWeight: '700' as const },
    mkWarningBox: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: 10,
      backgroundColor: '#F59E0B18',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: '#F59E0B44',
    },
    mkWarningText: { flex: 1, color: c.TEXT_S, fontSize: 13, lineHeight: 19 },
    mkBtnRow: { flexDirection: 'row' as const, gap: 10 },
    mkCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: c.SURFACE2, alignItems: 'center' as const },
    mkConfirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: c.PURPLE, alignItems: 'center' as const },
    mkCancelText: { color: c.TEXT_S, fontWeight: '600' as const, fontSize: 15 },
    mkConfirmText: { color: '#fff', fontWeight: '700' as const, fontSize: 15 },

    // Empty/loading
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyText: { color: c.TEXT_S, fontSize: 15 },
    emptyIcon: { fontSize: 36 },
  });
}

// ─── MarkKnownModal ───────────────────────────────────────────
type Styles = ReturnType<typeof makeStyles>;

function MarkKnownModal({
  visible,
  levels,
  wordCount,
  onClose,
  onConfirm,
  loading,
  styles,
  c,
}: {
  visible: boolean;
  levels: string[];
  wordCount: number;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  styles: Styles;
  c: Palette;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.mkOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.mkSheet} activeOpacity={1}>
          {/* Seviye badge'leri */}
          <View style={styles.mkLevelRow}>
            {levels.map((lv) => (
              <View key={lv} style={[styles.mkLevelBadge, { backgroundColor: DIFF_COLORS[lv] + '33' }]}>
                <Text style={[styles.mkLevelBadgeText, { color: DIFF_COLORS[lv] }]}>{lv}</Text>
              </View>
            ))}
          </View>

          {/* Başlık */}
          <Text style={styles.mkTitle}>
            {wordCount} kelime bilinen olarak işaretlenecek
          </Text>

          {/* Uyarı */}
          <View style={styles.mkWarningBox}>
            <Ionicons name="warning-outline" size={18} color="#F59E0B" />
            <Text style={styles.mkWarningText}>
              Bu kelimeler kalıcı olarak Bilinen Kelimeler listenize eklenecek.
              İşlem geri alınamaz — bu listeden ayrıca çıkarılamaz.
            </Text>
          </View>

          {/* Butonlar */}
          <View style={styles.mkBtnRow}>
            <TouchableOpacity style={styles.mkCancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.mkCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mkConfirmBtn, loading && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.mkConfirmText}>Onayla</Text>
              }
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── QuizTypeModal ────────────────────────────────────────────
function QuizTypeModal({
  visible,
  selectedTypes,
  onToggleType,
  onClose,
  onConfirm,
  styles,
  c,
}: {
  visible: boolean;
  selectedTypes: Set<string>;
  onToggleType: (type: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  styles: Styles;
  c: Palette;
}) {
  const types = [
    { id: 'MULTIPLE_CHOICE', label: 'Çoktan Seçmeli' },
    { id: 'FILL_IN_THE_BLANKS', label: 'Boşluk Doldurma' },
    { id: 'LISTENING', label: 'Dinleme' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.mkOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.mkSheet} activeOpacity={1}>
          <Text style={styles.mkTitle}>Pratik Türlerini Seçin</Text>
          <Text style={[styles.mkWarningText, { marginBottom: 10 }]}>En az bir pratik türü seçmelisiniz.</Text>

          <View style={{ gap: 12, marginBottom: 10 }}>
            {types.map((t) => {
              const checked = selectedTypes.has(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    padding: 16, borderRadius: 12, borderWidth: 1,
                    borderColor: checked ? c.PURPLE : c.BORDER,
                    backgroundColor: checked ? c.PURPLE + '15' : c.SURFACE2,
                  }}
                  onPress={() => onToggleType(t.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={checked ? c.PURPLE : c.TEXT_S} />
                  <Text style={{ flex: 1, color: c.TEXT_P, fontSize: 16, fontWeight: '600' }}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
              <Text style={styles.mkConfirmText}>Başla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── WordRow ──────────────────────────────────────────────────

function WordRow({
  word,
  isKnown,
  onToggle,
  styles,
  c,
}: {
  word: ListWord;
  isKnown: boolean;
  onToggle: () => void;
  styles: Styles;
  c: Palette;
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
    </View>
  );
}
const ACTION_BTN_SIZE = 46; // Buton boyutu
const ACTION_BTN_GAP = 10;  // Butonlar arası boşluk
const ACTION_BTN_TOTAL_WIDTH = ACTION_BTN_SIZE + ACTION_BTN_GAP;

const actionStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center', // Stretch yerine center kullanıyoruz, böylece blok olmazlar
    height: '100%',
    paddingRight: 16, // Sağ kenardan boşluk
    gap: ACTION_BTN_GAP,
  },
  btn: {
    width: ACTION_BTN_SIZE,
    height: ACTION_BTN_SIZE,
    borderRadius: 14, // iOS tarzı yumuşak köşe (squircle)
    alignItems: 'center',
    justifyContent: 'center',
    // Premium yüzen hissiyat için hafif gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3, // Android gölgesi
  },
});

function RightActions({
  progress,
  onAddToList,
  onTts,
  onRemove,
  onClose,
  styles,
  c,
}: {
  progress: SharedValue<number>;
  onAddToList: () => void;
  onTts: () => void;
  onRemove?: () => void;
  onClose: () => void;
  styles: Styles; // Orijinal stilleri tip hatası almamak için tutuyoruz ama kendi stillerimizi kullanacağız
  c: Palette;
}) {
  const count = onRemove ? 3 : 2;

  // Animasyonları yeni boyutlara ve boşluklara göre ayarladık
  const addStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [count * ACTION_BTN_TOTAL_WIDTH, 0], Extrapolation.CLAMP) }],
  }));
  const ttsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [(count - 1) * ACTION_BTN_TOTAL_WIDTH, 0], Extrapolation.CLAMP) }],
  }));
  const delStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [ACTION_BTN_TOTAL_WIDTH, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={actionStyles.container}>
      {/* 1. Ekleme Butonu (Primary Renk) */}
      <Reanimated.View style={addStyle}>
        <TouchableOpacity
          style={[actionStyles.btn, { backgroundColor: c.PURPLE }]}
          onPress={() => { onClose(); onAddToList(); }}
          activeOpacity={0.7}
        >
          <Ionicons name="bookmark" size={20} color="#fff" />
        </TouchableOpacity>
      </Reanimated.View>

      {/* 2. Seslendirme Butonu (Soft Arka Plan) */}
      <Reanimated.View style={ttsStyle}>
        <TouchableOpacity
          style={[actionStyles.btn, { backgroundColor: c.SURFACE2, borderWidth: 1, borderColor: c.BORDER }]}
          onPress={() => { onClose(); onTts(); }}
          activeOpacity={0.7}
        >
          <Ionicons name="volume-high" size={22} color={c.TEXT_P} />
        </TouchableOpacity>
      </Reanimated.View>

      {/* 3. Silme Butonu (Kırmızı) - Eğer onRemove gönderilmişse */}
      {!!onRemove && (
        <Reanimated.View style={delStyle}>
          <TouchableOpacity
            style={[actionStyles.btn, { backgroundColor: '#EF4444' }]}
            onPress={() => { onClose(); onRemove(); }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash" size={20} color="#fff" />
          </TouchableOpacity>
        </Reanimated.View>
      )}
    </View>
  );
}

// ─── SwipeableWordRow ─────────────────────────────────────────
function SwipeableWordRow({
  word,
  isKnown,
  onToggle,
  onAddToList,
  onRemove,
  hintDelay,
  styles,
  c,
}: {
  word: ListWord;
  isKnown: boolean;
  onToggle: () => void;
  onAddToList: () => void;
  onRemove?: () => void;
  hintDelay?: number;
  styles: Styles;
  c: Palette;
}) {
  const swipeRef = useRef<any>(null);
  const removeAnim = useSharedValue(1);

  // Swipe hint: actually open the swipeable to reveal buttons, then close
  useEffect(() => {
    if (hintDelay == null) return;
    const openTimer = setTimeout(() => { swipeRef.current?.openRight(); }, hintDelay);
    const closeTimer = setTimeout(() => { swipeRef.current?.close(); }, hintDelay + 800);
    return () => { clearTimeout(openTimer); clearTimeout(closeTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: removeAnim.value,
  }));

  const handleDelete = useCallback(() => {
    console.log('[handleDelete] called, onRemove:', !!onRemove);
    if (!onRemove) return;
    try {
      swipeRef.current?.close();
      // Fade out animation; call onRemove via setTimeout after animation completes
      removeAnim.value = withTiming(0, { duration: 260, easing: Easing.inOut(Easing.ease) });
      setTimeout(() => {
        console.log('[handleDelete] setTimeout fired, calling onRemove');
        onRemove();
      }, 290);
    } catch (e) {
      console.error('[handleDelete] error:', e);
      onRemove(); // fallback: remove without animation
    }
  }, [onRemove, removeAnim]);

  const renderRightActions = (progress: SharedValue<number>) => (
    <RightActions
      progress={progress}
      onAddToList={onAddToList}
      onTts={() => { Speech.stop(); Speech.speak(word.word, { language: 'en-US' }); }}
      onRemove={onRemove ? handleDelete : undefined}
      onClose={() => swipeRef.current?.close()}
      styles={styles}
      c={c}
    />
  );

  return (
    <Reanimated.View style={containerStyle}>
      <ReanimatedSwipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        friction={2}
        overshootRight={false}
      >
        <WordRow
          word={word}
          isKnown={isKnown}
          onToggle={onToggle}
          styles={styles}
          c={c}
        />
      </ReanimatedSwipeable>
    </Reanimated.View>
  );
}

// ─── FlashCardBack ────────────────────────────────────────────
function FlashCardBack({
  word,
  isKnown,
  onToggle,
  onFlipBack,
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
  onFlipBack: () => void;
  onButtonPressIn: () => void;
  onButtonPressOut: () => void;
  styles: Styles;
  c: Palette;
  animStyle: any;
  pointerEvents: 'auto' | 'none';
}) {
  const { t } = useTranslation('lists');
  const def = word.definition;

  return (
    <Reanimated.View style={[styles.card, styles.cardBack, animStyle]} pointerEvents={pointerEvents}>
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
            <Text style={styles.unenrichedText}>{t('notEnriched')}</Text>
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

            {/* Phrasal Verbs */}
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

        {/* Butonun ScrollView içeriğinin üstüne binmemesi için alt boşluk */}
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

// ─── Main Screen ──────────────────────────────────────────────
export default function ListScreen({ listId }: { listId: number }) {
  const router = useRouter();
  const { t } = useTranslation('lists');
  const { t: tCommon } = useTranslation('common');
  const { t: tStudy } = useTranslation('study');
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { isTablet } = useResponsive();
  const { width, height } = useWindowDimensions();
  const c = useMemo<Palette>(() => ({
    BG: theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surfaceSubtle,
    TEXT_P: theme.colors.textPrimary,
    TEXT_S: theme.colors.textSecondary,
    BORDER: theme.colors.borderDefault,
    PURPLE: theme.colors.primary,
  }), [theme]);

  const styles = useMemo(() => makeStyles(c, isDark, width, height, isTablet), [c, isDark, width, height, isTablet]);

  // ─── Data ─────────────────────────────────────────────────
  const isKnownList = listId === -1;
  const { data: allLists = [] } = useLists();
  const isSystemList = useMemo(() => allLists.some((l) => l.id === listId && l.isSystem), [allLists, listId]);
  const { data: list, isLoading: listLoading } = useListDetail(listId);
  const { data: knownWordsData = [], isLoading: knownLoading } = useKnownWords();
  const { mutate: toggleKnown } = useMarkKnown();
  const { mutate: removeWord } = useRemoveWordFromList();
  const { mutate: generateSubList, isPending: generating } = useCreateSubListFromUnknown();
  const { mutate: markKnownBatch, isPending: marking } = useMarkKnownBatch();

  // listId=-1 için knownWordsData'yı ListDetailDTO formatına çevir
  const knownWordsAsDetail = useMemo<typeof list>(() => {
    if (!isKnownList) return undefined;
    return {
      id: -1,
      name: t('knownWords'),
      words: knownWordsData as any as ListWord[],
      createdAt: new Date().toISOString(),
    };
  }, [isKnownList, knownWordsData, t]);

  const effectiveList = isKnownList ? knownWordsAsDetail : list;
  const isLoading = isKnownList ? knownLoading : listLoading;

  // ─── State ────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [selectedQuizTypes, setSelectedQuizTypes] = useState<Set<string>>(new Set(['MULTIPLE_CHOICE', 'FILL_IN_THE_BLANKS', 'LISTENING']));
  const [cardIndex, setCardIndex] = useState(0);
  const [knownIds, setKnownIds] = useState<Set<number>>(new Set());
  const [addModal, setAddModal] = useState<{ wordId: number; wordName: string } | null>(null);
  const [isFlippedState, setIsFlippedState] = useState(false);
  const knownInitialized = useRef(false);
  const hintShown = useRef(false);

  // Mark hint as shown after enough time for all 3 rows to complete
  useEffect(() => {
    const timer = setTimeout(() => { hintShown.current = true; }, 2200);
    return () => clearTimeout(timer);
  }, []);

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
    if (selectedLevels.size === 0) return effectiveList.words;
    return effectiveList.words.filter((w) => w.difficulty && selectedLevels.has(w.difficulty));
  }, [effectiveList?.words, selectedLevels]);

  // Reset card index on filter change
  useEffect(() => { setCardIndex(0); }, [selectedLevels]);

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
  const handleRemove = useCallback((wordId: number) => {
    removeWord({ listId, wordId });
  }, [removeWord, listId]);

  // ─── Mark known batch ─────────────────────────────────────
  const wordsToMark = useMemo(
    () => (effectiveList?.words ?? []).filter(
      (w) => w.difficulty && selectedLevels.has(w.difficulty) && !knownIds.has(w.id),
    ),
    [effectiveList?.words, selectedLevels, knownIds],
  );

  const handleMarkKnown = useCallback(() => {
    const ids = wordsToMark.map((w) => w.id);
    if (ids.length === 0) { setShowMarkModal(false); return; }
    markKnownBatch(ids, {
      onSuccess: () => {
        setShowMarkModal(false);
        setSelectedLevels(new Set());
        setKnownIds((prev) => new Set([...prev, ...ids]));
      },
    });
  }, [wordsToMark, markKnownBatch]);

  // ─── Generate sub-list from unknowns ─────────────────────
  // Tüm liste kelimeleri üzerinden (filtreden bağımsız) — generateSubList zaten tüm listeyi işliyor
  const unknownCount = useMemo(
    () => (effectiveList?.words ?? []).filter((w) => !knownIds.has(w.id)).length,
    [effectiveList?.words, knownIds],
  );

  const handleGenerateSubList = useCallback(() => {
    Alert.alert(
      t('subListTitle'),
      t('subListMessage', { count: unknownCount }),
      [
        { text: tCommon('actions.cancel'), style: 'cancel' },
        {
          text: tCommon('actions.create'), onPress: () => generateSubList(listId, {
            onSuccess: (newList) => Alert.alert(tCommon('success'), t('subListCreated', { name: newList.name })),
          })
        },
      ],
    );
  }, [generateSubList, listId, unknownCount, t, tCommon]);

  // ─── Quiz Type Selection ───────────────────────────────────
  const handleToggleQuizType = useCallback((type: string) => {
    setSelectedQuizTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleStartStudy = useCallback(() => {
    setShowQuizModal(false);
    const typesStr = Array.from(selectedQuizTypes).join(',');
    router.push(`/study/${listId}?types=${typesStr}` as any);
  }, [listId, selectedQuizTypes, router]);

  // ─── Flashcard animations (Reanimated 4 + Gesture Handler) ──
  const cardX = useSharedValue(0);
  const cardY = useSharedValue(0);
  const flipProgress = useSharedValue(0);
  const isFlipped = useSharedValue(false);
  const hapticFired = useSharedValue(false);
  const totalSV = useSharedValue(filteredWords.length);
  const indexSV = useSharedValue(cardIndex);
  const buttonActiveRef = useRef(false);

  useEffect(() => { totalSV.value = filteredWords.length; }, [filteredWords.length]);
  useEffect(() => { indexSV.value = cardIndex; }, [cardIndex]);

  // Reset flip when card changes
  useEffect(() => {
    flipProgress.value = 0;
    isFlipped.value = false;
    setIsFlippedState(false);
  }, [cardIndex]);

  const triggerLight = useCallback(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), []);
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
    if (buttonActiveRef.current) return;
    const next = !isFlipped.value;
    isFlipped.value = next;
    flipProgress.value = withTiming(next ? 1 : 0, { duration: 380, easing: Easing.inOut(Easing.ease) });
    setIsFlippedState(next);
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
        const goLeft = e.velocityX < -200 ? true : e.velocityX > 200 ? false : e.translationX < 0;
        const total = totalSV.value;
        const cur = indexSV.value;
        // sola = ileri (cur+1), sağa = geri (cur-1)
        const nextIdx = goLeft ? (cur < total - 1 ? cur + 1 : -1) : (cur > 0 ? cur - 1 : -1);
        runOnJS(triggerMedium)();
        if (nextIdx >= 0) {
          const exitX = goLeft ? -width * 1.5 : width * 1.5;
          const enterX = goLeft ? width * 1.5 : -width * 1.5;
          cardX.value = withTiming(exitX, { duration: 200, easing: Easing.in(Easing.ease) }, () => {
            flipProgress.value = 0;
            isFlipped.value = false;
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
        <ActivityIndicator color={c.PURPLE} size="large" />
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
          {!isKnownList && !isSystemList && (
            <TouchableOpacity
              style={styles.studyBtn}
              onPress={() => setShowQuizModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="school-outline" size={13} color={c.PURPLE} />
              <Text style={styles.studyBtnText}>{tStudy('studyList')}</Text>
            </TouchableOpacity>
          )}
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
            const active = f === 'all' ? selectedLevels.size === 0 : selectedLevels.has(f);
            const color = DIFF_COLORS[f];
            return (
              <TouchableOpacity
                key={f}
                style={[styles.chip, { borderColor: color, backgroundColor: active ? color + '33' : 'transparent' }]}
                onPress={() => {
                  if (f === 'all') {
                    setSelectedLevels(new Set());
                  } else {
                    setSelectedLevels((prev) => {
                      const next = new Set(prev);
                      if (next.has(f)) { next.delete(f); } else { next.add(f); }
                      return next;
                    });
                  }
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, { color: active ? color : c.TEXT_S }]}>
                  {f === 'all' ? tCommon('actions.all') : f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filteredWords.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>{t('noWordsAtLevel')}</Text>
          </View>
        ) : viewMode === 'list' ? (
          /* ── LIST VIEW ──────────────────────────────────── */
          <FlatList
            data={filteredWords}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
              <SwipeableWordRow
                word={item}
                isKnown={knownIds.has(item.id)}
                onToggle={() => handleToggle(item.id)}
                onAddToList={() => setAddModal({ wordId: item.id, wordName: item.word })}
                onRemove={!isKnownList && !isSystemList ? () => handleRemove(item.id) : undefined}
                hintDelay={!hintShown.current && index < 3 ? 700 + index * 200 : undefined}
                styles={styles}
                c={c}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={() => <View style={{ height: 16 }} />}
          />
        ) : (
          /* ── FLASHCARD VIEW ──────────────────────────────── */
          <View style={styles.flashOuter}>
            {currentWord && (
              <GestureDetector gesture={cardGesture}>
                <Reanimated.View style={[styles.cardStack, cardContainerStyle]}>

                  {/* Front */}
                  <Reanimated.View style={[styles.card, styles.cardFront, frontAnimStyle]} pointerEvents={isFlippedState ? 'none' : 'auto'}>
                    <Text style={styles.cardBigWord}>{currentWord.word}</Text>
                    <TouchableOpacity
                      style={[styles.cardTtsBtn, { borderColor: c.BORDER }]}
                      onPress={() => { Speech.stop(); Speech.speak(currentWord.word, { language: 'en-US' }); }}
                      onPressIn={() => { buttonActiveRef.current = true; }}
                      onPressOut={() => { buttonActiveRef.current = false; }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.ttsBtnText}>🔊</Text>
                    </TouchableOpacity>
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
                    <Text style={styles.flipHint}>{t('cardFlipHint')}</Text>
                    <TouchableOpacity
                      style={[styles.cardListBtn, { borderColor: c.BORDER }]}
                      onPress={() => setAddModal({ wordId: currentWord.id, wordName: currentWord.word })}
                      onPressIn={() => { buttonActiveRef.current = true; }}
                      onPressOut={() => { buttonActiveRef.current = false; }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.listBtnText, { fontSize: 16 }]}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardKnownBtn, {
                        borderColor: knownIds.has(currentWord.id) ? c.PURPLE : c.TEXT_S,
                        backgroundColor: knownIds.has(currentWord.id) ? c.PURPLE + '22' : 'transparent',
                      }]}
                      onPress={() => handleToggle(currentWord.id)}
                      onPressIn={() => { buttonActiveRef.current = true; }}
                      onPressOut={() => { buttonActiveRef.current = false; }}
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
                    onButtonPressIn={() => { buttonActiveRef.current = true; }}
                    onButtonPressOut={() => { buttonActiveRef.current = false; }}
                    styles={styles}
                    c={c}
                    animStyle={backAnimStyle}
                    pointerEvents={isFlippedState ? 'auto' : 'none'}
                  />
                </Reanimated.View>
              </GestureDetector>
            )}

            <Text style={styles.progressText}>
              {cardIndex + 1} / {filteredWords.length}
            </Text>
          </View>
        )}

        {/* ── Unified footer CTA ───────────────────────────── */}
        {!isKnownList && !isSystemList && viewMode === 'list' && (selectedLevels.size > 0 || unknownCount > 0) && (
          <View style={styles.ctaBar}>
            {/* Sol: Bilinen olarak işaretle — sadece seviye seçiliyse */}
            {selectedLevels.size > 0 && (
              <TouchableOpacity
                style={[styles.ctaBtn, styles.ctaBtnOutline]}
                onPress={() => setShowMarkModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color={c.PURPLE} />
                <Text style={styles.ctaTextOutline} numberOfLines={1}>
                  {[...selectedLevels].sort().join(' · ')} → Bilinen
                </Text>
              </TouchableOpacity>
            )}

            {/* Sağ: Alt-liste oluştur — bilinmeyen kelime varsa */}
            {unknownCount > 0 && (
              <TouchableOpacity
                style={[styles.ctaBtn, generating && styles.ctaBtnDis]}
                onPress={handleGenerateSubList}
                disabled={generating}
                activeOpacity={0.85}
              >
                {generating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.ctaText} numberOfLines={1}>
                    {t('createSubListCta', { count: unknownCount })}
                  </Text>
                }
              </TouchableOpacity>
            )}
          </View>
        )}

      </SafeAreaView>

      <AddToListModal
        visible={!!addModal}
        wordId={addModal?.wordId ?? 0}
        wordName={addModal?.wordName ?? ''}
        onClose={() => setAddModal(null)}
      />

      <MarkKnownModal
        visible={showMarkModal}
        levels={[...selectedLevels].sort()}
        wordCount={wordsToMark.length}
        onClose={() => setShowMarkModal(false)}
        onConfirm={handleMarkKnown}
        loading={marking}
        styles={styles}
        c={c}
      />

      <QuizTypeModal
        visible={showQuizModal}
        selectedTypes={selectedQuizTypes}
        onToggleType={handleToggleQuizType}
        onClose={() => setShowQuizModal(false)}
        onConfirm={handleStartStudy}
        styles={styles}
        c={c}
      />
    </View>
  );
}
