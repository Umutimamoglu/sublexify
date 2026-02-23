import { View } from 'react-native';
import { Text } from './Text';
import type { Difficulty } from '@/src/types/api';

// Tailwind dinamik class üretemez — renk değerleri sabit map olarak tutulur
const colorMap: Record<Difficulty, string> = {
  A1: '#22C55E',
  A2: '#84CC16',
  B1: '#F59E0B',
  B2: '#F97316',
  C1: '#EF4444',
  C2: '#9333EA',
};

type BadgeProps = {
  difficulty: Difficulty;
  size?: 'sm' | 'md';
};

export function DifficultyBadge({ difficulty, size = 'md' }: BadgeProps) {
  const color = colorMap[difficulty];

  return (
    <View
      className={`self-start rounded-full border ${size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'}`}
      style={{ borderColor: color, backgroundColor: color + '20' }}
    >
      <Text
        variant="caption"
        className="font-bold tracking-wide"
        style={{ color }}
      >
        {difficulty}
      </Text>
    </View>
  );
}
