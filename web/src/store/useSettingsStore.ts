import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';
export type SupportedLanguage = 'en' | 'tr';
export type VoiceGenderPreference = 'system' | 'female' | 'male';

type SettingsState = {
    themePreference: ThemePreference;
    language: SupportedLanguage;
    dailyReviewCount: number;
    preferredVoiceGender: VoiceGenderPreference;
    setThemePreference: (pref: ThemePreference) => void;
    setLanguage: (lang: SupportedLanguage) => void;
    setDailyReviewCount: (count: number) => void;
    setVoiceGender: (gender: VoiceGenderPreference) => void;
};

export const useSettingsStore = create<SettingsState>()((set) => {
    // Restore from localStorage
    const savedTheme = localStorage.getItem('sublex-theme') as ThemePreference || 'system';
    const savedLang = localStorage.getItem('language') as SupportedLanguage || 'tr';
    const savedCount = parseInt(localStorage.getItem('sublex-daily-review') || '20', 10);
    const savedVoice = localStorage.getItem('sublex-voice-gender') as VoiceGenderPreference || 'system';

    return {
        themePreference: savedTheme,
        language: savedLang,
        dailyReviewCount: savedCount,
        preferredVoiceGender: savedVoice,

        setThemePreference: (pref) => {
            localStorage.setItem('sublex-theme', pref);
            set({ themePreference: pref });
            
            // Apply theme immediately
            const isDark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.classList.toggle('dark', isDark);
        },
        setLanguage: (lang) => {
            localStorage.setItem('language', lang);
            set({ language: lang });
        },
        setDailyReviewCount: (count) => {
            localStorage.setItem('sublex-daily-review', count.toString());
            set({ dailyReviewCount: count });
        },
        setVoiceGender: (gender) => {
            localStorage.setItem('sublex-voice-gender', gender);
            set({ preferredVoiceGender: gender });
        }
    };
});
