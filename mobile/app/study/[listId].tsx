import { useLocalSearchParams } from 'expo-router';
import StudyScreen from '@/src/components/screens/StudyScreen';

export default function StudyRoute() {
  const { listId, types, difficulties, onlyUnknown, size } = useLocalSearchParams<{ 
    listId: string; 
    types?: string;
    difficulties?: string;
    onlyUnknown?: string;
    size?: string;
  }>();

  const isHavuz = listId === 'havuz';

  return (
    <StudyScreen 
      listId={isHavuz ? null : Number(listId)} 
      types={types ? types.split(',') : undefined}
      difficulties={difficulties ? difficulties.split(',') : undefined}
      onlyUnknown={onlyUnknown === 'true'}
      size={size ? Number(size) : 20}
    />
  );
}
