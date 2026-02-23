import { View, type ViewProps } from 'react-native';

type CardProps = ViewProps & {
  elevated?: boolean;
  padding?: boolean;
  className?: string;
};

export function Card({ elevated = false, padding = true, className, style, children, ...props }: CardProps) {
  const base = [
    'bg-white dark:bg-gray-800',
    'rounded-xl border border-gray-200 dark:border-gray-700',
    'overflow-hidden',
    elevated ? 'shadow-md' : 'shadow-sm',
    padding ? 'p-4' : '',
    className ?? '',
  ].join(' ').trim();

  return (
    <View className={base} style={style} {...props}>
      {children}
    </View>
  );
}
