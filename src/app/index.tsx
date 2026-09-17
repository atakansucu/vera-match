import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';

import { FullScreenLoader } from '@/components';
import { getBackend } from '@/services/backend';
import { useSessionStore } from '@/state/session';

export default function Index() {
  const session = useSessionStore((s) => s.session);
  const hydrated = useSessionStore((s) => s.hydrated);
  const backend = getBackend();

  const profileQuery = useQuery({
    queryKey: ['profile', session?.userId],
    queryFn: () => backend.getProfile(session!.userId),
    enabled: hydrated && Boolean(session),
  });

  if (!hydrated) return <FullScreenLoader />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (profileQuery.isPending) return <FullScreenLoader />;

  const profile = profileQuery.data;
  if (!profile || !profile.onboardingCompletedAt) {
    return <Redirect href="/onboarding" />;
  }
  return <Redirect href="/(tabs)" />;
}
