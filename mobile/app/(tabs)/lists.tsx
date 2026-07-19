import ListsTabScreen from '@/src/components/screens/ListsTabScreen';
import AuthWall from '@/src/components/layout/AuthWall';

export default function ListsRoute() {
  return (
    <AuthWall>
      <ListsTabScreen />
    </AuthWall>
  );
}
