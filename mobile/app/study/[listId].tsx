import { useLocalSearchParams } from 'expo-router';
import StudyScreen from '@/src/components/screens/StudyScreen';

export default function StudyRoute() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  return <StudyScreen listId={Number(listId)} />;
}
