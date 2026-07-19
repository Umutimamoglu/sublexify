import { useRef, useEffect, useState, useMemo } from 'react';
import { View, Modal, FlatList, TouchableOpacity, TextInput, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';
import { PremiumBadge } from '@/src/components/ui/PremiumBadge';
import { useTranslation } from '@/src/i18n/useTranslation';
import { DifficultyBadge } from '@/src/components/ui/Badge';
import type { MediaDTO } from '@/src/types/api';
import { Text } from '@/src/components/ui/Text';


function seriesTitle(media: MediaDTO): string {
  if (media.type !== 'MOVIE') {
    const idx = media.title.indexOf(' - ');
    if (idx > 0) return media.title.substring(0, idx);
  }
  return media.title;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  allMedia: MediaDTO[];
  loading?: boolean;
  onNavigate: (item: MediaDTO) => void;
};

export function SearchBottomSheet({ visible, onClose, allMedia, loading, onNavigate }: Props) {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation('discover');
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    return allMedia.filter((m) => {
      if (m.type !== 'MOVIE' && m.type !== 'EPISODE' && m.type !== 'SEASON') return false;
      if (m.type !== 'MOVIE') {
        if (!m.imdbId) return false;
        if (seen.has(m.imdbId)) return false;
        seen.add(m.imdbId);
      }
      return seriesTitle(m).toLowerCase().includes(q);
    });
  }, [allMedia, query]);

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
    overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.SURFACE,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingBottom: insets.bottom + 16,
      maxHeight: '88%',
    },
    handle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: c.BORDER, alignSelf: 'center', marginBottom: 12,
    },
    searchRow: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 16, marginBottom: 8,
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: 14, borderWidth: 1,
      borderColor: c.BORDER, backgroundColor: c.SURFACE2, gap: 8,
    },
    searchIcon: { color: c.TEXT_S, fontSize: 18 },
    input: { flex: 1, color: c.TEXT_P, fontSize: 15, padding: 0 },
    closeBtn: { padding: 4 },
    closeText: { color: c.TEXT_S, fontSize: 16 },
    emptyWrap: { paddingVertical: 48, alignItems: 'center', gap: 8 },
    emptyIcon: { fontSize: 32 },
    emptyText: { color: c.TEXT_S, fontSize: 14 },
    hintWrap: { paddingVertical: 48, alignItems: 'center', gap: 8 },
    hintIcon: { fontSize: 32 },
    hintText: { color: c.TEXT_S, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
    item: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: c.BORDER, gap: 12,
    },
    poster: { width: 48, height: 64, borderRadius: 8, backgroundColor: c.SURFACE2 },
    posterPlaceholder: {
      width: 48, height: 64, borderRadius: 8,
      backgroundColor: c.SURFACE2, alignItems: 'center', justifyContent: 'center',
    },
    posterLetter: { color: c.PURPLE, fontSize: 22, fontWeight: '800' },
    itemInfo: { flex: 1, gap: 4 },
    itemTitle: { color: c.TEXT_P, fontSize: 14, fontWeight: '700' },
    itemSub: { color: c.TEXT_S, fontSize: 12 },
    badgeWrap: { alignItems: 'flex-end' },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            {/* Search input */}
            <View style={styles.searchRow}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor={c.TEXT_S}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <TouchableOpacity style={styles.closeBtn} onPress={() => setQuery('')}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator color={c.PURPLE} />
              </View>
            ) : query.trim().length === 0 ? (
              <View style={styles.hintWrap}>
                <Text style={styles.hintIcon}>🎬</Text>
                <Text style={styles.hintText}>{t('searchHint')}</Text>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>{`"${query.trim()}" ${t('noSearchResult')}`}</Text>
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => `${item.id}-${item.imdbId}`}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const title = seriesTitle(item);
                  const diff = (item.difficultyLevel as any) ?? '-';
                  return (
                    <TouchableOpacity
                      style={styles.item}
                      activeOpacity={0.75}
                      onPress={() => {
                        onClose();
                        setTimeout(() => onNavigate(item), 200);
                      }}
                    >
                      {item.posterUrl ? (
                        <Image source={{ uri: item.posterUrl }} style={styles.poster} resizeMode="cover" />
                      ) : (
                        <View style={styles.posterPlaceholder}>
                          <Text style={styles.posterLetter}>{title.charAt(0)}</Text>
                        </View>
                      )}
                      <View style={styles.itemInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <Text style={styles.itemTitle}>{title}</Text>
                          {item.isPremium && <PremiumBadge />}
                        </View>
                        <Text style={styles.itemSub}>{item.type === 'MOVIE' ? t('movies') : t('series')}</Text>
                      </View>
                      <View style={styles.badgeWrap}>
                        <DifficultyBadge difficulty={diff} size="sm" />
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
