import { useLocalSearchParams } from 'expo-router';
import StudyScreen from '@/src/components/screens/StudyScreen';

export default function StudyRoute() {
  const { listId, types } = useLocalSearchParams<{ listId: string; types?: string }>();
  return <StudyScreen listId={Number(listId)} types={types ? types.split(',') : undefined} />;
}
