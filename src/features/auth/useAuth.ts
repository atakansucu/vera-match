import { useQueryClient } from '@tanstack/react-query';

import { getBackend } from '@/services/backend';
import { DEMO_EMAIL } from '@/services/backend/seed';
import { useSessionStore } from '@/state/session';

export function useAuthActions() {
  const backend = getBackend();
  const setSession = useSessionStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return {
    demoEmail: DEMO_EMAIL,
    isDev: backend.kind === 'dev',

    async sendCode(email: string) {
      return backend.sendEmailOtp(email.trim());
    },

    async verify(email: string, code: string) {
      const session = await backend.verifyEmailOtp(email.trim(), code.trim());
      setSession(session);
      await queryClient.invalidateQueries();
      return session;
    },

    async signInAsDemo() {
      await backend.sendEmailOtp(DEMO_EMAIL);
      const session = await backend.verifyEmailOtp(DEMO_EMAIL, '000000');
      setSession(session);
      await queryClient.invalidateQueries();
      return session;
    },

    async signOut() {
      await backend.signOut();
      setSession(null);
      queryClient.clear();
    },
  };
}
