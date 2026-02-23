import { Text as RNText, type TextProps } from 'react-native';

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
};

export function Text({ variant = 'body', className, style, ...props }: ThemedTextProps) {
  const base = variantClasses[variant];
  const combined = className ? `${base} ${className}` : base;

  return <RNText className={combined} style={style} {...props} />;
}
