import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';

export default function Index() {
  const { hasSeenOnboarding } = useAuthStore();

  if (!hasSeenOnboarding) return <Redirect href="/onboarding" />;

  // Open funnel: everyone lands in the catalogue. Login is only required when
  // saving/studying or opening premium content (enforced per-screen).
  return <Redirect href="/(tabs)/discover" />;
}
