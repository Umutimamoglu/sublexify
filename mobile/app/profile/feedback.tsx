import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useFeedbackMutations } from '@/src/api/queries/feedback.queries';

export default function FeedbackScreen() {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { t } = useTranslation('feedback');
  const { submitFeedback } = useFeedbackMutations();

  const CATEGORIES = [
    { id: 'BUG', label: t('bug'), icon: 'bug-outline' },
    { id: 'SUGGESTION', label: t('suggestion'), icon: 'bulb-outline' },
    { id: 'OTHER', label: t('other'), icon: 'chatbox-outline' },
  ];

  const [category, setCategory] = useState<'BUG' | 'SUGGESTION' | 'OTHER'>('SUGGESTION');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert(t('warning'), t('emptyWarning'));
      return;
    }

    try {
      await submitFeedback.mutateAsync({ message, category });
      Alert.alert(t('success'), t('successDesc'), [
        { text: t('confirm'), onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(t('error'), t('errorDesc'));
    }
  };

  const c = theme.colors;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.textPrimary }]}>{t('title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.label, { color: c.textSecondary }]}>{t('category')}</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    { 
                      backgroundColor: category === cat.id ? c.primary : (isDark ? '#1e1e2d' : '#f0f0f5'),
                      borderColor: category === cat.id ? c.primary : 'transparent'
                    }
                  ]}
                  onPress={() => setCategory(cat.id as any)}
                >
                  <Ionicons 
                    name={cat.icon as any} 
                    size={22} 
                    color={category === cat.id ? '#fff' : c.textSecondary} 
                  />
                  <Text style={[styles.categoryLabel, { color: category === cat.id ? '#fff' : c.textPrimary }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: c.textSecondary, marginTop: 24 }]}>{t('messageLabel')}</Text>
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: isDark ? '#1e1e2d' : '#f0f0f5',
                  color: c.textPrimary,
                  textAlignVertical: 'top'
                }
              ]}
              placeholder={t('placeholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              multiline
              numberOfLines={6}
              value={message}
              onChangeText={setMessage}
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: c.primary }]}
              onPress={handleSubmit}
              disabled={submitFeedback.isPending}
            >
              {submitFeedback.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t('submit')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  categoryRow: { flexDirection: 'row', gap: 10 },
  categoryCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  categoryLabel: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  input: {
    borderRadius: 12,
    padding: 16,
    height: 160,
    fontSize: 15,
  },
  submitBtn: {
    marginTop: 32,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
