import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/src/components/ui/Text';
import { useCategoryWords } from '@/src/api/queries/progress.queries';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

type CategoryType = 'learnt' | 'studied' | 'due' | 'difficult';

const getCategoryConfig = (t: any) => ({
  learnt: {
    title: t('progress.categories.learnt.title'),
    icon: 'book-outline' as const,
    color: '#4F46E5', // Indigo Blue
    emptyTitle: t('progress.categories.learnt.emptyTitle'),
    emptyDesc: t('progress.categories.learnt.emptyDesc'),
  },
  studied: {
    title: t('progress.categories.learnt.title'), // Fixed key reference if it was copy-pasted wrong in common.json
    icon: 'trending-up-outline' as const,
    color: '#D946EF', // Neon Purple/Magenta
    emptyTitle: t('progress.categories.studied.emptyTitle'),
    emptyDesc: t('progress.categories.studied.emptyDesc'),
  },
  due: {
    title: t('progress.categories.due.title'),
    icon: 'calendar-outline' as const,
    color: '#F43F5E', // Rose Red
    emptyTitle: t('progress.categories.due.emptyTitle'),
    emptyDesc: t('progress.categories.due.emptyDesc'),
  },
  difficult: {
    title: t('progress.categories.difficult.title'),
    icon: 'alert-circle-outline' as const,
    color: '#F59E0B', // Amber/Orange
    emptyTitle: t('progress.categories.difficult.emptyTitle'),
    emptyDesc: t('progress.categories.difficult.emptyDesc'),
  },
});

export default function CategoryWordsScreen() {
  const { category } = useLocalSearchParams<{ category: CategoryType }>();
  const router = useRouter();
  const { t } = useTranslation('common');
  const config = useMemo(() => getCategoryConfig(t)[category], [t, category]);

  const { data: words, isLoading } = useCategoryWords(category);
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const backgroundColor = theme.colors.background;
  const cardColor = theme.colors.surface;
  const textPrimary = theme.colors.textPrimary;
  const textSecondary = theme.colors.textSecondary;

  const playAudio = async (text: string) => {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      Speech.stop();
    }
    Speech.speak(text, { language: 'en-US', rate: 0.9 });
  };

  const renderItem = ({ item }: { item: any }) => {
    const meaning = item.definition?.meanings?.[0]?.definition;
    const diffText = item.difficulty ? item.difficulty.substring(0, 2) : 'A1';

    return (
      <View style={styles.row}>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowWord, { color: textPrimary }]}>{item.word}</Text>
          {!!meaning && (
            <Text style={[styles.rowMeaning, { color: textSecondary }]} numberOfLines={2}>
              {meaning}
            </Text>
          )}
          <View style={styles.rowMeta}>
            <View style={[styles.diffBadge, { backgroundColor: `${config.color}22` }]}>
              <Text style={[styles.diffText, { color: config.color }]}>{diffText}</Text>
            </View>
            <Text style={[styles.categoryLabel, { color: textSecondary }]}>
              {config.title}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.audioBtn,
            {
              borderColor: textSecondary,
            },
          ]}
          onPress={() => playAudio(item.word)}
          activeOpacity={0.7}
        >
          <Ionicons name="volume-medium" size={16} color={textSecondary} />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={config?.color || '#6366f1'} />
      </View>
    );
  }

  if (!config) {
    return (
      <View style={[styles.centerContainer, { backgroundColor }]}>
        <Text style={{ color: textPrimary }}>{t('progress.unknownKategory')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: cardColor }}>
        <View style={styles.customHeader}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: isDark ? '#ffffff10' : '#00000008' }]} 
            onPress={() => router.back()} 
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.customHeaderTitle, { color: textPrimary }]}>
            {config.title}
          </Text>
        </View>
        <View style={styles.separator} />
      </SafeAreaView>
      <FlatList
        data={words}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
              <Ionicons name={config.icon} size={32} color={config.color} />
            </View>
            <Text style={[styles.headerCount, { color: textPrimary }]}>
              {t('progress.wordCount', { count: words?.length || 0 })}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name={config.icon} size={64} color={config.color} style={{ opacity: 0.3, marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>{config.emptyTitle}</Text>
            <Text style={[styles.emptyDesc, { color: textSecondary }]}>{config.emptyDesc}</Text>
            
            <TouchableOpacity
              style={[styles.goBtn, { backgroundColor: config.color }]}
              onPress={() => router.push('/(tabs)/lists' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="school" size={22} color="white" />
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Custom Header
  customHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  customHeaderTitle: { fontSize: 20, fontWeight: '900', flex: 1 },
  separator: { height: 1, backgroundColor: '#8882', marginBottom: 0 },

  listContent: { paddingBottom: 24 },
  header: { alignItems: 'center', marginBottom: 24, paddingHorizontal: 16, paddingTop: 28 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  headerCount: { fontSize: 16, opacity: 0.7, fontWeight: '700' },
  
  // Standard WordRow Styles
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  rowInfo: { flex: 1 },
  rowWord: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  rowMeaning: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  rowMeta: { flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  diffText: { fontSize: 10, fontWeight: '800' },
  categoryLabel: { fontSize: 10, opacity: 0.6, fontWeight: '600' },

  // Audio button mimicking checkBtn
  audioBtn: { 
    width: 34, height: 34, borderRadius: 17, borderWidth: 1, 
    alignItems: 'center', justifyContent: 'center', marginLeft: 10 
  },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '900', marginTop: 0, textAlign: 'center' },
  emptyDesc: { fontSize: 14, opacity: 0.6, textAlign: 'center', marginTop: 10, lineHeight: 20, maxWidth: 280 },
  goBtn: { 
    marginTop: 28, 
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
});
