// src/theme/lightTheme.ts
// Token'lardan semantik roller üretir. Ham renk yok — hepsi Palette'den gelir.

import { Palette, FontFamily, FontSize, LineHeight, Spacing, Radii, Shadow } from './tokens';
import { BrandPalette } from './palettes';

export const createLightTheme = (brand: BrandPalette) => ({
  colors: {
    // Yüzeyler
    background:       Palette.gray50,
    surface:          Palette.white,
    surfaceElevated:  Palette.white,
    surfaceSubtle:    Palette.gray100,

    // Metin
    textPrimary:      Palette.gray900,
    textSecondary:    Palette.gray500,
    textTertiary:     Palette.gray400,
    textDisabled:     Palette.gray300,
    textInverse:      Palette.white,
    textOnBrand:      Palette.white,

    // Marka/aksiyon
    primary:          brand.brand500,
    primaryHover:     brand.brand600,
    primarySubtle:    brand.brand50,
    primaryForeground: Palette.white,

    // Kenarlıklar
    borderDefault:    Palette.gray200,
    borderSubtle:     Palette.gray100,
    borderStrong:     Palette.gray300,
    borderFocus:      brand.brand500,

    // Durum renkleri
    success:          Palette.success500,
    successSubtle:    '#DCFCE7',
    warning:          Palette.warning500,
    warningSubtle:    '#FEF9C3',
    error:            Palette.error500,
    errorSubtle:      '#FEE2E2',

    // CEFR zorluk seviyeleri
    diffA1: Palette.diffA1,
    diffA2: Palette.diffA2,
    diffB1: Palette.diffB1,
    diffB2: Palette.diffB2,
    diffC1: Palette.diffC1,
    diffC2: Palette.diffC2,

    // Tab bar
    tabActive:        brand.brand500,
    tabInactive:      Palette.gray400,
    tabBackground:    Palette.white,
    tabBorder:        Palette.gray200,

    // Diğer
    overlay:          'rgba(0,0,0,0.4)',
    transparent:      Palette.transparent,
  },
  fonts: {
    family:     FontFamily,
    size:       FontSize,
    lineHeight: LineHeight,
  },
  spacing: Spacing,
  radii: Radii,
  shadows:  Shadow,
});

export type Theme = {
  colors: Record<string, string>;
  fonts: {
    family: typeof FontFamily;
    size: typeof FontSize;
    lineHeight: typeof LineHeight;
  };
  spacing: typeof Spacing;
  radii: typeof Radii;
  shadows: typeof Shadow;
};
