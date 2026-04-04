import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';
export type SupportedLanguage = 'en' | 'tr';

type SettingsState = {
  themePreference: ThemePreference;
  language: SupportedLanguage;
  dailyReviewCount: number;
  setThemePreference: (pref: ThemePreference) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setDailyReviewCount: (count: number) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      language: 'en',
      dailyReviewCount: 10,
      setThemePreference: (pref) => set({ themePreference: pref }),
      setLanguage: (lang) => set({ language: lang }),
      setDailyReviewCount: (count) => set({ dailyReviewCount: count }),
    }),
    {
      name: 'sublex-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
