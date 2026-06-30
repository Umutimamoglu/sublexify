import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, TextInput, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useLists, useCreateList, useDeleteList, useUpdateList } from '@/src/api/queries/lists.queries';
import { useKnownWords } from '@/src/api/queries/user.queries';
import { useMedia } from '@/src/api/queries/media.queries';
import { useListPreferences } from '@/src/hooks/useListPreferences';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { WordListDTO } from '@/src/types/api';
import { Text } from '@/src/components/ui/Text';
import { useListsTourStore } from '@/src/store/listsTourStore';
import { TourOverlay } from '@/src/components/ui/TourOverlay';
import { TOUR_NEON, TOUR_CARD_STYLE, TourTooltipContent } from '@/src/components/ui/TourTooltip';
import Tooltip from 'react-native-walkthrough-tooltip';
import { ShimmerOverlay } from '@/src/components/ui/ShimmerOverlay';

// İlk defa giren kullanıcının henüz kişisel listesi olmadığı için, listeler
// ekranını ve görünürlük özelliğini tanıtmak üzere gösterilen örnek (dummy)
// listeler. Negatif id → gerçek listelerle çakışmaz, tıklanınca navigasyon yok.
const TOUR_DUMMY_LISTS: WordListDTO[] = [
  {
    id: -9001,
    name: 'Friends — Öğrenilmiş Kelimeler',
    totalWords: 140,
    unknownWords: 56, // %60 biliniyor
    levelCounts: { A1: 30, A2: 35, B1: 30, B2: 25, C1: 15, C2: 5 },
    createdAt: new Date().toISOString(),
    isSystem: false,
    color: '#9C27B0',
  },
  {
    id: -9002,
    name: 'Friends — 4. Sezon 5. Bölüm',
    totalWords: 60,
    unknownWords: 53, // %12 biliniyor
    levelCounts: { A1: 12, A2: 15, B1: 14, B2: 10, C1: 6, C2: 3 },
    createdAt: new Date().toISOString(),
    isSystem: false,
    color: '#3F51B5',
  },
  {
    id: -9003,
    name: 'Friends — 4. Sezon 6. Bölüm',
    totalWords: 90,
    unknownWords: 90, // %0 biliniyor
    levelCounts: { A1: 20, A2: 22, B1: 20, B2: 15, C1: 9, C2: 4 },
    createdAt: new Date().toISOString(),
    isSystem: false,
    color: '#00BCD4',
  },
  {
    id: -9004,
    name: 'Euphoria — Kitty Likes to Dance (S3E4)',
    totalWords: 19,
    unknownWords: 19, // %0 biliniyor
    levelCounts: { A1: 4, A2: 5, B1: 4, B2: 3, C1: 2, C2: 1 },
    createdAt: new Date().toISOString(),
    isSystem: false,
    color: '#E91E63',
  },
];

// Demoda gizlenecek bölüm listeleri (Friends bölümleri).
const TOUR_HIDE_IDS = [-9002, -9003];



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
    root: { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: pad, paddingVertical: 14 },
    headerTitle: { flex: 1, color: c.TEXT_P, fontSize: 24, fontWeight: '800' },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.PURPLE, alignItems: 'center', justifyContent: 'center' },

    // Bilinen kelimeler card
    knownCard: { marginHorizontal: pad, marginBottom: 8, padding: 16, borderRadius: 14, backgroundColor: c.SURFACE, borderWidth: 1, borderColor: c.BORDER },
    knownCardTitle: { color: c.TEXT_P, fontSize: 15, fontWeight: '700' },
    knownCardSub: { color: c.TEXT_S, fontSize: 12, marginTop: 4 },
    knownCardBadge: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: c.PURPLE + '22' },
    knownCardBadgeText: { color: c.PURPLE, fontSize: 12, fontWeight: '700' },

    // Section label
    sectionLabel: { color: c.TEXT_S, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, paddingHorizontal: pad, paddingTop: 14, paddingBottom: 8 },

    // Modern List card (matches Discover listRow)
    listCard: {
      marginHorizontal: pad, marginBottom: 10,
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDark ? '#1a1a1c' : '#ffffff',
      borderRadius: 20, paddingVertical: 14, paddingLeft: 16, paddingRight: 20,
      elevation: isDark ? 0 : 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 10,
    },
    listCardStrip: {
       position: 'absolute', left: 0, top: 0, bottom: 0, width: 8,
       borderTopLeftRadius: 20, borderBottomLeftRadius: 20,
    },
    listIconCircle: {
      width: 44, height: 44, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 12,
    },
    listCardBody: { flex: 1, gap: 4 },
    listCardRow: { flexDirection: 'row', alignItems: 'flex-start' },
    listCardInfo: { flex: 1 },
    listCardName: { color: c.TEXT_P, fontSize: 15, fontWeight: '800' },
    listCardStats: { color: c.TEXT_S, fontSize: 12, fontWeight: '500', marginTop: 2 },
    listCardActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
    editBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EF444415', alignItems: 'center', justifyContent: 'center' },
    hideBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center' },
    lockIconBox: { marginLeft: 10, alignSelf: 'center', width: 24, height: 24, borderRadius: 12, backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center' },

    // Color swatches
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
    swatchSelected: { borderColor: c.TEXT_P },

    // CEFR mini bar
    levelBar: { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 10 },
    levelSegment: { height: '100%' },

    // Empty / center
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyIcon: { fontSize: 40 },
    emptyText: { color: c.TEXT_S, fontSize: 15 },

    // Modal
    overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: c.SURFACE, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 },
    modalTitle: { color: c.TEXT_P, fontSize: 17, fontWeight: '800' },
    modalInput: {
      backgroundColor: c.SURFACE2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
      color: c.TEXT_P, fontSize: 15, borderWidth: 1, borderColor: c.BORDER,
    },
    modalBtns: { flexDirection: 'row', gap: 10 },
    modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.SURFACE2, alignItems: 'center' },
    modalCreate: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.PURPLE, alignItems: 'center' },
    modalCancelText: { color: c.TEXT_S, fontWeight: '600' },
    modalCreateText: { color: '#fff', fontWeight: '700' },

    // Media select
    mediaSelectScroll: { paddingVertical: 10 },
    mediaCard: { width: 80, marginRight: 12, alignItems: 'center' },
    mediaPosterBox: { width: 80, height: 120, borderRadius: 12, overflow: 'hidden', backgroundColor: c.SURFACE2, marginBottom: 6, borderWidth: 2, borderColor: 'transparent' },
    mediaPosterSelected: { borderColor: c.PURPLE },
    mediaPoster: { width: '100%', height: '100%' },
    mediaTitle: { color: c.TEXT_P, fontSize: 11, textAlign: 'center', fontWeight: '600' },
    mediaRemoveBtn: { paddingVertical: 10, alignSelf: 'flex-start' },
    mediaRemoveText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },

    // Search bar for media
    searchBarContainer: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.SURFACE2, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8,
      marginTop: 4, marginBottom: 4,
      borderWidth: 1, borderColor: c.BORDER,
    },
    searchInput: {
      flex: 1, color: c.TEXT_P, fontSize: 14,
    },
  });
}

type Styles = ReturnType<typeof makeStyles>;

// ─── CEFR mini bar ─────────────────────────────────────────────
function CefrMiniBar({
  levelCounts,
  total,
  styles,
}: {
  levelCounts: Record<string, number>;
  total: number;
  styles: Styles;
}) {
  if (total === 0) return null;
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  return (
    <View style={styles.levelBar}>
      {levels.map((lv) => {
        const count = levelCounts[lv] ?? 0;
        if (count === 0) return null;
        return (
          <View
            key={lv}
            style={[styles.levelSegment, { flex: count / total, backgroundColor: DIFF_COLORS[lv] }]}
          />
        );
      })}
    </View>
  );
}

// ─── List card ─────────────────────────────────────────────────
const DISCOVER_LIST_COLORS = [
  '#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#4CAF50', '#FF9800', '#F44336',
];

function ListCard({
  item,
  index,
  onPress,
  onDelete,
  onEdit,
  onToggleHidden,
  isHidden,
  drag,
  isActive,
  shimmer,
  styles,
  c,
}: {
  item: WordListDTO;
  index: number;
  onPress: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onToggleHidden: () => void;
  isHidden: boolean;
  drag?: () => void;
  isActive?: boolean;
  shimmer?: boolean;
  styles: Styles;
  c: Palette;
}) {
  const { t } = useTranslation('lists');
  const unknownPct = item.totalWords > 0
    ? Math.round(((item.totalWords - item.unknownWords) / item.totalWords) * 100)
    : 0;

  const n = item.name.toLowerCase();
  
  let colorHex = item.color;
  if (!colorHex) {
    if (item.isSystem) {
      const isOxford = n.includes('oxford');
      colorHex = isOxford ? '#FFCA28' : DISCOVER_LIST_COLORS[index % DISCOVER_LIST_COLORS.length];
    } else {
      colorHex = c.PURPLE;
    }
  }
  
  // Icon selector like Discover
  let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'library-outline';
  if (n.includes('oxford') || n.includes('essential')) iconName = 'school-outline';
  else if (n.includes('business') || n.includes('professional')) iconName = 'briefcase-outline';
  else if (item.isSystem) iconName = 'albums-outline';

  const content = (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        onLongPress={drag}
        delayLongPress={200}
        style={[
          styles.listCard,
          { overflow: 'hidden' },
          isActive && { opacity: 0.85, elevation: 8, shadowOpacity: 0.15 },
          isHidden && { opacity: 0.45 },
        ]}
      >
      {/* Background tint layer that preserves the opaque base color for Android elevation */}
      {!!item.color && (
        <View 
          style={[
            StyleSheet.absoluteFill, 
            { backgroundColor: item.color, opacity: 0.15 }
          ]} 
        />
      )}

      {/* Dev Arka Plan Kilit Filigranı (System Lists) */}
      {item.isSystem && (
        <Ionicons 
          name="lock-closed-outline"
          size={100}
          color={colorHex}
          style={{
            position: 'absolute',
            right: -18,
            bottom: -30,
            opacity: 0.05, // Daha minimal, ince ve şık
            transform: [{ rotate: '-15deg' }],
          }}
        />
      )}

      <View style={[styles.listCardStrip, { backgroundColor: colorHex }]} />
      
      {/* Icon Circle or Poster Thumbnail */}
      {item.sourceMediaPosterUrl ? (
        <Image 
          source={{ uri: item.sourceMediaPosterUrl }} 
          style={[styles.listIconCircle, { backgroundColor: c.SURFACE2, borderWidth: 1, borderColor: colorHex + '33' }]} 
          contentFit="cover" 
        />
      ) : (
        <View style={[styles.listIconCircle, { backgroundColor: colorHex + '1A' }]}>
          <Ionicons name={iconName} size={20} color={colorHex} />
        </View>
      )}

      <View style={styles.listCardBody}>
        <View style={styles.listCardRow}>
          <View style={[styles.listCardInfo, item.isSystem && { paddingRight: 40 }]}>
            <Text style={styles.listCardName}>
              {item.isSystem ? t(item.name as any, { defaultValue: item.name }) : item.name}
            </Text>
            <Text style={styles.listCardStats}>
              {t('wordCount', { count: item.totalWords })} · {t('wordStatsPct', { pct: unknownPct })}
            </Text>
          </View>
          {!item.isSystem && (
            <View style={styles.listCardActions}>
              <TouchableOpacity style={[styles.hideBtn, { overflow: 'hidden' }]} onPress={onToggleHidden} activeOpacity={0.7}>
                {shimmer && <ShimmerOverlay active bandColor="rgba(43,255,136,0.45)" />}
                <Ionicons name={isHidden ? 'eye-off-outline' : 'eye-outline'} size={13} color={isHidden ? '#F59E0B' : c.TEXT_S} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.editBtn, { overflow: 'hidden' }]} onPress={onEdit} activeOpacity={0.7}>
                {shimmer && <ShimmerOverlay active bandColor="rgba(43,255,136,0.45)" />}
                <Ionicons name="pencil-outline" size={13} color={c.TEXT_S} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={13} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        {item.levelCounts && item.totalWords > 0 && (
          <View style={{ marginTop: 8 }}>
            <CefrMiniBar levelCounts={item.levelCounts} total={item.totalWords} styles={styles} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return drag ? (
    <ScaleDecorator activeScale={0.97}>
      {content}
    </ScaleDecorator>
  ) : content;
}

// ─── Create list modal ─────────────────────────────────────────
function CreateModal({
  visible,
  onClose,
  onCreate,
  creating,
  styles,
  c,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  creating: boolean;
  styles: Styles;
  c: Palette;
}) {
  const { t } = useTranslation('lists');
  const { t: tCommon } = useTranslation('common');
  const [name, setName] = useState('');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
          <View style={{ flex: 1, backgroundColor: '#00000088' }} />
        </TouchableOpacity>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{t('newList')}</Text>
          <TextInput
            style={styles.modalInput}
            placeholder={t('listNamePlaceholder')}
            placeholderTextColor={c.TEXT_S}
            value={name}
            onChangeText={setName}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>{tCommon('actions.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCreate, (!name.trim() || creating) && { opacity: 0.5 }]}
              onPress={handleCreate}
              disabled={!name.trim() || creating}
            >
              {creating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.modalCreateText}>{tCommon('actions.create')}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Renk paleti ───────────────────────────────────────────────
const LIST_COLORS = [
  '#7c3aed', '#2563eb', '#0ea5e9', '#0891b2',
  '#14b8a6', '#10b981', '#059669', '#84cc16',
  '#eab308', '#f59e0b', '#d97706', '#ea580c',
  '#ef4444', '#dc2626', '#ec4899', '#db2777',
  '#d946ef', '#8b5cf6', '#6366f1', '#6b7280',
];

// ─── Edit list modal ───────────────────────────────────────────
function EditListModal({
  item,
  visible,
  onClose,
  onSave,
  saving,
  styles,
  c,
}: {
  item: WordListDTO | null;
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, color: string, mediaId: number | null) => void;
  saving: boolean;
  styles: Styles;
  c: Palette;
}) {
  const { t: tCommon } = useTranslation('common');
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [mediaId, setMediaId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: allMedia = [] } = useMedia();

  const filteredMedia = useMemo(() => {
    if (!searchQuery.trim()) return allMedia;
    const q = searchQuery.toLowerCase();
    return allMedia.filter(m => m.title.toLowerCase().includes(q));
  }, [allMedia, searchQuery]);

  // item değişince formu doldur
  React.useEffect(() => {
    if (item) {
      setName(item.name);
      setColor(item.color ?? '');
      setMediaId(item.sourceMediaId ?? null);
      setSearchQuery('');
    }
  }, [item]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
          <View style={{ flex: 1, backgroundColor: '#00000088' }} />
        </TouchableOpacity>
        <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
          <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Listeyi Düzenle</Text>

          <TextInput
            style={styles.modalInput}
            value={name}
            onChangeText={setName}
            placeholderTextColor={c.TEXT_S}
            placeholder="Liste adı"
            autoFocus
          />

          {/* Renk seçici */}
          <Text style={[styles.modalTitle, { fontSize: 13, fontWeight: '600', color: c.TEXT_S }]}>Renk</Text>
          <View style={styles.swatchRow}>
            <TouchableOpacity
              style={[
                styles.swatch,
                { backgroundColor: c.SURFACE2, borderWidth: 2, borderColor: color === '' ? c.TEXT_P : c.BORDER },
              ]}
              onPress={() => setColor('')}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={14} color={c.TEXT_S} style={{ alignSelf: 'center', marginTop: 7 }} />
            </TouchableOpacity>

            {LIST_COLORS.map((col) => (
              <TouchableOpacity
                key={col}
                style={[styles.swatch, { backgroundColor: col }, color === col && styles.swatchSelected]}
                onPress={() => setColor(col)}
                activeOpacity={0.75}
              />
            ))}
          </View>

          {/* Dizi/Film İlişkilendir */}
          <Text style={[styles.modalTitle, { fontSize: 13, fontWeight: '600', color: c.TEXT_S, marginTop: 10 }]}>İlişkilendirilecek Dizi/Film</Text>
          
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={16} color={c.TEXT_S} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Dizi/Film ara..."
              placeholderTextColor={c.TEXT_S}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={{ flex: 1, minHeight: 180 }}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaSelectScroll}
              data={filteredMedia}
              keyExtractor={(m) => m.id.toString()}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              windowSize={5}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <TouchableOpacity
                  style={styles.mediaCard}
                  onPress={() => setMediaId(null)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.mediaPosterBox, mediaId === null && styles.mediaPosterSelected, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="close-circle-outline" size={32} color={c.TEXT_S} />
                  </View>
                  <Text style={styles.mediaTitle} numberOfLines={2}>Hiçbiri</Text>
                </TouchableOpacity>
              }
              renderItem={({ item: media }) => (
                <TouchableOpacity
                  style={styles.mediaCard}
                  onPress={() => setMediaId(media.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.mediaPosterBox, mediaId === media.id && styles.mediaPosterSelected]}>
                    <Image source={{ uri: media.posterUrl ?? undefined }} style={styles.mediaPoster} contentFit="cover" />
                  </View>
                  <Text style={styles.mediaTitle} numberOfLines={2}>{media.title}</Text>
                </TouchableOpacity>
              )}
            />
          </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
                <Text style={styles.modalCancelText}>{tCommon('actions.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, (!name.trim() || saving) && { opacity: 0.5 }]}
                onPress={() => onSave(name.trim(), color, mediaId)}
                disabled={!name.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalCreateText}>{tCommon('actions.save')}</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function ListsTabScreen() {
  const router = useRouter();
  const { t } = useTranslation('lists');
  const { t: tCommon } = useTranslation('common');
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

  const insets = useSafeAreaInsets();
  const [showCreate, setShowCreate] = useState(false);
  const [editingList, setEditingList] = useState<WordListDTO | null>(null);
  const [showOnlyVisible, setShowOnlyVisible] = useState(false);

  const { prefs, saveOrder, toggleHidden } = useListPreferences();

  // ─── Onboarding tour (örnek listeler + görünürlük demosu) ──────
  const { show: showTour, initializeTour, finishTour } = useListsTourStore();
  // Dummy listelerin gizleme durumu — gerçek prefs'i kirletmemek için lokal.
  const [demoHiddenIds, setDemoHiddenIds] = useState<number[]>([]);

  useEffect(() => {
    initializeTour();
  }, [initializeTour]);

  // Tur açıkken: ön ce 4 örnek liste görünür → Friends bölüm listelerini tek
  // tek gizle (kart kararır) → sağ üstteki toggle ile gizlileri kaldır.
  // "Anladım"a basana kadar döngüde tekrarlar.
  useEffect(() => {
    if (!showTour) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => timers.push(setTimeout(resolve, ms)));

    const run = async () => {
      while (!cancelled) {
        // 1) Sıfırla — hepsi görünür
        setShowOnlyVisible(false);
        setDemoHiddenIds([]);
        await wait(2600); // kullanıcı yazıyı okusun
        if (cancelled) break;
        // 2) Bölüm listelerini tek tek gizle (kart kararır)
        setDemoHiddenIds([TOUR_HIDE_IDS[0]]);
        await wait(800);
        if (cancelled) break;
        setDemoHiddenIds([TOUR_HIDE_IDS[0], TOUR_HIDE_IDS[1]]);
        await wait(1500);
        if (cancelled) break;
        // 3) Sağ üstten "sadece görünenler" → gizliler kaybolur
        setShowOnlyVisible(true);
        await wait(2400);
        if (cancelled) break;
      }
    };
    run();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      setShowOnlyVisible(false);
      setDemoHiddenIds([]);
    };
  }, [showTour]);

  const { data: rawLists = [], isLoading } = useLists();
  const systemLists = useMemo(
    () => rawLists.filter((l) => l.isSystem),
    [rawLists],
  );

  // Apply saved order, then filter hidden if showOnlyVisible is on
  const personalLists = useMemo<WordListDTO[]>(() => {
    // Tur açıkken gerçek listeler yerine örnek (dummy) listeleri göster ve
    // gizleme demosunu lokal demoHiddenIds üzerinden uygula.
    if (showTour) {
      if (showOnlyVisible) {
        return TOUR_DUMMY_LISTS.filter((item) => !demoHiddenIds.includes(item.id));
      }
      return TOUR_DUMMY_LISTS;
    }
    const unsorted = rawLists.filter((l) => !l.isSystem);
    const sorted: WordListDTO[] = [];
    const unsortedSet = new Set(unsorted.map((l) => l.id));

    // Process based on saved order first
    for (const id of prefs.order) {
      if (typeof id === 'number' && unsortedSet.has(id)) {
        const list = unsorted.find(l => l.id === id);
        if (list) {
          sorted.push(list);
          unsortedSet.delete(id);
        }
      }
    }

    // Add any remaining unsorted items that weren't in order array
    unsorted.forEach(list => {
      if (unsortedSet.has(list.id)) {
        sorted.push(list);
      }
    });

    // Filter hidden when showOnlyVisible is on
    if (showOnlyVisible) {
      return sorted.filter(item => !prefs.hiddenIds.includes(item.id));
    }
    return sorted;
  }, [rawLists, prefs.order, prefs.hiddenIds, showOnlyVisible, showTour, demoHiddenIds]);
  const { data: knownWords = [] } = useKnownWords();
  const { mutate: createList, isPending: creating } = useCreateList();
  const { mutate: deleteList } = useDeleteList();
  const { mutate: updateList, isPending: saving } = useUpdateList();

  const handleCreate = useCallback((name: string) => {
    createList(name, {
      onSuccess: () => setShowCreate(false),
    });
  }, [createList]);

  const handleDelete = useCallback((item: WordListDTO) => {
    Alert.alert(
      t('deleteListTitle'),
      t('deleteListMessage', { name: item.name }),
      [
        { text: tCommon('actions.cancel'), style: 'cancel' },
        { text: tCommon('actions.delete'), style: 'destructive', onPress: () => deleteList(item.id) },
      ],
    );
  }, [deleteList, t, tCommon]);

  const handleSaveEdit = useCallback((name: string, color: string, mediaId: number | null) => {
    if (!editingList) return;
    updateList(
      { id: editingList.id, name, color, mediaId: mediaId === null ? -1 : mediaId },
      { onSuccess: () => setEditingList(null) },
    );
  }, [editingList, updateList]);

  const handleDragEnd = useCallback(({ data }: any) => {
    const newOrder = data.map((item: WordListDTO) => item.id);
    saveOrder(newOrder);
  }, [saveOrder]);

  const knownLevels = useMemo(() => {
    const counts: Record<string, number> = {};
    knownWords.forEach((w: any) => {
      if (w.difficulty) counts[w.difficulty] = (counts[w.difficulty] || 0) + 1;
    });
    return counts;
  }, [knownWords]);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.BG}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('myLists')}</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: c.SURFACE2, marginRight: 8 }]}
            onPress={() => setShowOnlyVisible((v) => !v)}
          >
            <Ionicons
              name={showOnlyVisible ? 'eye-outline' : 'eye-off-outline'}
              size={24}
              color={showOnlyVisible ? c.PURPLE : c.TEXT_S}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.PURPLE} size="large" />
          </View>
        ) : (
          <DraggableFlatList
            data={personalLists}
            keyExtractor={(item) => String(item.id)}
            onDragEnd={handleDragEnd}
            activationDistance={8}
            ListHeaderComponent={() => (
              <>
                {/* Bilinen Kelimeler */}
                <TouchableOpacity
                  style={[styles.listCard, { overflow: 'hidden' }]}
                  onPress={() => router.push('/list/-1' as any)}
                  activeOpacity={0.75}
                >
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: c.PURPLE, opacity: 0.15 }]} />
                  <View style={[styles.listCardStrip, { backgroundColor: c.PURPLE }]} />
                  
                  <View style={[styles.listIconCircle, { backgroundColor: c.PURPLE + '20' }]}>
                    <Ionicons name="checkmark-done-circle-outline" size={24} color={c.PURPLE} />
                  </View>

                  <View style={styles.listCardBody}>
                    <View style={styles.listCardRow}>
                      <View style={styles.listCardInfo}>
                        <Text style={styles.listCardName}>{t('knownWords')}</Text>
                        <Text style={styles.listCardStats}>
                          {t('wordCount', { count: knownWords.length })}
                        </Text>
                      </View>
                    </View>
                    <CefrMiniBar levelCounts={knownLevels} total={knownWords.length} styles={styles} />
                  </View>
                </TouchableOpacity>
                {/* Kişisel Listeler başlığı */}
                <Text style={styles.sectionLabel}>{t('personalLists')}</Text>
              </>
            )}
            renderItem={({ item, getIndex, drag, isActive }: RenderItemParams<WordListDTO>) => {
              const isDummy = item.id < 0; // tur örnek listesi
              return (
                <ListCard
                  item={item}
                  index={getIndex() ?? 0}
                  drag={isDummy ? undefined : drag}
                  isActive={isActive}
                  isHidden={isDummy ? demoHiddenIds.includes(item.id) : prefs.hiddenIds.includes(item.id)}
                  onPress={() => { if (!isDummy) router.push(`/list/${item.id}` as any); }}
                  onDelete={() => handleDelete(item)}
                  onEdit={() => setEditingList(item)}
                  onToggleHidden={() => {
                    if (isDummy) {
                      setDemoHiddenIds((prev) =>
                        prev.includes(item.id) ? prev.filter((i) => i !== item.id) : [...prev, item.id],
                      );
                    } else {
                      toggleHidden(item.id);
                    }
                  }}
                  shimmer={showTour}
                  styles={styles}
                  c={c}
                />
              );
            }}
            ListEmptyComponent={() => (
              <View style={[styles.center, { paddingVertical: 32 }]}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>{t('noPersonalLists')}</Text>
              </View>
            )}
            ListFooterComponent={systemLists.length > 0 ? () => (
              <>
                <Text style={styles.sectionLabel}>{t('curatedLists')}</Text>
                {systemLists.map((item, index) => (
                  <ListCard
                    key={item.id}
                    item={item}
                    index={index + 1}
                    isHidden={false}
                    onToggleHidden={() => {}}
                    drag={undefined}
                    isActive={false}
                    onPress={() => router.push(`/list/${item.id}` as any)}
                    onDelete={() => {}}
                    onEdit={() => {}}
                    styles={styles}
                    c={c}
                  />
                ))}
              </>
            ) : null}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        )}

      </SafeAreaView>

      <CreateModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        creating={creating}
        styles={styles}
        c={c}
      />

      <EditListModal
        item={editingList}
        visible={!!editingList}
        onClose={() => setEditingList(null)}
        onSave={handleSaveEdit}
        saving={saving}
        styles={styles}
        c={c}
      />

      {/* Onboarding turu — altta serbest açıklama kartı (oksuz). Üstte örnek
          listeler + gizleme demosu net görünsün diye aşağıda. */}
      {showTour && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 96,
            alignItems: 'center',
            paddingHorizontal: 16,
            zIndex: 300,
          }}
        >
          <Tooltip
            isVisible={showTour}
            content={
              <TourTooltipContent
                title="Listelerin 📋"
                text="Bu ekranda kendi kelime listelerin durur — izlediğin dizi/filmlerden çıkardığın kelimeleri buradan çalışırsın. İstemediğin listeleri 👁 ile gizleyebilir, sağ üstteki düğmeyle görünümü sadeleştirebilirsin."
                isLast={false}
                onPress={finishTour}
              />
            }
            placement="top"
            onClose={finishTour}
            backgroundColor="rgba(0,0,0,0.65)"
            closeOnBackgroundInteraction={false}
            contentStyle={TOUR_CARD_STYLE}
            arrowStyle={{ borderBottomColor: TOUR_NEON }}
            disableShadow={false}
          >
            <View style={{ width: 1, height: 1 }} />
          </Tooltip>
        </View>
      )}
    </View>
  );
}
