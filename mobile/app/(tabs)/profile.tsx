import ProfileScreen from '@/src/components/screens/ProfileScreen';
import AuthWall from '@/src/components/layout/AuthWall';

export default function ProfileRoute() {
  return (
    <AuthWall>
      <ProfileScreen />
    </AuthWall>
  );
}
