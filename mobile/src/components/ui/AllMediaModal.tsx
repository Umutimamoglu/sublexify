import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { OverallDifficultyBadge } from '@/src/components/ui/Badge';
import type { MediaDTO } from '@/src/types/api';

const CEFR_COLORS: Record<string, string> = {
  A1: '#34D399', A2: '#4ADE80',
  B1: '#FBBF24', B2: '#FB923C',
  C1: '#EF4444', C2: '#A855F7',
};

const CARD_ACCENTS = [
  { darkBg: '#1a0f2e', lightBg: '#2d1a4a', accent: '#9333ea' },
  { darkBg: '#0f1a2e', lightBg: '#1a2d4a', accent: '#3b82f6' },
  { darkBg: '#1a1a0f', lightBg: '#2a2a0f', accent: '#ca8a04' },
  { darkBg: '#0f1a1a', lightBg: '#1a2d2d', accent: '#10b981' },
  { darkBg: '#1a0f0f', lightBg: '#2d1515', accent: '#ef4444' },
] as const;

function cardAccent(id: number) {
  return CARD_ACCENTS[id % CARD_ACCENTS.length];
}

function seriesTitle(media: MediaDTO): string {
  if (media.type !== 'MOVIE') {
    const idx = media.title.indexOf(' - ');
    if (idx > 0) return media.title.substring(0, idx);
  }
  return media.title;
}

type MediaFilter = 'all' | 'movie' | 'series';

function deduplicateMedia(items: MediaDTO[], filter: MediaFilter): MediaDTO[] {
  const seen = new Set<string>();
  return items.filter((m) => {
    if (m.type === 'MOVIE') {
      if (filter === 'series') return false;
      return true;
    }
    if (m.type === 'EPISODE' || m.type === 'SEASON') {
      if (filter === 'movie') return false;
      if (!m.imdbId) return false;
      if (seen.has(m.imdbId)) return false;
      seen.add(m.imdbId);
      return true;
    }
    return false;
  });
}

type Props = {
  visible: boolean;
  onClose: () => void;
  allMedia: MediaDTO[];
  loading?: boolean;
  onNavigate: (item: MediaDTO) => void;
};

export function AllMediaModal({ visible, onClose, allMedia, loading, onNavigate }: Props) {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation('discover');
  const { t: tCommon } = useTranslation('common');
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<TextInput>(null);

  // Reset state when modal opens; no auto-focus so keyboard doesn't block the close button
  useEffect(() => {
    if (visible) {
      setFilter('all');
      setSearchQuery('');
    }
  }, [visible]);

  const NUM_COLS = 3;
  const CARD_GAP = 10;
  const H_PAD = 16;
  const cardWidth = (width - H_PAD * 2 - CARD_GAP * (NUM_COLS - 1)) / NUM_COLS;

  const filtered = useMemo(() => {
    const base = deduplicateMedia(allMedia, filter);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((m) => seriesTitle(m).toLowerCase().includes(q));
  }, [allMedia, filter, searchQuery]);

  const c = {
    BG: theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surfaceSubtle,
    TEXT_P: theme.colors.textPrimary,
    TEXT_S: theme.colors.textSecondary,
    BORDER: theme.colors.borderDefault,
    PURPLE: theme.colors.primary,
  };

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.BORDER,
    },
    headerTitle: { flex: 1, color: c.TEXT_P, fontSize: 17, fontWeight: '800' },
    closeBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center',
    },
    closeText: { color: c.TEXT_S, fontSize: 16 },
    searchRow: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 16, marginTop: 12,
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: 14, borderWidth: 1,
      borderColor: c.BORDER, backgroundColor: c.SURFACE2, gap: 8,
    },
    searchIcon: { color: c.TEXT_S, fontSize: 18 },
    searchInput: { flex: 1, color: c.TEXT_P, fontSize: 15, padding: 0 },
    searchClear: { padding: 4 },
    searchClearText: { color: c.TEXT_S, fontSize: 14 },
    filterRow: {
      flexDirection: 'row', paddingHorizontal: 16,
      paddingTop: 12, paddingBottom: 4, gap: 8,
    },
    chip: {
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1, borderColor: c.BORDER, backgroundColor: c.SURFACE2,
    },
    chipActive: { backgroundColor: c.PURPLE, borderColor: c.PURPLE },
    chipText: { color: c.TEXT_S, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#ffffff' },
    count: { color: c.TEXT_S, fontSize: 12, paddingHorizontal: 16, paddingVertical: 8 },
    grid: { paddingHorizontal: H_PAD, paddingBottom: 32 },
    card: {
      width: cardWidth, borderRadius: 12,
      overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff15',
      marginBottom: CARD_GAP,
    },
    badgeWrapper: { position: 'absolute', top: 6, left: 6, zIndex: 10 },
    poster: { width: '100%', height: cardWidth * 1.4 },
    posterPlaceholder: {
      height: cardWidth * 1.4, alignItems: 'center', justifyContent: 'center',
    },
    posterLetter: { fontSize: 36, fontWeight: '900', opacity: 0.7 },
    cefrBar: { flexDirection: 'row', height: 3, overflow: 'hidden' },
    cardTitle: {
      color: '#ffffff', fontSize: 11, fontWeight: '600',
      textAlign: 'center', paddingTop: 5, paddingHorizontal: 5, paddingBottom: 6,
    },
    emptyWrap: { alignItems: 'center', gap: 8, paddingTop: 80 },
    emptyIcon: { fontSize: 36 },
    emptyText: { color: c.TEXT_S, fontSize: 14, textAlign: 'center' },
    loader: { paddingTop: 60 },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <SafeAreaView style={styles.safeArea} edges={Platform.OS === 'ios' ? [] : ['top']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('allMediaTitle')}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={c.TEXT_S}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity style={styles.searchClear} onPress={() => setSearchQuery('')}>
                <Text style={styles.searchClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter chips */}
          <View style={styles.filterRow}>
            {(['all', 'movie', 'series'] as MediaFilter[]).map((f) => {
              const label = f === 'all' ? t('allContent') : f === 'movie' ? t('movies') : t('series');
              const active = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.count}>{filtered.length} {t('contentCount')}</Text>

          {loading ? (
            <ActivityIndicator color={c.PURPLE} style={styles.loader} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>{searchQuery.trim() ? '🔍' : '🎬'}</Text>
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? `"${searchQuery.trim()}" ${t('noSearchResult')}` : t('noContent')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              numColumns={NUM_COLS}
              keyExtractor={(item) => `${item.id}-${item.imdbId}`}
              contentContainerStyle={styles.grid}
              columnWrapperStyle={{ gap: CARD_GAP }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const title = seriesTitle(item);
                const overallDiff = item.overallDifficulty;
                const { darkBg, lightBg, accent } = cardAccent(item.id);
                const cefrTotal = Object.values(item.levelCounts ?? {}).reduce((a, b) => a + b, 0);

                return (
                  <TouchableOpacity
                    style={[styles.card, { backgroundColor: isDark ? darkBg : lightBg }]}
                    activeOpacity={0.82}
                    onPress={() => {
                      onClose();
                      setTimeout(() => onNavigate(item), 250);
                    }}
                  >
                    {overallDiff && (
                      <View style={styles.badgeWrapper}>
                        <OverallDifficultyBadge level={overallDiff} label={tCommon(`media.difficulty_labels.${overallDiff}`)} size="sm" />
                      </View>
                    )}

                    {item.posterUrl ? (
                      <Image source={{ uri: item.posterUrl }} style={styles.poster} resizeMode="cover" />
                    ) : (
                      <View style={[styles.posterPlaceholder, { backgroundColor: accent + '22' }]}>
                        <Text style={[styles.posterLetter, { color: accent }]}>{title.charAt(0)}</Text>
                      </View>
                    )}

                    {cefrTotal > 0 && (
                      <View style={styles.cefrBar}>
                        {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((lv) => {
                          const count = item.levelCounts?.[lv] ?? 0;
                          if (count === 0) return null;
                          return (
                            <View
                              key={lv}
                              style={{ flex: count / cefrTotal, height: 3, backgroundColor: CEFR_COLORS[lv] }}
                            />
                          );
                        })}
                      </View>
                    )}

                    <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
