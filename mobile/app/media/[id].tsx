import { useLocalSearchParams } from 'expo-router';
import MediaDetailScreen from '@/src/components/screens/MediaDetailScreen';

export default function MediaDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mediaId = parseInt(id ?? '0', 10);
  return <MediaDetailScreen mediaId={mediaId} />;
}
