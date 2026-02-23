import { View } from 'react-native';
import { Text } from '@/src/components/ui';
import { useTranslation } from '@/src/i18n/useTranslation';

export default function VocabularyScreen() {
  const { t } = useTranslation('vocabulary');

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Text variant="heading2">{t('title')}</Text>
    </View>
  );
}
