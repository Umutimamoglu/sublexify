import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';

const FONT_MAP = {
  'normal': 'PlusJakartaSans_400Regular',
  '400': 'PlusJakartaSans_400Regular',
  '500': 'PlusJakartaSans_500Medium',
  '600': 'PlusJakartaSans_600SemiBold',
  'bold': 'PlusJakartaSans_700Bold',
  '700': 'PlusJakartaSans_700Bold',
  '800': 'PlusJakartaSans_800ExtraBold',
  '900': 'PlusJakartaSans_800ExtraBold',
};

type Variant = 'heading1' | 'heading2' | 'heading3' | 'body' | 'bodySmall' | 'caption' | 'label';

const variantClasses: Record<Variant, string> = {
  heading1:  'text-3xl font-bold text-gray-900 dark:text-gray-50',
  heading2:  'text-2xl font-bold text-gray-900 dark:text-gray-50',
  heading3:  'text-xl font-semibold text-gray-900 dark:text-gray-50',
  body:      'text-base font-normal text-gray-900 dark:text-gray-50',
  bodySmall: 'text-sm font-normal text-gray-900 dark:text-gray-50',
  caption:   'text-xs font-normal text-gray-500 dark:text-gray-400',
  label:     'text-sm font-medium text-gray-500 dark:text-gray-400',
};

type ThemedTextProps = TextProps & {
  variant?: Variant;
  className?: string;
  tabularNums?: boolean;
};

export function Text({ variant, className, style, tabularNums, ...props }: ThemedTextProps) {
  const base = variant ? variantClasses[variant] : '';
  const combined = className ? (base ? `${base} ${className}` : className) : base;

  // Flatten styles to extract fontWeight (works for inline styles and StyleSheet)
  const flatStyle = (StyleSheet.flatten(style || {}) || {}) as TextStyle;
  let fw = flatStyle.fontWeight?.toString() || 'normal';
  
  // Also parse className for Tailwind font-weight utilities
  if (combined) {
    if (combined.includes('font-black')) fw = '900';
    else if (combined.includes('font-extrabold')) fw = '800';
    else if (combined.includes('font-bold')) fw = '700';
    else if (combined.includes('font-semibold')) fw = '600';
    else if (combined.includes('font-medium')) fw = '500';
    else if (combined.includes('font-normal')) fw = '400';
  }
  
  // Resolve fontFamily
  const fontFamily = FONT_MAP[fw as keyof typeof FONT_MAP] || 'PlusJakartaSans_400Regular';

  // Include tabular-nums if requested
  const fontVariant: TextStyle['fontVariant'] = tabularNums ? ['tabular-nums'] : flatStyle.fontVariant;

  // We explicitly map the fontFamily based on className or inline style.
  // We MUST leave fontWeight as undefined in our override so that NativeWind's generated fontWeight (e.g. 700)
  // passes through to iOS. iOS strictly matches the requested fontWeight with the TTF's internal metadata weight.
  // If we force 'normal' (400) on a Bold TTF (700), iOS rejects it and falls back to System font!
  const resolvedStyle = [
    style,
    { fontFamily, fontWeight: undefined, fontVariant },
  ];

  return <RNText className={combined} style={resolvedStyle} {...props} />;
}



