import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Keyboard,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';
import { Text } from '@/src/components/ui/Text';
import { useUpsertWordNote, useDeleteWordNote } from '@/src/api/queries/words.queries';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const MAX_NOTE_LENGTH = 300;

interface NoteEditSheetProps {
  visible: boolean;
  wordId: number | null;
  wordName?: string;
  currentNote?: string | null;
  onClose: () => void;
  onSaved?: (note: string | null) => void;
}

export function NoteEditSheet({
  visible,
  wordId,
  wordName,
  currentNote,
  onClose,
  onSaved,
}: NoteEditSheetProps) {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(currentNote ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const translateY = useSharedValue(400);
  const opacity = useSharedValue(0);

  const { mutate: upsertNote } = useUpsertWordNote();
  const { mutate: deleteNote } = useDeleteWordNote();

  const c = {
    BG: theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surface2 ?? (isDark ? '#1e1e2e' : '#f0f0f5'),
    TEXT_P: theme.colors.text,
    TEXT_S: theme.colors.textSecondary ?? (isDark ? '#888' : '#666'),
    BORDER: theme.colors.border ?? (isDark ? '#333' : '#ddd'),
    PURPLE: theme.colors.primary,
    AMBER: '#F59E0B',
  };

  useEffect(() => {
    setText(currentNote ?? '');
  }, [currentNote, visible]);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 250, mass: 0.8 });
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      opacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(400, { duration: 200 });
    }
  }, [visible, opacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleSave = useCallback(() => {
    if (!wordId || !text.trim()) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    upsertNote(
      { wordId, note: text.trim() },
      {
        onSuccess: () => {
          setIsSaving(false);
          onSaved?.(text.trim());
          Keyboard.dismiss();
          onClose();
        },
        onError: () => setIsSaving(false),
      },
    );
  }, [wordId, text, upsertNote, onSaved, onClose]);

  const handleDelete = useCallback(() => {
    if (!wordId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    deleteNote(wordId, {
      onSuccess: () => {
        setText('');
        onSaved?.(null);
        Keyboard.dismiss();
        onClose();
      },
    });
  }, [wordId, deleteNote, onSaved, onClose]);

  const remaining = MAX_NOTE_LENGTH - text.length;
  const isOverLimit = remaining < 0;
  const canSave = text.trim().length > 0 && !isOverLimit;

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <Reanimated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#00000080' }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Reanimated.View>

        {/* Sheet */}
        <Reanimated.View
          style={[
            styles.sheet,
            {
              backgroundColor: c.SURFACE,
              paddingBottom: insets.bottom + 16,
              borderTopColor: c.BORDER,
            },
            sheetStyle,
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: c.BORDER }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="document-text-outline" size={24} color={c.TEXT_P} />
              <View>
                <Text style={[styles.title, { color: c.TEXT_P }]}>Kişisel Notun</Text>
                {!!wordName && (
                  <Text style={[styles.subtitle, { color: c.AMBER }]}>{wordName}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={c.TEXT_S} />
            </TouchableOpacity>
          </View>

          {/* Text Input */}
          <View style={[styles.inputContainer, { backgroundColor: c.SURFACE2, borderColor: c.BORDER }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: c.TEXT_P }]}
              value={text}
              onChangeText={setText}
              placeholder="Bu kelimeyle ilgili aklında ne var? Bir bağlam, hafıza kancası, anekdot..."
              placeholderTextColor={c.TEXT_S}
              multiline
              maxLength={MAX_NOTE_LENGTH + 20}
              textAlignVertical="top"
              returnKeyType="done"
            />
          </View>

          {/* Character counter */}
          <Text style={[
            styles.counter,
            { color: isOverLimit ? '#EF4444' : remaining < 30 ? '#F59E0B' : c.TEXT_S },
          ]}>
            {remaining < 60 ? `${remaining} karakter kaldı` : `${text.length}/${MAX_NOTE_LENGTH}`}
          </Text>

          {/* Action buttons */}
          <View style={styles.btnRow}>
            {!!currentNote && (
              <TouchableOpacity
                style={[styles.btn, styles.deleteBtn, { borderColor: '#EF444455' }]}
                onPress={handleDelete}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.deleteBtnText}>Notu Sil</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btn,
                styles.saveBtn,
                { backgroundColor: canSave ? c.PURPLE : c.SURFACE2, flex: 1 },
              ]}
              onPress={handleSave}
              disabled={!canSave || isSaving}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveBtnText, { color: canSave ? '#fff' : c.TEXT_S }]}>
                {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteIcon: { fontSize: 24 },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  closeBtn: { padding: 6 },
  closeText: { fontSize: 18, fontWeight: '600' },
  inputContainer: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 100,
  },
  input: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
  },
  counter: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 12,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  deleteBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
  saveBtn: {},
  saveBtnText: { fontWeight: '800', fontSize: 15 },
});
