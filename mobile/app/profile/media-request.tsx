import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useFeedbackMutations, useTmdbSearch } from '@/src/api/queries/feedback.queries';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w200';

export default function MediaRequestScreen() {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { t } = useTranslation('mediaRequest');
  const { t: tCommon } = useTranslation('common');
  const { submitMediaRequests } = useFeedbackMutations();

  const [query, setQuery] = useState('');
  const [type, setType] = useState<'movie' | 'tv'>('tv');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  const { data: results, isLoading } = useTmdbSearch(query, type);

  const toggleSelection = (item: any) => {
    const isSelected = selectedItems.find((s) => s.id === item.id);
    if (isSelected) {
      setSelectedItems((prev) => prev.filter((s) => s.id !== item.id));
    } else {
      setSelectedItems((prev) => [...prev, item]);
    }
  };

  const handleSendRequests = async () => {
    if (selectedItems.length === 0) return;

    try {
      const requests = selectedItems.map((item) => ({
        tmdbId: item.id,
        title: item.title || item.name,
        posterPath: item.posterPath,
        mediaType: type === 'movie' ? 'MOVIE' : 'SERIES',
      }));

      await submitMediaRequests.mutateAsync(requests as any);
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

        <View style={styles.content}>
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1e1e2d' : '#f0f0f5' }]}>
            <Ionicons name="search" size={20} color={c.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: c.textPrimary }]}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {/* Type Selector */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              onPress={() => { setType('tv'); setQuery(''); setSelectedItems([]); }}
              style={[styles.typeBtn, type === 'tv' && { backgroundColor: c.primary }]}
            >
              <Text style={[styles.typeBtnText, { color: type === 'tv' ? '#fff' : c.textSecondary }]}>{t('series')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setType('movie'); setQuery(''); setSelectedItems([]); }}
              style={[styles.typeBtn, type === 'movie' && { backgroundColor: c.primary }]}
            >
              <Text style={[styles.typeBtnText, { color: type === 'movie' ? '#fff' : c.textSecondary }]}>{t('movies')}</Text>
            </TouchableOpacity>
          </View>

          {/* Results */}
          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
          ) : query.length < 2 ? (
            <View style={styles.emptyView}>
              <Ionicons name="search-outline" size={64} color={isDark ? '#2a2a35' : '#e0e0ea'} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>{t('minChars')}</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id.toString()}
              numColumns={3}
              contentContainerStyle={{ paddingBottom: 100 }}
              renderItem={({ item }) => {
                const isSelected = !!selectedItems.find((s) => s.id === item.id);
                return (
                  <TouchableOpacity
                    style={styles.itemCard}
                    onPress={() => toggleSelection(item)}
                  >
                    <View style={[styles.posterWrapper, isSelected && { borderColor: c.primary, borderWidth: 3 }]}>
                      {item.poster_path || item.posterPath ? (
                        <Image
                          source={{ uri: `${TMDB_IMAGE_BASE}${item.poster_path || item.posterPath}` }}
                          style={styles.poster}
                        />
                      ) : (
                        <View style={[styles.noPoster, { backgroundColor: isDark ? '#2a2a35' : '#e0e0ea' }]}>
                          <Ionicons name="image-outline" size={24} color={c.textSecondary} />
                        </View>
                      )}
                      {isSelected && (
                        <View style={[styles.selectionBadge, { backgroundColor: c.primary }]}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.itemTitle, { color: c.textPrimary }]} numberOfLines={2}>
                      {item.title || item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* Footer Action */}
        {selectedItems.length > 0 && (
          <View style={[styles.footer, { backgroundColor: c.surface, borderTopColor: isDark ? '#ffffff0f' : '#e0e0ea' }]}>
            <Text style={[styles.selectedCount, { color: c.textPrimary }]}>
              {t('selectedCount', { count: selectedItems.length })}
            </Text>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: c.primary }]}
              onPress={handleSendRequests}
              disabled={submitMediaRequests.isPending}
            >
              {submitMediaRequests.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>{t('submit')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  content: { flex: 1, paddingHorizontal: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: { flex: 1, height: 44, fontSize: 15 },
  typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  typeBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
  typeBtnText: { fontSize: 13, fontWeight: '700' },
  emptyView: { flex: 0.7, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 16, fontSize: 14, fontWeight: '600' },
  itemCard: { flex: 1/3, marginBottom: 16, padding: 4 },
  posterWrapper: {
    aspectRatio: 2/3,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  poster: { width: '100%', height: '100%' },
  noPoster: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  selectionBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  selectedCount: { fontSize: 14, fontWeight: '700' },
  sendBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
