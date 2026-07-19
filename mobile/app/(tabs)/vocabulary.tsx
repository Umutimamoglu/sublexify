import VocabularyScreen from '@/src/components/screens/VocabularyScreen';
import AuthWall from '@/src/components/layout/AuthWall';

export default function VocabularyRoute() {
  return (
    <AuthWall>
      <VocabularyScreen />
    </AuthWall>
  );
}
