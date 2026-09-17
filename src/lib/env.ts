/**
 * Public runtime configuration. Only EXPO_PUBLIC_* values are ever available in
 * the mobile bundle. Secrets (OpenAI keys, Supabase service role, vendor keys)
 * MUST NOT appear here — they live only in server-side Edge Functions.
 */
function readList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  backend: (process.env.EXPO_PUBLIC_BACKEND ?? 'dev') as 'dev' | 'supabase',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  betaAllowedEmailDomains: readList(process.env.EXPO_PUBLIC_BETA_ALLOWED_EMAIL_DOMAINS),
} as const;

export function isSupabaseConfigured(): boolean {
  return env.backend === 'supabase' && Boolean(env.supabaseUrl) && Boolean(env.supabaseAnonKey);
}
