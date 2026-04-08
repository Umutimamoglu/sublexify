// src/theme/darkTheme.ts
// lightTheme'i spread eder, sadece renkleri override eder.

import { Palette } from './tokens';
import { BrandPalette } from './palettes';
import { createLightTheme, type Theme } from './lightTheme';

export const createDarkTheme = (brand: BrandPalette): Theme => {
  const baseLight = createLightTheme(brand);
  
  return {
    ...baseLight,
    colors: {
      ...baseLight.colors,

      // Yüzeyler
      background:       Palette.gray900,
      surface:          Palette.gray800,
      surfaceElevated:  Palette.gray700,
      surfaceSubtle:    Palette.gray800,

      // Metin
      textPrimary:      Palette.gray50,
      textSecondary:    Palette.gray400,
      textTertiary:     Palette.gray500,
      textDisabled:     Palette.gray600,
      textInverse:      Palette.gray900,

      // Marka/aksiyon
      primary:          brand.brand400,
      primaryHover:     brand.brand300,
      primarySubtle:    '#1E1040',

      // Kenarlıklar
      borderDefault:    Palette.gray700,
      borderSubtle:     Palette.gray800,
      borderStrong:     Palette.gray600,
      borderFocus:      brand.brand400,

      // Durum renkleri (koyu modda hafif daha soluk)
      successSubtle:    '#14532D',
      warningSubtle:    '#713F12',
      errorSubtle:      '#7F1D1D',

      // Tab bar
      tabActive:        brand.brand400,
      tabInactive:      Palette.gray500,
      tabBackground:    Palette.gray900 as any,
      tabBorder:        Palette.gray700 as any,

      overlay:          'rgba(0,0,0,0.6)' as any,
    },
  };
};
