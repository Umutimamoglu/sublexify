import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/src/components/ui';

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Text variant="heading2">Media #{id}</Text>
    </View>
  );
}
