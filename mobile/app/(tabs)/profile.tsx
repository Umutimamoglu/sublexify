import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/src/components/ui';
import { useTheme } from '@/src/context/ThemeContext';
import { useTranslation } from '@/src/i18n/useTranslation';
import { changeLanguage, type SupportedLanguage } from '@/src/i18n';
import { useSettingsStore } from '@/src/store/settingsStore';
import type { ThemePreference } from '@/src/store/settingsStore';

export default function ProfileScreen() {
  const { themePreference, setThemePreference } = useTheme();
  const { t } = useTranslation('profile');
  const { language, setLanguage } = useSettingsStore();

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
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 px-6 pt-16">
      <Text variant="heading2" className="mb-8">{t('title')}</Text>

      {/* Tema seçimi */}
      <View className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
        <Text variant="label" className="mb-3 uppercase tracking-wide">{t('theme')}</Text>
        <View className="flex-row gap-2">
          {themeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setThemePreference(opt.value)}
              className={`px-4 py-2 rounded-full ${
                themePreference === opt.value
                  ? 'bg-brand-500'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <Text
                variant="bodySmall"
                className={`font-medium ${
                  themePreference === opt.value
                    ? 'text-white'
                    : 'text-gray-900 dark:text-gray-50'
                }`}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Dil seçimi */}
      <View className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
        <Text variant="label" className="mb-3 uppercase tracking-wide">{t('language')}</Text>
        <View className="flex-row gap-2">
          {langOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => handleLanguageChange(opt.value)}
              className={`px-4 py-2 rounded-full ${
                language === opt.value
                  ? 'bg-brand-500'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <Text
                variant="bodySmall"
                className={`font-medium ${
                  language === opt.value
                    ? 'text-white'
                    : 'text-gray-900 dark:text-gray-50'
                }`}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
