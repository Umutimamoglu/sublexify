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
import { useLists, useCreateList, useDeleteList } from '@/src/api/queries/lists.queries';
import { useKnownWords } from '@/src/api/queries/user.queries';
import type { WordListDTO } from '@/src/types/api';

// ─── Palette ──────────────────────────────────────────────────
const DARK = {
  BG: '#0d0d14', SURFACE: '#16161f', SURFACE2: '#1e1e2a',
  TEXT_P: '#f0f0f5', TEXT_S: '#8888aa', BORDER: '#ffffff0f',
  PURPLE: '#7c3aed',
};
const LIGHT = {
  BG: '#f4f4f8', SURFACE: '#ffffff', SURFACE2: '#ededf5',
  TEXT_P: '#111118', TEXT_S: '#888899', BORDER: '#e0e0ea',
  PURPLE: '#6d28d9',
};

const DIFF_COLORS: Record<string, string> = {
  A1: '#22C55E', A2: '#84CC16',
  B1: '#F59E0B', B2: '#F97316',
  C1: '#EF4444', C2: '#9333EA',
};

// ─── Styles ───────────────────────────────────────────────────
function makeStyles(c: typeof DARK, isDark: boolean) {
  return StyleSheet.create({
    root:     { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },

    // Header
    header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    headerTitle: { flex: 1, color: c.TEXT_P, fontSize: 22, fontWeight: '800' },
    addBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: c.PURPLE, alignItems: 'center', justifyContent: 'center' },
    addBtnText:  { color: '#fff', fontSize: 22, lineHeight: 26 },

    // Bilinen kelimeler card
    knownCard:      { marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 14, backgroundColor: c.SURFACE, borderWidth: 1, borderColor: c.BORDER },
    knownCardTitle: { color: c.TEXT_P, fontSize: 15, fontWeight: '700' },
    knownCardSub:   { color: c.TEXT_S, fontSize: 12, marginTop: 4 },
    knownCardBadge: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: c.PURPLE + '22' },
    knownCardBadgeText: { color: c.PURPLE, fontSize: 12, fontWeight: '700' },

    // Section label
    sectionLabel: { color: c.TEXT_S, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

    // List card
    listCard:      { marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 14, backgroundColor: c.SURFACE, borderWidth: 1, borderColor: c.BORDER },
    listCardRow:   { flexDirection: 'row', alignItems: 'flex-start' },
    listCardInfo:  { flex: 1 },
    listCardName:  { color: c.TEXT_P, fontSize: 15, fontWeight: '700' },
    listCardStats: { color: c.TEXT_S, fontSize: 12, marginTop: 4 },
    deleteBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF444422', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    deleteBtnText: { fontSize: 14 },

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
  c: typeof DARK;
}) {
  const unknownPct = item.totalWords > 0
    ? Math.round(((item.totalWords - item.unknownWords) / item.totalWords) * 100)
    : 0;

  return (
    <TouchableOpacity style={styles.listCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.listCardRow}>
        <View style={styles.listCardInfo}>
          <Text style={styles.listCardName}>{item.name}</Text>
          <Text style={styles.listCardStats}>
            {item.totalWords.toLocaleString()} kelime · %{unknownPct} biliniyor
          </Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
          <Text style={styles.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
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
  c: typeof DARK;
}) {
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
          <Text style={styles.modalTitle}>Yeni Liste</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Liste adı..."
            placeholderTextColor={c.TEXT_S}
            value={name}
            onChangeText={setName}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCreate, (!name.trim() || creating) && { opacity: 0.5 }]}
              onPress={handleCreate}
              disabled={!name.trim() || creating}
            >
              {creating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.modalCreateText}>Oluştur</Text>
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
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const styles = useMemo(() => makeStyles(c, isDark), [isDark]);

  const [showCreate, setShowCreate] = useState(false);

  const { data: lists = [], isLoading }          = useLists();
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
      'Listeyi Sil',
      `"${item.name}" listesini silmek istiyor musunuz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteList(item.id) },
      ],
    );
  }, [deleteList]);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.BG}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Listelerim</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={DARK.PURPLE} size="large" />
          </View>
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={() => (
              <>
                {/* Bilinen Kelimeler */}
                <TouchableOpacity
                  style={styles.knownCard}
                  onPress={() => router.push('/list/-1' as any)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.knownCardTitle}>Bilinen Kelimeler</Text>
                  <Text style={styles.knownCardSub}>
                    Bilinen olarak işaretlediğin tüm kelimeler
                  </Text>
                  <View style={styles.knownCardBadge}>
                    <Text style={styles.knownCardBadgeText}>
                      {knownWords.length} kelime
                    </Text>
                  </View>
                </TouchableOpacity>

                {lists.length > 0 && (
                  <Text style={styles.sectionLabel}>KİŞİSEL LİSTELER</Text>
                )}
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
              <View style={styles.center}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>Henüz liste oluşturmadın</Text>
              </View>
            )}
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
