import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Locale JSON'ları
import enCommon from './locales/en/common.json';
import enDiscover from './locales/en/discover.json';
import enVocabulary from './locales/en/vocabulary.json';
import enLists from './locales/en/lists.json';
import enProfile from './locales/en/profile.json';
import enStudy from './locales/en/study.json';
import enProgress from './locales/en/progress.json';
import enMediaRequest from './locales/en/mediaRequest.json';
import enFeedback from './locales/en/feedback.json';

import trCommon from './locales/tr/common.json';
import trDiscover from './locales/tr/discover.json';
import trVocabulary from './locales/tr/vocabulary.json';
import trLists from './locales/tr/lists.json';
import trProfile from './locales/tr/profile.json';
import trStudy from './locales/tr/study.json';
import trProgress from './locales/tr/progress.json';
import trMediaRequest from './locales/tr/mediaRequest.json';
import trFeedback from './locales/tr/feedback.json';

const LANGUAGE_KEY = '@sublex/language';

export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export async function initI18n() {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY) as SupportedLanguage | null;
  const deviceLocale = Localization.getLocales()[0]?.languageTag ?? 'en';
  const deviceLang = deviceLocale.split('-')[0];

  const lng: SupportedLanguage =
    saved ??
    (SUPPORTED_LANGUAGES.includes(deviceLang as SupportedLanguage)
      ? (deviceLang as SupportedLanguage)
      : 'en');

  if (!i18n.isInitialized) {
    i18n.use(initReactI18next);
  }

  await i18n.init({
    resources: {
      en: { common: enCommon, discover: enDiscover, vocabulary: enVocabulary, lists: enLists, profile: enProfile, study: enStudy, progress: enProgress, mediaRequest: enMediaRequest, feedback: enFeedback },
      tr: { common: trCommon, discover: trDiscover, vocabulary: trVocabulary, lists: trLists, profile: trProfile, study: trStudy, progress: trProgress, mediaRequest: trMediaRequest, feedback: trFeedback },
    },
    lng,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'discover', 'vocabulary', 'lists', 'profile', 'study', 'progress', 'mediaRequest', 'feedback'],
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

  return i18n;
}

export async function changeLanguage(lang: SupportedLanguage) {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
}

export default i18n;
