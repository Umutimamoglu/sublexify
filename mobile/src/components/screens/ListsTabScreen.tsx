import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useLists, useCreateList, useDeleteList } from '@/src/api/queries/lists.queries';
import { useKnownWords } from '@/src/api/queries/user.queries';
import { Ionicons } from '@expo/vector-icons';
import type { WordListDTO } from '@/src/types/api';

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
    header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: pad, paddingVertical: 14 },
    headerTitle: { flex: 1, color: c.TEXT_P, fontSize: 22, fontWeight: '800' },
    addBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: c.PURPLE, alignItems: 'center', justifyContent: 'center' },
    addBtnText:  { color: '#fff', fontSize: 22, lineHeight: 26 },

    // Bilinen kelimeler card
    knownCard:      { marginHorizontal: pad, marginBottom: 8, padding: 16, borderRadius: 14, backgroundColor: c.SURFACE, borderWidth: 1, borderColor: c.BORDER },
    knownCardTitle: { color: c.TEXT_P, fontSize: 15, fontWeight: '700' },
    knownCardSub:   { color: c.TEXT_S, fontSize: 12, marginTop: 4 },
    knownCardBadge: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: c.PURPLE + '22' },
    knownCardBadgeText: { color: c.PURPLE, fontSize: 12, fontWeight: '700' },

    // Section label
    sectionLabel: { color: c.TEXT_S, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, paddingHorizontal: pad, paddingTop: 14, paddingBottom: 8 },

    // List card
    listCard:      { marginHorizontal: pad, marginBottom: 10, padding: 14, borderRadius: 14, backgroundColor: c.SURFACE, borderWidth: 1, borderColor: c.BORDER },
    listCardRow:   { flexDirection: 'row', alignItems: 'flex-start' },
    listCardInfo:  { flex: 1 },
    listCardName:  { color: c.TEXT_P, fontSize: 15, fontWeight: '700' },
    listCardStats: { color: c.TEXT_S, fontSize: 12, marginTop: 4 },
    deleteBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF444422', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    lockIcon:      { fontSize: 16, marginLeft: 10 },

    // CEFR mini bar
    levelBar:     { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 10 },
    levelSegment: { height: '100%' },

    // Empty / center
    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyIcon: { fontSize: 40 },
    emptyText: { color: c.TEXT_S, fontSize: 15 },

    // Modal
    overlay:     { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    modalSheet:  { backgroundColor: c.SURFACE, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 },
    modalTitle:  { color: c.TEXT_P, fontSize: 17, fontWeight: '800' },
    modalInput:  {
      backgroundColor: c.SURFACE2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
      color: c.TEXT_P, fontSize: 15, borderWidth: 1, borderColor: c.BORDER,
    },
    modalBtns:   { flexDirection: 'row', gap: 10 },
    modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.SURFACE2, alignItems: 'center' },
    modalCreate: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.PURPLE, alignItems: 'center' },
    modalCancelText: { color: c.TEXT_S, fontWeight: '600' },
    modalCreateText: { color: '#fff', fontWeight: '700' },
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
function ListCard({
  item,
  onPress,
  onDelete,
  styles,
  c,
}: {
  item: WordListDTO;
  onPress: () => void;
  onDelete: () => void;
  styles: Styles;
  c: Palette;
}) {
  const { t } = useTranslation('lists');
  const unknownPct = item.totalWords > 0
    ? Math.round(((item.totalWords - item.unknownWords) / item.totalWords) * 100)
    : 0;

  return (
    <TouchableOpacity style={styles.listCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.listCardRow}>
        <View style={styles.listCardInfo}>
          <Text style={styles.listCardName}>{item.name}</Text>
          <Text style={styles.listCardStats}>
            {t('wordCount', { count: item.totalWords })} · {t('wordStatsPct', { pct: unknownPct })}
          </Text>
        </View>
        {item.isSystem ? (
          <Text style={styles.lockIcon}>🔒</Text>
        ) : (
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
      {item.levelCounts && item.totalWords > 0 && (
        <CefrMiniBar levelCounts={item.levelCounts} total={item.totalWords} styles={styles} />
      )}
    </TouchableOpacity>
  );
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
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modalSheet} activeOpacity={1}>
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
        </TouchableOpacity>
      </TouchableOpacity>
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

  const [showCreate, setShowCreate] = useState(false);

  const { data: rawLists = [], isLoading }        = useLists();
  const systemLists = useMemo(
    () => rawLists.filter((l) => l.isSystem),
    [rawLists],
  );
  const personalLists = useMemo(
    () => [...rawLists.filter((l) => !l.isSystem)].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    [rawLists],
  );
  const { data: knownWords = [] }                = useKnownWords();
  const { mutate: createList, isPending: creating } = useCreateList();
  const { mutate: deleteList }                   = useDeleteList();

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

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.BG}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('myLists')}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.PURPLE} size="large" />
          </View>
        ) : (
          <FlatList
            data={personalLists}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={() => (
              <>
                {/* Bilinen Kelimeler */}
                <TouchableOpacity
                  style={styles.knownCard}
                  onPress={() => router.push('/list/-1' as any)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.knownCardTitle}>{t('knownWords')}</Text>
                  <Text style={styles.knownCardSub}>{t('knownWordsSubtitle')}</Text>
                  <View style={styles.knownCardBadge}>
                    <Text style={styles.knownCardBadgeText}>
                      {t('wordCount', { count: knownWords.length })}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Kişisel Listeler başlığı */}
                <Text style={styles.sectionLabel}>{t('personalLists')}</Text>
              </>
            )}
            renderItem={({ item }) => (
              <ListCard
                item={item}
                onPress={() => router.push(`/list/${item.id}` as any)}
                onDelete={() => handleDelete(item)}
                styles={styles}
                c={c}
              />
            )}
            ListEmptyComponent={() => (
              <View style={[styles.center, { paddingVertical: 32 }]}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>{t('noPersonalLists')}</Text>
              </View>
            )}
            ListFooterComponent={systemLists.length > 0 ? () => (
              <>
                <Text style={styles.sectionLabel}>{t('curatedLists')}</Text>
                {systemLists.map((item) => (
                  <ListCard
                    key={item.id}
                    item={item}
                    onPress={() => router.push(`/list/${item.id}` as any)}
                    onDelete={() => {}}
                    styles={styles}
                    c={c}
                  />
                ))}
              </>
            ) : null}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
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
    </View>
  );
}
