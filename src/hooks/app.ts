import { getBackend } from '@/services/backend';
import { useSessionStore } from '@/state/session';

export function useBackend() {
  return getBackend();
}

/** Current signed-in user id. Screens under (tabs) are only reachable when authed. */
export function useUserId(): string {
  const session = useSessionStore((s) => s.session);
  if (!session) throw new Error('No active session.');
  return session.userId;
}

export function useOptionalUserId(): string | null {
  return useSessionStore((s) => s.session?.userId ?? null);
}
