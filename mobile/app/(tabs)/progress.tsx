import ProgressScreen from '@/src/components/screens/ProgressScreen';
import AuthWall from '@/src/components/layout/AuthWall';

export default function ProgressRoute() {
  return (
    <AuthWall>
      <ProgressScreen />
    </AuthWall>
  );
}
