import { Redirect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthStore } from '@/src/store/authStore';

export default function Index() {
  const { isAuthenticated } = useAuth();
  const { hasSeenOnboarding } = useAuthStore();

  if (!hasSeenOnboarding) return <Redirect href="/onboarding" />;

  return <Redirect href={isAuthenticated ? '/(tabs)/discover' : '/(auth)/login'} />;
}
