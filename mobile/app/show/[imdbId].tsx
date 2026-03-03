import { useLocalSearchParams } from 'expo-router';
import ShowDetailScreen from '@/src/components/screens/ShowDetailScreen';

export default function ShowPage() {
  const { imdbId } = useLocalSearchParams<{ imdbId: string }>();
  return <ShowDetailScreen imdbId={imdbId ?? ''} />;
}
