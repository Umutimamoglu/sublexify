// src/theme/tokens.ts
// ============================================================
// TEK KAYNAK — Tüm görsel değerleri buradan değiştir.
// Renk, font, boyut, boşluk, gölge hepsi burada tanımlı.

export const Palette = {
  // Brand is dynamically injected in ThemeContext now.
  // Kept here so it compiles if anything checks for Palette directly, but mostly unused.

  // Nötr gri skalası
  gray50:  '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',

  // Semantik renkler (Değiştirilmedi, dil öğrenimi bağlamında standarttır)
  success500: '#22C55E',
  warning500: '#F59E0B',
  error500:   '#EF4444',
  teal500:    '#238DA0',

  // CEFR Zorluk seviyeleri (A1=en kolay, C2=en zor) (Değiştirilmedi)
  diffA1: '#22C55E',
  diffA2: '#84CC16',
  diffB1: '#F59E0B',
  diffB2: '#F97316',
  diffC1: '#EF4444',
  diffC2: '#9333EA',

  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
} as const;

export const FontFamily = {
  regular:  'System',
  medium:   'System',
  semibold: 'System',
  bold:     'System',
  mono:     'System',
} as const;

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const LineHeight = {
  tight:   1.2,
  normal:  1.5,
  relaxed: 1.75,
} as const;

// 4pt grid spacing sistemi
export const Spacing = {
  0:   0,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  8:   32,
  10:  40,
  12:  48,
  16:  64,
} as const;

export const Radii = {
  none: 0,
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  '2xl': 24,
  full: 9999,
} as const;

export const Shadow = {
  none: {},
  sm: {
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Tablet/responsive breakpoint'leri
export const Breakpoints = {
  phone:   0,
  tablet:  768,
  desktop: 1024,
} as const;