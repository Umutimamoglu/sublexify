import { TouchableOpacity, ActivityIndicator, type TouchableOpacityProps } from 'react-native';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

type ButtonProps = TouchableOpacityProps & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
};

const variantClasses: Record<Variant, { container: string; text: string; indicator: string }> = {
  primary:   { container: 'bg-brand-500 border-0',                        text: 'text-white',      indicator: 'white' },
  secondary: { container: 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700', text: 'text-gray-900 dark:text-gray-50', indicator: '#64748B' },
  ghost:     { container: 'bg-transparent border-0',                      text: 'text-brand-500',  indicator: '#0E8CE8' },
  danger:    { container: 'bg-red-500 border-0',                          text: 'text-white',      indicator: 'white' },
};

const sizeClasses: Record<Size, string> = {
  sm: 'py-2 px-3',
  md: 'py-3 px-5',
  lg: 'py-4 px-6',
};

export function Button({
  label,
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  fullWidth = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const v = variantClasses[variant];
  const isDisabled = disabled || loading;

  const containerClass = [
    'flex-row items-center justify-center rounded-lg gap-2',
    v.container,
    sizeClasses[size],
    fullWidth ? 'self-stretch' : 'self-start',
    isDisabled ? 'opacity-50' : 'opacity-100',
    className ?? '',
  ].join(' ').trim();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      className={containerClass}
      {...props}
    >
      {loading && <ActivityIndicator size="small" color={v.indicator} />}
      <Text
        variant={size === 'sm' ? 'bodySmall' : 'body'}
        className={`font-semibold ${v.text}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
