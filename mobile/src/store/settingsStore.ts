import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';
export type SupportedLanguage = 'en' | 'tr';

type SettingsState = {
  themePreference: ThemePreference;
  language: SupportedLanguage;
  setThemePreference: (pref: ThemePreference) => void;
  setLanguage: (lang: SupportedLanguage) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      language: 'en',
      setThemePreference: (pref) => set({ themePreference: pref }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'sublex-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
