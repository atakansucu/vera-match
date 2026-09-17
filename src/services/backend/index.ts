import { logDev } from '@/lib/log';
import { isSupabaseConfigured } from '@/lib/env';

import { DevBackend } from './devBackend';
import type { Backend } from './types';

let instance: Backend | null = null;

/**
 * Returns the active backend. The dev backend powers local development, the web
 * preview and tests. The Supabase backend (authored under `supabase/` as the
 * canonical production server) is selected only when a live project is
 * configured via env.
 */
export function getBackend(): Backend {
  if (instance) return instance;
  if (isSupabaseConfigured()) {
    // The Supabase client backend is wired in a later phase; until then we fall
    // back to the dev backend and make the choice explicit rather than silent.
    logDev('backend', 'Supabase configured but client backend not yet enabled; using dev backend.');
  }
  instance = new DevBackend();
  return instance;
}

export type { Backend, ProfileInput, PreferencesInput } from './types';
