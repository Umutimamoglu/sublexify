import React, { createContext, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { createLightTheme, type Theme } from '@/src/theme/lightTheme';
import { createDarkTheme } from '@/src/theme/darkTheme';
import { AppPalettes, generateCustomPalette, type PaletteKey } from '@/src/theme/palettes';
import { useSettingsStore, type ThemePreference } from '@/src/store/settingsStore';

type ThemeContextValue = {
  theme: Theme;
  colorScheme: 'light' | 'dark';
  themePreference: ThemePreference;
  toggleTheme: () => void;
  setThemePreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? 'light';
  const { setColorScheme: setNWColorScheme } = useNativeWindColorScheme();
  const { themePreference, setThemePreference, activeBrandPalette, setActiveBrandPalette, customBrandHex } = useSettingsStore();

  const resolvedScheme: 'light' | 'dark' =
    themePreference === 'system' ? systemScheme : themePreference;

  let activePalette = AppPalettes[activeBrandPalette];
  if (activeBrandPalette === 'custom' && customBrandHex) {
    activePalette = generateCustomPalette(customBrandHex);
  }
  if (!activePalette) {
    activePalette = AppPalettes.netflix!;
  }
  
  const theme = resolvedScheme === 'dark' ? createDarkTheme(activePalette) : createLightTheme(activePalette);

  // Tercih değişince NativeWind'e de bildir (dark: prefix'leri için)
  useEffect(() => {
    setNWColorScheme(themePreference);
  }, [themePreference]);

  const handleSetThemePreference = (pref: ThemePreference) => {
    setThemePreference(pref);
    setNWColorScheme(pref);
  };

  const toggleTheme = () => {
    const next: Record<ThemePreference, ThemePreference> = {
      system: 'light',
      light:  'dark',
      dark:   'system',
    };
    handleSetThemePreference(next[themePreference]);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorScheme: resolvedScheme,
        themePreference,
        toggleTheme,
        setThemePreference: handleSetThemePreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
