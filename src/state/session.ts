import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Session } from '@/types/views';

interface SessionState {
  session: Session | null;
  hydrated: boolean;
  setSession: (session: Session | null) => void;
  setHydrated: () => void;
}

/**
 * Client session store. The session identifier is persisted so the app resumes
 * signed-in. It holds no secrets — the backend enforces all authorization.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      hydrated: false,
      setSession: (session) => set({ session }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'kindred-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
