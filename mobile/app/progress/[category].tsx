import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Text } from '@/src/components/ui/Text';
import { useCategoryWords } from '@/src/api/queries/progress.queries';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

type CategoryType = 'learnt' | 'studied' | 'due' | 'mastered';

const CATEGORY_CONFIG = {
  learnt: {
    title: 'Öğrenilen Kelimeler',
    icon: 'book-outline' as const,
    color: '#3B82F6',
    emptyTitle: 'Henüz kelime yok',
    emptyDesc: 'Listelerinize kelime ekleyerek öğrenmeye başlayın!',
  },
  studied: {
    title: 'Çalışılan Kelimeler',
    icon: 'trending-up-outline' as const,
    color: '#A855F7',
    emptyTitle: 'Henüz çalışılan kelime yok',
    emptyDesc: 'Kelime testlerini çözerek bu listeyi doldurun!',
  },
  due: {
    title: 'Tekrar Bekleyenler',
    icon: 'calendar-outline' as const,
    color: '#F43F5E',
    emptyTitle: 'Tekrar yok',
    emptyDesc: 'Bugün için tekrar edilecek kelimeniz bulunmuyor.',
  },
  mastered: {
    title: 'Ustalaşılan Kelimeler',
    icon: 'star-outline' as const,
    color: '#10B981',
    emptyTitle: 'Henüz ustalaşılan kelime yok',
    emptyDesc: 'Testlerde başarılı oldukça kelimeler buraya düşecek!',
  },
};

export default function CategoryWordsScreen() {
  const { category } = useLocalSearchParams<{ category: CategoryType }>();
  const config = CATEGORY_CONFIG[category];

  const { data: words, isLoading } = useCategoryWords(category);
  const { theme } = useTheme();

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

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: cardColor, borderColor: `${config.color}30` }]}>
      <View style={styles.cardLeft}>
        <View style={[styles.difficultyBadge, { backgroundColor: `${config.color}15` }]}>
          <Text style={[styles.difficultyText, { color: config.color }]}>
            {item.difficulty?.substring(0, 2) || 'A1'}
          </Text>
        </View>
        <View>
          <Text style={[styles.wordText, { color: textPrimary }]}>{item.word}</Text>
          <Text style={[styles.categoryLabel, { color: textSecondary }]}>{config.title}</Text>
        </View>
      </View>
      <Ionicons 
        name="volume-medium" 
        size={24} 
        color={config.color} 
        onPress={() => playAudio(item.word)} 
        style={styles.audioIcon}
      />
    </View>
  );

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
        <Text style={{ color: textPrimary }}>Bilinmeyen Kategori.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen 
        options={{ 
          title: config.title,
          headerStyle: { backgroundColor: cardColor },
          headerTintColor: config.color,
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />
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
              {words?.length || 0} kelime
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name={config.icon} size={64} color={textSecondary} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>{config.emptyTitle}</Text>
            <Text style={[styles.emptyDesc, { color: textSecondary }]}>{config.emptyDesc}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  headerCount: { fontSize: 16, opacity: 0.7 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  difficultyText: { fontWeight: 'bold', fontSize: 14 },
  wordText: { fontSize: 18, fontWeight: 'bold', textTransform: 'capitalize' },
  categoryLabel: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  audioIcon: { padding: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptyDesc: { fontSize: 14, opacity: 0.6, textAlign: 'center', marginTop: 8, maxWidth: 250 },
});
