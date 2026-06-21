import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, StatusBar, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { Text } from '@/src/components/ui/Text';
import {
  useNotifications,
  useMarkAllRead,
  type AppNotification,
} from '@/src/api/queries/notifications.queries';

type Palette = {
  BG: string; SURFACE: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
};

function makeStyles(c: Palette, isDark: boolean, isTablet: boolean) {
  const pad = isTablet ? 32 : 20;
  return StyleSheet.create({
    root:     { flex: 1, backgroundColor: c.BG },
    safeArea: { flex: 1, backgroundColor: c.BG },

    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: pad, paddingTop: 20, paddingBottom: 16, gap: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: isDark ? '#ffffff10' : '#00000008',
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
      color: c.TEXT_P, fontSize: 14, fontWeight: '800',
      letterSpacing: 1.2, textTransform: 'uppercase', flex: 1,
    },
    markReadBtn: {
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 10, backgroundColor: c.PURPLE + '20',
    },
    markReadText: { color: c.PURPLE, fontSize: 12, fontWeight: '700' },

    separator: { height: 1, backgroundColor: isDark ? '#ffffff0f' : '#e0e0ea', marginBottom: 8 },

    // Notification row
    row: {
      flexDirection: 'row', alignItems: 'flex-start',
      paddingHorizontal: pad, paddingVertical: 14, gap: 12,
    },
    unreadDot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: c.PURPLE, marginTop: 6,
    },
    readDot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: 'transparent', marginTop: 6,
    },
    iconBox: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: c.PURPLE + '18',
      alignItems: 'center', justifyContent: 'center',
    },
    textBlock: { flex: 1, gap: 2 },
    rowTitle: { color: c.TEXT_P, fontSize: 14, fontWeight: '700', lineHeight: 20 },
    rowBody:  { color: c.TEXT_S, fontSize: 13, lineHeight: 18 },
    rowTime:  { color: c.TEXT_S, fontSize: 11, marginTop: 4 },
    rowDivider: { height: 1, backgroundColor: isDark ? '#ffffff07' : '#f0f0f5', marginLeft: pad + 8 + 40 + 12 },

    // Empty
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
    emptyIcon: { fontSize: 52 },
    emptyTitle: { color: c.TEXT_P, fontSize: 18, fontWeight: '800' },
    emptyDesc:  { color: c.TEXT_S, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  });
}

function getIcon(type: string | null): string {
  switch (type) {
    case 'media_request_approved': return 'checkmark-circle';
    case 'admin_direct':           return 'megaphone';
    case 'admin_broadcast':        return 'radio';
    default:                       return 'notifications';
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Şimdi';
  if (diffMin < 60) return `${diffMin}dk önce`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}sa önce`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}g önce`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation('profile');
  const { isTablet } = useResponsive();
  const router = useRouter();

  const { data: notifications, isLoading } = useNotifications();
  const { mutate: markAllRead } = useMarkAllRead();

  const c = useMemo<Palette>(() => ({
    BG:      theme.colors.background,
    SURFACE: theme.colors.surface,
    TEXT_P:  theme.colors.textPrimary,
    TEXT_S:  theme.colors.textSecondary,
    BORDER:  theme.colors.borderDefault,
    PURPLE:  theme.colors.primary,
  }), [theme]);

  const styles = useMemo(() => makeStyles(c, isDark, isTablet), [c, isDark, isTablet]);

  const hasUnread = notifications?.some(n => !n.read) ?? false;

  const renderItem = ({ item, index }: { item: AppNotification; index: number }) => (
    <>
      <View style={styles.row}>
        <View style={item.read ? styles.readDot : styles.unreadDot} />
        <View style={styles.iconBox}>
          <Ionicons name={getIcon(item.type) as any} size={20} color={c.PURPLE} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowBody}>{item.body}</Text>
          <Text style={styles.rowTime}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
      {index < (notifications?.length ?? 0) - 1 && <View style={styles.rowDivider} />}
    </>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.BG} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={c.TEXT_P} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notifications')}</Text>
          {hasUnread && (
            <TouchableOpacity style={styles.markReadBtn} onPress={() => markAllRead()} activeOpacity={0.7}>
              <Text style={styles.markReadText}>Tümünü oku</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.separator} />

        {isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={c.PURPLE} />
          </View>
        ) : !notifications?.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
            <Text style={styles.emptyDesc}>Medya istekleriniz onaylandığında ve önemli güncellemeler geldiğinde burada görünecek.</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
