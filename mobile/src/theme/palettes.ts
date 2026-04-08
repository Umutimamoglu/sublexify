export type PaletteKey = 'netflix' | 'sapphire' | 'cyan' | 'gold' | 'forest' | 'purple' | 'rose' | 'slate' | 'ember' | 'ocean' | 'earth' | 'punch' | 'custom';

export type BrandPalette = {
  brand50: string;
  brand100: string;
  brand200: string;
  brand300: string;
  brand400: string;
  brand500: string;
  brand600: string;
  brand700: string;
};

export const AppPalettes: Partial<Record<PaletteKey, BrandPalette>> = {
  netflix: {
    brand50:  '#FEF2F2',
    brand100: '#FEE2E2',
    brand200: '#FECACA',
    brand300: '#FCA5A5',
    brand400: '#F87171',
    brand500: '#EF4444',
    brand600: '#DC2626',
    brand700: '#B91C1C',
  },
  sapphire: {
    brand50:  '#EFF6FF',
    brand100: '#DBEAFE',
    brand200: '#BFDBFE',
    brand300: '#93C5FD',
    brand400: '#60A5FA',
    brand500: '#3B82F6',
    brand600: '#2563EB',
    brand700: '#1D4ED8',
  },
  cyan: {
    brand50:  '#ECFEFF',
    brand100: '#CFFAFE',
    brand200: '#A5F3FC',
    brand300: '#67E8F9',
    brand400: '#22D3EE',
    brand500: '#06B6D4',
    brand600: '#0891B2',
    brand700: '#0E7490',
  },
  gold: {
    brand50:  '#FFFBEA',
    brand100: '#FFF3D1',
    brand200: '#FFE6A3',
    brand300: '#FFDA76',
    brand400: '#FFCD48',
    brand500: '#F6D157',
    brand600: '#D9B040',
    brand700: '#BC9129',
  },
  forest: {
    brand50:  '#F0FDF4',
    brand100: '#DCFCE7',
    brand200: '#BBF7D0',
    brand300: '#86EFAC',
    brand400: '#4ADE80',
    brand500: '#22C55E',
    brand600: '#16A34A',
    brand700: '#15803D',
  },
  purple: {
    brand50:  '#F5F0FF',
    brand100: '#EDE5FF',
    brand200: '#D5C4FF',
    brand300: '#B89BF8',
    brand400: '#9B6FF3',
    brand500: '#7C4CED',
    brand600: '#6338D6',
    brand700: '#4B25B5',
  },
  rose: {
    brand50:  '#FFF1F2',
    brand100: '#FFE4E6',
    brand200: '#FECDD3',
    brand300: '#FDA4AF',
    brand400: '#FB7185',
    brand500: '#F43F5E',
    brand600: '#E11D48',
    brand700: '#BE123C',
  },
  slate: {
    brand50:  '#F8FAFC',
    brand100: '#F1F5F9',
    brand200: '#E2E8F0',
    brand300: '#CBD5E1',
    brand400: '#94A3B8',
    brand500: '#64748B',
    brand600: '#475569',
    brand700: '#334155',
  },
  ember: {
    brand50:  '#FFF7ED',
    brand100: '#FFEDD5',
    brand200: '#FED7AA',
    brand300: '#FDBA74',
    brand400: '#FB923C',
    brand500: '#F97316',
    brand600: '#EA580C',
    brand700: '#C2410C',
  },
  ocean: {
    brand50:  '#F0FDFA',
    brand100: '#CCFBF1',
    brand200: '#99F6E4',
    brand300: '#5EEAD4',
    brand400: '#2DD4BF',
    brand500: '#14B8A6',
    brand600: '#0D9488',
    brand700: '#0F766E',
  },
  earth: {
    brand50:  '#FFF7F7',
    brand100: '#FEE5E5',
    brand200: '#FDD2D2',
    brand300: '#FCA5A5',
    brand400: '#F87171',
    brand500: '#EF4444',
    brand600: '#DC2626',
    brand700: '#991B1B',
  },
  punch: {
    brand50:  '#F7FEE7',
    brand100: '#ECFCCB',
    brand200: '#D9F99D',
    brand300: '#BEF264',
    brand400: '#A3E635',
    brand500: '#84CC16',
    brand600: '#65A30D',
    brand700: '#4D7C0F',
  }
} as Partial<Record<PaletteKey, BrandPalette>>;

// ─── Mathematical Palette Generator ──────────────────────────────────────────────
export function hexToRgb(h: string) {
  let hex = h.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const num = parseInt(hex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function mixColors(hex1: string, hex2: string, weight: number) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const w = Math.max(0, Math.min(1, weight));
  const r = c1.r * (1 - w) + c2.r * w;
  const g = c1.g * (1 - w) + c2.g * w;
  const b = c1.b * (1 - w) + c2.b * w;
  return rgbToHex(r, g, b);
}

export function generateCustomPalette(baseHex: string): BrandPalette {
  return {
    brand50:  mixColors(baseHex, '#FFFFFF', 0.95),
    brand100: mixColors(baseHex, '#FFFFFF', 0.85),
    brand200: mixColors(baseHex, '#FFFFFF', 0.65),
    brand300: mixColors(baseHex, '#FFFFFF', 0.40),
    brand400: mixColors(baseHex, '#FFFFFF', 0.15),
    brand500: baseHex,
    brand600: mixColors(baseHex, '#000000', 0.25),
    brand700: mixColors(baseHex, '#000000', 0.45),
  };
}
