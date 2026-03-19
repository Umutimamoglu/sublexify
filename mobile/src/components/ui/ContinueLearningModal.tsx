import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';
import type { MediaDTO } from '@/src/types/api';

function episodeLabel(media: MediaDTO): string {
  if (media.type === 'EPISODE' && media.seasonNumber && media.episodeNumber) {
    return `S${media.seasonNumber}:E${media.episodeNumber}`;
  }
  if (media.type === 'MOVIE') return 'Film';
  return media.type;
}

function displayTitle(media: MediaDTO): string {
  if (media.type !== 'MOVIE') {
    const idx = media.title.indexOf(' - ');
    if (idx > 0) return media.title.substring(0, idx);
  }
  return media.title;
}

const CARD_ACCENTS = [
  { darkBg: '#1a0f2e', accent: '#9333ea' },
  { darkBg: '#0f1a2e', accent: '#3b82f6' },
  { darkBg: '#1a1a0f', accent: '#ca8a04' },
  { darkBg: '#0f1a1a', accent: '#10b981' },
  { darkBg: '#1a0f0f', accent: '#ef4444' },
] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  media: MediaDTO[];
  onNavigate: (item: MediaDTO) => void;
};

export function ContinueLearningModal({ visible, onClose, media, onNavigate }: Props) {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

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
    item: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: c.BORDER, gap: 14,
    },
    poster: { width: 64, height: 88, borderRadius: 10, backgroundColor: c.SURFACE2 },
    posterPlaceholder: {
      width: 64, height: 88, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    posterLetter: { fontSize: 26, fontWeight: '900' },
    info: { flex: 1, gap: 4 },
    itemTitle: { color: c.TEXT_P, fontSize: 15, fontWeight: '700' },
    itemEpisode: {
      alignSelf: 'flex-start',
      backgroundColor: c.SURFACE2,
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 6, borderWidth: 1, borderColor: c.BORDER,
    },
    itemEpisodeText: { color: c.TEXT_S, fontSize: 11, fontWeight: '600' },
    chevron: { color: c.TEXT_S, fontSize: 16 },
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
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Öğrenmeye Devam Et</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={media}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const { darkBg, accent } = CARD_ACCENTS[item.id % CARD_ACCENTS.length];
              const title = displayTitle(item);
              return (
                <TouchableOpacity
                  style={styles.item}
                  activeOpacity={0.75}
                  onPress={() => {
                    onClose();
                    setTimeout(() => onNavigate(item), 250);
                  }}
                >
                  {item.posterUrl ? (
                    <Image source={{ uri: item.posterUrl }} style={styles.poster} resizeMode="cover" />
                  ) : (
                    <View style={[styles.posterPlaceholder, { backgroundColor: isDark ? darkBg : accent + '22' }]}>
                      <Text style={[styles.posterLetter, { color: accent }]}>{title.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.info}>
                    <Text style={styles.itemTitle} numberOfLines={2}>{title}</Text>
                    <View style={styles.itemEpisode}>
                      <Text style={styles.itemEpisodeText}>{episodeLabel(item)}</Text>
                    </View>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}
