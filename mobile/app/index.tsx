import { Redirect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

export default function Index() {
  const { isAuthenticated } = useAuth();

  // Auth implement edildiğinde: isAuthenticated ? '/(tabs)/discover' : '/(auth)/login'
  return <Redirect href="/(tabs)/discover" />;
}
