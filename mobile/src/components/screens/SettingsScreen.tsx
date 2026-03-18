import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { useSettingsStore, type ThemePreference } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/i18n/useTranslation';
import { changeLanguage, type SupportedLanguage } from '@/src/i18n';
import { useResponsive } from '@/src/hooks/useResponsive';

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

export default function SettingsScreen() {
  const { theme, colorScheme, themePreference, setThemePreference } = useTheme();
  const isDark = colorScheme === 'dark';
  const { language, setLanguage } = useSettingsStore();
  const { t } = useTranslation('profile');
  const { isTablet } = useResponsive();
  const router = useRouter();

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
            <SettingsTile 
              icon="notifications-outline" 
              label={t('notifications')} 
              onPress={() => router.push('/profile/notifications')}
              styles={styles}
              isLast={true}
              isDark={isDark}
              c={c}
            />
          </View>

          {/* ── Visual & Language Settings ── */}
          <Text style={styles.sectionLabel}>{t('languagePreferences')}</Text>
          <View style={styles.card}>
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
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
