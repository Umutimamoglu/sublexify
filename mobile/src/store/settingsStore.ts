import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';
export type SupportedLanguage = 'en' | 'tr';
export type VoiceGenderPreference = 'system' | 'female' | 'male';
import { PaletteKey } from '../theme/palettes';

type SettingsState = {
  themePreference: ThemePreference;
  activeBrandPalette: PaletteKey;
  customBrandHex: string | null;
  language: SupportedLanguage;
  dailyReviewCount: number;
  preferredVoiceGender: VoiceGenderPreference;
  setThemePreference: (pref: ThemePreference) => void;
  setActiveBrandPalette: (palette: PaletteKey) => void;
  setCustomBrandHex: (hex: string | null) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setDailyReviewCount: (count: number) => void;
  setVoiceGender: (gender: VoiceGenderPreference) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      activeBrandPalette: 'sapphire',
      customBrandHex: null,
      language: 'en',
      dailyReviewCount: 10,
      preferredVoiceGender: 'system',
      setThemePreference: (pref) => set({ themePreference: pref }),
      setActiveBrandPalette: (palette) => set({ activeBrandPalette: palette }),
      setCustomBrandHex: (hex) => set({ customBrandHex: hex }),
      setLanguage: (lang) => set({ language: lang }),
      setDailyReviewCount: (count) => set({ dailyReviewCount: count }),
      setVoiceGender: (gender) => set({ preferredVoiceGender: gender }),
    }),
    {
      name: 'sublex-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
