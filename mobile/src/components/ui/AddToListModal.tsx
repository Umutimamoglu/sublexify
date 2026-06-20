import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useListPreferences } from '@/src/hooks/useListPreferences';
import { View, Modal, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import {
  useLists,
  useListsContainingWord,
  useAddWordToList,
  useRemoveWordFromList,
  useCreateList,
} from '@/src/api/queries/lists.queries';
import type { WordListDTO } from '@/src/types/api';
import { Text } from '@/src/components/ui/Text';


type Palette = {
  BG: string; SURFACE: string; SURFACE2: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
};

function makeStyles(c: Palette) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.SURFACE,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingTop: 16, paddingBottom: 32, maxHeight: '75%',
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.BORDER, alignSelf: 'center', marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
    headerTitle: { flex: 1, color: c.TEXT_P, fontSize: 16, fontWeight: '800' },
    closeBtn: { padding: 4 },
    closeText: { color: c.TEXT_S, fontSize: 20 },

    // List items
    listItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.BORDER,
      overflow: 'hidden',
    },
    listItemAdded: { backgroundColor: c.PURPLE + '0d' },
    listStrip: { width: 4, alignSelf: 'stretch', marginRight: 12, marginLeft: 0 },
    listThumbnail: { width: 32, height: 44, borderRadius: 6, backgroundColor: c.SURFACE2, marginRight: 12, borderWidth: 1, borderColor: c.BORDER },
    listColorDot: { width: 28, height: 28, borderRadius: 14, marginRight: 12 },
    listItemRight: { paddingRight: 20 },
    listInfo: { flex: 1 },
    listName: { color: c.TEXT_P, fontSize: 14, fontWeight: '600' },
    listCount: { color: c.TEXT_S, fontSize: 12, marginTop: 2 },
    checkCircle: {
      width: 28, height: 28, borderRadius: 14, borderWidth: 2,
      alignItems: 'center', justifyContent: 'center',
    },
    checkText: { fontSize: 13, fontWeight: '900' },

    // Create section
    createToggle: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 20, paddingVertical: 14,
    },
    createToggleText: { color: c.PURPLE, fontSize: 14, fontWeight: '700' },
    createRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
    createInput: {
      flex: 1, backgroundColor: c.SURFACE2, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      color: c.TEXT_P, fontSize: 14, borderWidth: 1, borderColor: c.BORDER,
    },
    createBtn: {
      backgroundColor: c.PURPLE, borderRadius: 10,
      paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
    },
    createBtnDis: { opacity: 0.4 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Done button
    doneWrap: { paddingHorizontal: 20, paddingTop: 12 },
    doneBtn: { backgroundColor: c.SURFACE2, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    doneBtnText: { color: c.TEXT_P, fontWeight: '700', fontSize: 14 },

    emptyText: { color: c.TEXT_S, fontSize: 14, textAlign: 'center', padding: 24 },
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
  c: Palette;
}) {
  const { t } = useTranslation('lists');
  return (
    <TouchableOpacity
      style={[styles.listItem, isAdded && styles.listItemAdded, item.color ? { backgroundColor: item.color + '10' } : undefined]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isPending}
    >
      <View style={[styles.listStrip, { backgroundColor: item.color ?? 'transparent' }]} />
      
      {item.sourceMediaPosterUrl ? (
        <Image 
          source={{ uri: item.sourceMediaPosterUrl }} 
          style={styles.listThumbnail} 
          contentFit="cover" 
        />
      ) : (
        <View style={[styles.listColorDot, { backgroundColor: (item.color || c.PURPLE) + '22', borderWidth: 2, borderColor: item.color || c.PURPLE }]} />
      )}

      <View style={styles.listInfo}>
        <Text style={styles.listName}>{item.name}</Text>
        <Text style={styles.listCount}>{t('wordCount', { count: item.totalWords })}</Text>
      </View>
      <View style={styles.listItemRight}>
        {isPending ? (
          <ActivityIndicator size="small" color={c.PURPLE} />
        ) : (
          <View style={[
            styles.checkCircle,
            {
              borderColor: isAdded ? c.PURPLE : c.BORDER,
              backgroundColor: isAdded ? c.PURPLE + '22' : 'transparent'
            },
          ]}>
            {isAdded && (
              <Text style={[styles.checkText, { color: c.PURPLE }]}>✓</Text>
            )}
          </View>
        )}
      </View>
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
  visible: boolean;
  wordId: number;
  wordName: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('lists');
  const { t: tCommon } = useTranslation('common');
  const { theme } = useTheme();
  const { prefs } = useListPreferences();
  const c = useMemo<Palette>(() => ({
    BG: theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surfaceSubtle,
    TEXT_P: theme.colors.textPrimary,
    TEXT_S: theme.colors.textSecondary,
    BORDER: theme.colors.borderDefault,
    PURPLE: theme.colors.primary,
  }), [theme]);
  const styles = useMemo(() => makeStyles(c), [c]);

  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');

  const { data: lists = [], isLoading: listsLoading } = useLists();
  const { data: containingIds = [] } = useListsContainingWord(wordId);
  const { mutate: addWord } = useAddWordToList();
  const { mutate: removeWord } = useRemoveWordFromList();
  const { mutate: createList, isPending: creating } = useCreateList();

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

  const handleToggleList = useCallback((listId: number) => {
    setPendingId(listId);
    if (addedIds.has(listId)) {
      // Remove
      removeWord(
        { listId, wordId },
        {
          onSuccess: () => {
            setAddedIds((prev) => {
              const next = new Set(prev);
              next.delete(listId);
              return next;
            });
            setPendingId(null);
          },
          onError: () => setPendingId(null),
        }
      );
    } else {
      // Add
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
    }
  }, [addedIds, addWord, removeWord, wordId]);

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

  // Only user-created & visible lists — system/curated lists are locked
  const customLists = useMemo(
    () => lists.filter((l) => !l.isSystem && !prefs.hiddenIds.includes(l.id)),
    [lists, prefs.hiddenIds],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>

          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {t('addToList', { name: wordName })}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Lists */}
          {listsLoading ? (
            <ActivityIndicator color={c.PURPLE} style={{ paddingVertical: 24 }} />
          ) : customLists.length === 0 ? (
            <Text style={styles.emptyText}>{t('noPersonalLists')}</Text>
          ) : (
            <FlatList
              data={customLists}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <ListRow
                  item={item}
                  isAdded={addedIds.has(item.id)}
                  isPending={pendingId === item.id}
                  onPress={() => handleToggleList(item.id)}
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
              {showCreate ? t('cancelCreate') : t('createNew')}
            </Text>
          </TouchableOpacity>

          {showCreate && (
            <View style={styles.createRow}>
              <TextInput
                style={styles.createInput}
                placeholder={t('listNamePlaceholder')}
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
                  : <Text style={styles.createBtnText}>{tCommon('actions.create')}</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Done */}
          <View style={styles.doneWrap}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.doneBtnText}>{tCommon('actions.done')}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
