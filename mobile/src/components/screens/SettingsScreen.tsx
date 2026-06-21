import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useSettingsStore, type ThemePreference } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/i18n/useTranslation';
import { changeLanguage, type SupportedLanguage } from '@/src/i18n';
import { useResponsive } from '@/src/hooks/useResponsive';
import { AppPalettes, type PaletteKey } from '@/src/theme/palettes';
import { Text } from '@/src/components/ui/Text';
import { usePushEnabled, useSetPushEnabled } from '@/src/api/queries/notifications.queries';


type Palette = {
  BG: string; SURFACE: string;
  TEXT_P: string; TEXT_S: string; BORDER: string;
  PURPLE: string;
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

    body: { paddingHorizontal: pad, paddingBottom: 40 },

    sectionLabel: {
      color: c.TEXT_S, fontSize: 11, fontWeight: '700',
      letterSpacing: 1.2, textTransform: 'uppercase',
      marginBottom: 12, marginTop: 24,
    },

    card: {
      backgroundColor: c.SURFACE,
      borderRadius: 18,
      borderWidth: 1, borderColor: cardBorder,
      overflow: 'hidden',
    },
    
    tile: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 16, gap: 14,
    },
    tileDivider: { height: 1, backgroundColor: isDark ? '#ffffff08' : '#f0f0f5', marginHorizontal: 16 },
    tileIconBox: {
      width: 38, height: 38, borderRadius: 10,
      backgroundColor: isDark ? '#2a2a35' : '#f0eeff',
      alignItems: 'center', justifyContent: 'center',
    },
    tileLabel: { flex: 1, color: c.TEXT_P, fontSize: 15, fontWeight: '500' },

    settingsRow: { padding: 20, gap: 12 },
    rowLabel: { color: c.TEXT_S, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      paddingHorizontal: 16, paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: isDark ? '#ffffff10' : '#f0eeff',
    },
    chipActive: { backgroundColor: c.PURPLE },
    chipText:       { color: c.TEXT_S, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#fff',   fontSize: 13, fontWeight: '600' },
  });
}

function SettingsTile({
  icon, label, onPress, styles, isLast, isDark, c
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; onPress: () => void;
  styles: any;
  isLast: boolean; isDark: boolean;
  c: Palette;
}) {
  const iconColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';
  return (
    <>
      <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.tileIconBox as any}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={styles.tileLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color={iconColor} />
      </TouchableOpacity>
      {!isLast && <View style={styles.tileDivider} />}
    </>
  );
}

function NotificationsTile({
  onPress, styles, isDark, c
}: {
  onPress: () => void;
  styles: any; isDark: boolean; c: Palette;
}) {
  const { data: pushEnabled = true } = usePushEnabled();
  const { mutate: setPushEnabled, isPending } = useSetPushEnabled();
  const iconColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';

  return (
    <View style={[styles.tile, { justifyContent: 'space-between' }]}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.tileIconBox}>
          <Ionicons name="notifications-outline" size={20} color={iconColor} />
        </View>
        <Text style={styles.tileLabel}>Bildirimler</Text>
      </TouchableOpacity>
      <Switch
        value={pushEnabled}
        onValueChange={(val) => setPushEnabled(val)}
        trackColor={{ false: isDark ? '#333' : '#ddd', true: c.PURPLE + 'aa' }}
        thumbColor={pushEnabled ? c.PURPLE : '#f4f3f4'}
        disabled={isPending}
      />
    </View>
  );
}


export default function SettingsScreen() {
  const { theme, colorScheme, themePreference, setThemePreference } = useTheme();
  const isDark = colorScheme === 'dark';
  const { 
    language, setLanguage, 
    dailyReviewCount, setDailyReviewCount,
    activeBrandPalette, setActiveBrandPalette,
    setCustomBrandHex, customBrandHex
  } = useSettingsStore();
  const { t } = useTranslation('profile');
  const { isTablet } = useResponsive();
  const router = useRouter();

  const [colorModalVisible, setColorModalVisible] = useState(false);

  const CUSTOM_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', 
    '#10B981', '#00BBA7', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', 
    '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', 
    '#1F2937', '#475569', '#3F6212', '#047857', '#0F766E', '#1D4ED8', 
    '#4338CA', '#86198F', '#9F1239', '#57534E', '#1E3A8A', '#064E3B', 
    '#14532D', '#7C2D12', '#450A0A', '#4A044E', '#881337', '#9D174D', 
    '#1E1B4B'
  ];

  const c = useMemo<Palette>(() => ({
    BG:      theme.colors.background,
    SURFACE: theme.colors.surface,
    TEXT_P:  theme.colors.textPrimary,
    TEXT_S:  theme.colors.textSecondary,
    BORDER:  theme.colors.borderDefault,
    PURPLE:  theme.colors.primary,
  }), [theme]);

  const styles = useMemo(() => makeStyles(c, isDark, isTablet), [c, isDark, isTablet]);

  const themeOptions: { label: string; value: ThemePreference }[] = [
    { label: t('themeLight'),  value: 'light' },
    { label: t('themeDark'),   value: 'dark' },
    { label: t('themeSystem'), value: 'system' },
  ];

  const langOptions: { label: string; value: SupportedLanguage }[] = [
    { label: t('languageEn'), value: 'en' },
    { label: t('languageTr'), value: 'tr' },
  ];

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    setLanguage(lang);
    await changeLanguage(lang);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.BG} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={c.TEXT_P} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('settings')}</Text>
        </View>
        <View style={styles.separator} />

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* ── Navigation Settings ── */}
          <Text style={styles.sectionLabel}>{t('account')}</Text>
          <View style={styles.card}>
            <SettingsTile 
              icon="person-outline" 
              label={t('accountDetails')} 
              onPress={() => router.push('/profile/account')}
              styles={styles}
              isLast={false}
              isDark={isDark}
              c={c}
            />
            {/* Notifications row with push toggle */}
            <NotificationsTile
              styles={styles}
              isDark={isDark}
              c={c}
              onPress={() => router.push('/profile/notifications')}
            />
          </View>

          {/* ── Visual & Language Settings ── */}
          <Text style={styles.sectionLabel}>{t('languagePreferences')}</Text>
          <View style={styles.card}>
            
            <View style={styles.settingsRow}>
              <Text style={styles.rowLabel}>Ana Renk (Brand)</Text>
              <View style={styles.chipRow}>
                {(Object.keys(AppPalettes) as PaletteKey[]).map((pkey) => {
                  const palette = AppPalettes[pkey];
                  const isActive = activeBrandPalette === pkey;
                  return (
                    <TouchableOpacity
                      key={pkey}
                      activeOpacity={0.8}
                      onPress={() => setActiveBrandPalette(pkey)}
                      style={{
                        width: 36, height: 36, borderRadius: 18,
                        backgroundColor: palette?.brand500,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: isActive ? 3 : 0,
                        borderColor: isDark ? '#fff' : c.TEXT_P,
                      }}
                    >
                      {isActive && <Ionicons name="checkmark" size={20} color="#fff" />}
                    </TouchableOpacity>
                  );
                })}
                {/* Custom Color Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setColorModalVisible(true)}
                  style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: activeBrandPalette === 'custom' && customBrandHex ? customBrandHex : isDark ? '#333' : '#eee',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: activeBrandPalette === 'custom' ? 3 : 1,
                    borderColor: activeBrandPalette === 'custom' ? (isDark ? '#fff' : c.TEXT_P) : (isDark ? '#555' : '#ccc'),
                  }}
                >
                  <Ionicons name={activeBrandPalette === 'custom' ? "checkmark" : "add"} size={20} color={activeBrandPalette === 'custom' ? "#fff" : c.TEXT_S} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.tileDivider, { marginHorizontal: 0 }]} />

            <View style={styles.settingsRow}>
              <Text style={styles.rowLabel}>{t('theme')}</Text>
              <View style={styles.chipRow}>
                {themeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, themePreference === opt.value && styles.chipActive]}
                    onPress={() => setThemePreference(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={themePreference === opt.value ? styles.chipTextActive : styles.chipText}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.tileDivider, { marginHorizontal: 0 }]} />

            <View style={styles.settingsRow}>
              <Text style={styles.rowLabel}>{t('language')}</Text>
              <View style={styles.chipRow}>
                {langOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, language === opt.value && styles.chipActive]}
                    onPress={() => handleLanguageChange(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={language === opt.value ? styles.chipTextActive : styles.chipText}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ── Daily Review ── */}
          <Text style={styles.sectionLabel}>Günlük Tekrar</Text>
          <View style={styles.card}>
            <View style={styles.settingsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Günlük kelime sayısı</Text>
                <Text style={[styles.rowLabel, { fontSize: 11, fontWeight: '400', color: c.TEXT_S, marginTop: 2 }]}>
                  Her gün tekrar edilecek kelime sayısı
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <TouchableOpacity
                  onPress={() => setDailyReviewCount(Math.max(5, dailyReviewCount - 5))}
                  activeOpacity={0.7}
                  style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: isDark ? '#ffffff15' : '#f0eeff',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="remove" size={20} color={c.TEXT_P} />
                </TouchableOpacity>
                
                <Text style={[styles.rowLabel, { minWidth: 32, textAlign: 'center', fontSize: 18, fontWeight: '800' }]}>
                  {dailyReviewCount}
                </Text>
                
                <TouchableOpacity
                  onPress={() => setDailyReviewCount(Math.min(50, dailyReviewCount + 5))}
                  activeOpacity={0.7}
                  style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: c.PURPLE,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Color Selection Modal */}
      <Modal visible={colorModalVisible} transparent animationType="fade" onRequestClose={() => setColorModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 400, backgroundColor: c.SURFACE, borderRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: c.TEXT_P, fontSize: 18, fontWeight: '700' }}>Özel Renk Seç</Text>
              <TouchableOpacity onPress={() => setColorModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={c.TEXT_S} />
              </TouchableOpacity>
            </View>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {CUSTOM_COLORS.map(hex => (
                <TouchableOpacity
                  key={hex}
                  activeOpacity={0.7}
                  onPress={() => {
                    setCustomBrandHex(hex);
                    setActiveBrandPalette('custom');
                    setColorModalVisible(false);
                  }}
                  style={{
                    width: 42, height: 42, borderRadius: 21,
                    backgroundColor: hex,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: customBrandHex === hex && activeBrandPalette === 'custom' ? 3 : 0,
                    borderColor: isDark ? '#fff' : '#000',
                  }}
                >
                  {customBrandHex === hex && activeBrandPalette === 'custom' && (
                    <Ionicons name="checkmark" size={22} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}
