import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useDeleteAccount } from '@/src/api/queries/user.queries';
import { Text } from '@/src/components/ui/Text';


const PRIVACY_POLICY_URL = 'https://www.freeprivacypolicy.com/live/479d8ae8-c4ce-45c2-9bbe-6291cb27b2d1';

type Palette = {
  BG: string; SURFACE: string; SURFACE2: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string; DANGER: string;
};

function makeStyles(c: Palette, isDark: boolean, isTablet: boolean) {
  const pad = isTablet ? 32 : 20;
  const cardBorder = isDark ? '#ffffff0f' : c.BORDER;

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

    separator: { height: 1, backgroundColor: isDark ? '#ffffff0f' : '#e0e0ea', marginBottom: 24 },
    body: { paddingHorizontal: pad, gap: 24 },

    sectionLabel: {
      color: c.TEXT_S, fontSize: 11, fontWeight: '700',
      letterSpacing: 1.2, textTransform: 'uppercase',
      marginBottom: 12, marginTop: 8,
    },
    card: {
      backgroundColor: c.SURFACE, borderRadius: 18, padding: 20,
      borderWidth: 1, borderColor: cardBorder, gap: 16,
    },
    row:       { gap: 4 },
    rowLabel:  { color: c.TEXT_S, fontSize: 12, fontWeight: '600' },
    rowValue:  { color: c.TEXT_P, fontSize: 16, fontWeight: '600' },

    tile: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: c.SURFACE, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: cardBorder,
    },
    tileIcon:   { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    tileTexts:  { flex: 1 },
    tileTitle:  { color: c.TEXT_P, fontSize: 15, fontWeight: '700' },
    tileDesc:   { color: c.TEXT_S, fontSize: 12, marginTop: 2 },

    dangerCard: {
      backgroundColor: isDark ? '#2a0a0a' : '#fff5f5',
      borderRadius: 18, padding: 20,
      borderWidth: 1, borderColor: isDark ? '#5a1a1a' : '#fecaca',
    },
    dangerLabel: {
      color: c.DANGER, fontSize: 11, fontWeight: '700',
      letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
    },
    deleteTile:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
    deleteIcon:  {
      width: 38, height: 38, borderRadius: 10,
      backgroundColor: isDark ? '#3d1010' : '#fee2e2',
      alignItems: 'center', justifyContent: 'center',
    },
    deleteTexts: { flex: 1 },
    deleteTitle: { color: c.DANGER, fontSize: 15, fontWeight: '700' },
    deleteDesc:  { color: isDark ? '#f87171' : '#ef4444', fontSize: 12, opacity: 0.7, marginTop: 2 },

    // Confirm modal
    overlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.SURFACE,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
      paddingHorizontal: 24, paddingTop: 12,
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: isDark ? '#ffffff30' : '#00000020',
      alignSelf: 'center', marginBottom: 24,
    },
    sheetIcon: {
      width: 60, height: 60, borderRadius: 18,
      backgroundColor: isDark ? '#3d1010' : '#fee2e2',
      alignItems: 'center', justifyContent: 'center',
      alignSelf: 'center', marginBottom: 16,
    },
    sheetTitle: {
      color: c.TEXT_P, fontSize: 20, fontWeight: '800',
      textAlign: 'center', marginBottom: 10,
    },
    sheetMsg: {
      color: c.TEXT_S, fontSize: 14, lineHeight: 21,
      textAlign: 'center', marginBottom: 28,
    },
    sheetDeleteBtn: {
      backgroundColor: '#ef4444',
      borderRadius: 14, paddingVertical: 15,
      alignItems: 'center', marginBottom: 10,
    },
    sheetDeleteText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    sheetCancelBtn: {
      backgroundColor: isDark ? '#ffffff10' : '#00000008',
      borderRadius: 14, paddingVertical: 15,
      alignItems: 'center',
    },
    sheetCancelText: { color: c.TEXT_P, fontSize: 15, fontWeight: '700' },
  });
}

export default function AccountScreen() {
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { user, logout } = useAuth();
  const { t } = useTranslation('profile');
  const { isTablet } = useResponsive();
  const router = useRouter();
  const { mutate: deleteAccount, isPending } = useDeleteAccount();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const c = useMemo<Palette>(() => ({
    BG:      theme.colors.background,
    SURFACE: theme.colors.surface,
    SURFACE2: theme.colors.surfaceSubtle,
    TEXT_P:  theme.colors.textPrimary,
    TEXT_S:  theme.colors.textSecondary,
    BORDER:  theme.colors.borderDefault,
    PURPLE:  theme.colors.primary,
    DANGER:  '#ef4444',
  }), [theme]);

  const styles = useMemo(() => makeStyles(c, isDark, isTablet), [c, isDark, isTablet]);

  function handleConfirmDelete() {
    deleteAccount(undefined, {
      onSuccess: () => {
        setConfirmVisible(false);
        logout();
      },
    });
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.BG} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={c.TEXT_P} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('accountDetails')}</Text>
        </View>
        <View style={styles.separator} />

        <View style={styles.body}>
          {/* Account info */}
          <View>
            <Text style={styles.sectionLabel}>{t('account')}</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('name')}</Text>
                <Text style={styles.rowValue}>{user?.name ?? '—'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('email')}</Text>
                <Text style={styles.rowValue}>{user?.email ?? '—'}</Text>
              </View>
            </View>
          </View>

          {/* Privacy Policy */}
          <TouchableOpacity
            style={styles.tile}
            activeOpacity={0.75}
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL, {
              presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            })}
          >
            <View style={[styles.tileIcon, { backgroundColor: isDark ? '#0f1f3d' : '#eff6ff' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#3b82f6" />
            </View>
            <View style={styles.tileTexts}>
              <Text style={styles.tileTitle}>{t('privacyPolicy')}</Text>
              <Text style={styles.tileDesc}>{t('privacyPolicyDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.TEXT_S} />
          </TouchableOpacity>

          {/* Danger zone */}
          <View style={styles.dangerCard}>
            <Text style={styles.dangerLabel}>{t('danger')}</Text>
            <TouchableOpacity
              style={styles.deleteTile}
              activeOpacity={0.75}
              onPress={() => setConfirmVisible(true)}
              disabled={isPending}
            >
              <View style={styles.deleteIcon}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </View>
              <View style={styles.deleteTexts}>
                <Text style={styles.deleteTitle}>{t('deleteAccount')}</Text>
                <Text style={styles.deleteDesc}>{t('deleteAccountDesc')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Delete confirmation bottom sheet modal */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isPending && setConfirmVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => !isPending && setConfirmVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <View style={styles.sheetIcon}>
                <Ionicons name="trash-outline" size={28} color="#ef4444" />
              </View>
              <Text style={styles.sheetTitle}>{t('deleteAccountConfirmTitle')}</Text>
              <Text style={styles.sheetMsg}>{t('deleteAccountConfirmMsg')}</Text>

              <TouchableOpacity
                style={styles.sheetDeleteBtn}
                activeOpacity={0.8}
                onPress={handleConfirmDelete}
                disabled={isPending}
              >
                {isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.sheetDeleteText}>{t('deleteAccountConfirm')}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetCancelBtn}
                activeOpacity={0.8}
                onPress={() => setConfirmVisible(false)}
                disabled={isPending}
              >
                <Text style={styles.sheetCancelText}>{t('deleteAccountCancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
