import { useLocalSearchParams } from 'expo-router';
import ListScreen from '@/src/components/screens/ListScreen';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = parseInt(id ?? '0', 10);

  return <ListScreen listId={listId} />;
}
