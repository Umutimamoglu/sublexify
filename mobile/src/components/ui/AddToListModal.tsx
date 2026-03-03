import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import {
  useLists,
  useListsContainingWord,
  useAddWordToList,
  useCreateList,
} from '@/src/api/queries/lists.queries';
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

function makeStyles(c: typeof DARK) {
  return StyleSheet.create({
    overlay:    { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    sheet:      {
      backgroundColor: c.SURFACE,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingTop: 16, paddingBottom: 32, maxHeight: '75%',
    },
    handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: c.BORDER, alignSelf: 'center', marginBottom: 16 },
    header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
    headerTitle:{ flex: 1, color: c.TEXT_P, fontSize: 16, fontWeight: '800' },
    closeBtn:   { padding: 4 },
    closeText:  { color: c.TEXT_S, fontSize: 20 },

    // List items
    listItem:   {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.BORDER,
    },
    listItemAdded: { backgroundColor: c.PURPLE + '0d' },
    listInfo:   { flex: 1 },
    listName:   { color: c.TEXT_P, fontSize: 14, fontWeight: '600' },
    listCount:  { color: c.TEXT_S, fontSize: 12, marginTop: 2 },
    checkCircle:{
      width: 28, height: 28, borderRadius: 14, borderWidth: 2,
      alignItems: 'center', justifyContent: 'center',
    },
    checkText:  { fontSize: 13, fontWeight: '900' },

    // Create section
    createToggle: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 20, paddingVertical: 14,
    },
    createToggleText: { color: c.PURPLE, fontSize: 14, fontWeight: '700' },
    createRow:  { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
    createInput:{
      flex: 1, backgroundColor: c.SURFACE2, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      color: c.TEXT_P, fontSize: 14, borderWidth: 1, borderColor: c.BORDER,
    },
    createBtn:  {
      backgroundColor: c.PURPLE, borderRadius: 10,
      paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
    },
    createBtnDis: { opacity: 0.4 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Done button
    doneWrap:   { paddingHorizontal: 20, paddingTop: 12 },
    doneBtn:    { backgroundColor: c.SURFACE2, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    doneBtnText:{ color: c.TEXT_P, fontWeight: '700', fontSize: 14 },

    emptyText:  { color: c.TEXT_S, fontSize: 14, textAlign: 'center', padding: 24 },
  });
}

// ─── List row ─────────────────────────────────────────────────
function ListRow({
  item,
  isAdded,
  isPending,
  onPress,
  styles,
  c,
}: {
  item: WordListDTO;
  isAdded: boolean;
  isPending: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  c: typeof DARK;
}) {
  return (
    <TouchableOpacity
      style={[styles.listItem, isAdded && styles.listItemAdded]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isPending}
    >
      <View style={styles.listInfo}>
        <Text style={styles.listName}>{item.name}</Text>
        <Text style={styles.listCount}>{item.totalWords.toLocaleString()} kelime</Text>
      </View>
      {isPending ? (
        <ActivityIndicator size="small" color={c.PURPLE} />
      ) : (
        <View style={[
          styles.checkCircle,
          { borderColor: isAdded ? c.PURPLE : c.BORDER,
            backgroundColor: isAdded ? c.PURPLE + '22' : 'transparent' },
        ]}>
          {isAdded && (
            <Text style={[styles.checkText, { color: c.PURPLE }]}>✓</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Modal ───────────────────────────────────────────────
export default function AddToListModal({
  visible,
  wordId,
  wordName,
  onClose,
}: {
  visible:  boolean;
  wordId:   number;
  wordName: string;
  onClose:  () => void;
}) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? DARK : LIGHT;
  const styles = useMemo(() => makeStyles(c), [isDark]);

  const [addedIds,     setAddedIds]     = useState<Set<number>>(new Set());
  const [pendingId,    setPendingId]    = useState<number | null>(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [newListName,  setNewListName]  = useState('');

  const { data: lists = [],        isLoading: listsLoading  } = useLists();
  const { data: containingIds = []                           } = useListsContainingWord(wordId);
  const { mutate: addWord                                    } = useAddWordToList();
  const { mutate: createList, isPending: creating            } = useCreateList();

  // Sync containingIds into addedIds when modal opens / data arrives
  useEffect(() => {
    if (visible && containingIds.length > 0) {
      setAddedIds(new Set(containingIds));
    }
  }, [visible, containingIds]);

  // Reset state on close
  useEffect(() => {
    if (!visible) {
      setShowCreate(false);
      setNewListName('');
      setPendingId(null);
      setAddedIds(new Set());
    }
  }, [visible]);

  const handleAddToList = useCallback((listId: number) => {
    if (addedIds.has(listId)) return; // already added — no toggle/remove here
    setPendingId(listId);
    addWord(
      { listId, wordId },
      {
        onSuccess: () => {
          setAddedIds((prev) => new Set([...prev, listId]));
          setPendingId(null);
        },
        onError: () => setPendingId(null),
      },
    );
  }, [addedIds, addWord, wordId]);

  const handleCreateAndAdd = useCallback(() => {
    const name = newListName.trim();
    if (!name) return;
    createList(name, {
      onSuccess: (newList) => {
        setNewListName('');
        setShowCreate(false);
        addWord(
          { listId: newList.id, wordId },
          {
            onSuccess: () => setAddedIds((prev) => new Set([...prev, newList.id])),
          },
        );
      },
    });
  }, [newListName, createList, addWord, wordId]);

  // Only show custom (non-system) lists
  const customLists = useMemo(
    () => lists.filter((l) => !l.isSystem),
    [lists],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>

          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              "{wordName}" listesine ekle
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Lists */}
          {listsLoading ? (
            <ActivityIndicator color={c.PURPLE} style={{ paddingVertical: 24 }} />
          ) : customLists.length === 0 ? (
            <Text style={styles.emptyText}>Henüz liste oluşturmadın</Text>
          ) : (
            <FlatList
              data={customLists}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <ListRow
                  item={item}
                  isAdded={addedIds.has(item.id)}
                  isPending={pendingId === item.id}
                  onPress={() => handleAddToList(item.id)}
                  styles={styles}
                  c={c}
                />
              )}
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
            />
          )}

          {/* Create new list */}
          <TouchableOpacity
            style={styles.createToggle}
            onPress={() => setShowCreate((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.createToggleText}>
              {showCreate ? '− İptal' : '+ Yeni liste oluştur'}
            </Text>
          </TouchableOpacity>

          {showCreate && (
            <View style={styles.createRow}>
              <TextInput
                style={styles.createInput}
                placeholder="Liste adı..."
                placeholderTextColor={c.TEXT_S}
                value={newListName}
                onChangeText={setNewListName}
                autoFocus
                onSubmitEditing={handleCreateAndAdd}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.createBtn, (!newListName.trim() || creating) && styles.createBtnDis]}
                onPress={handleCreateAndAdd}
                disabled={!newListName.trim() || creating}
              >
                {creating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.createBtnText}>Oluştur</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Done */}
          <View style={styles.doneWrap}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.doneBtnText}>Bitti</Text>
            </TouchableOpacity>
          </View>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
