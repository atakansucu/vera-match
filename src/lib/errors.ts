/**
 * User-facing error copy. Keep it calm, specific, and never leak internals.
 * Screens should map known failure modes to these rather than raw exception text.
 */

export const ERROR_COPY = {
  offline: "You're offline. I'll keep what you typed — try again when you're back.",
  supabaseUnavailable: "I can't reach the server right now. Please try again in a moment.",
  llmTimeout: "I couldn't finish thinking that through. Your words are saved.",
  llmMalformed: "I couldn't make sense of that response. Nothing was changed.",
  uploadFailed: "That photo didn't upload. You can try again, or skip for now.",
  expiredPhotoUrl: 'This photo link expired. Refresh to load it again.',
  duplicateAction: "I've already recorded that.",
  staleChat: 'This conversation may have changed. Pull to refresh.',
  generic: 'Something went wrong. Please try again.',
} as const;

export type ErrorKind = keyof typeof ERROR_COPY;

export function messageFor(kind: ErrorKind): string {
  return ERROR_COPY[kind];
}

/**
 * Map an unknown failure onto a user-facing kind. The original message is never
 * shown — it may contain SQL, stack traces, or vendor internals.
 */
export function classifyError(error: unknown): ErrorKind {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const text = raw.toLowerCase();

  if (
    /(network request failed|failed to fetch|offline|net::|econnrefused|enetunreach)/.test(text)
  ) {
    return 'offline';
  }
  if (/(supabase|jwt|auth session|postgres|postgrest|pgrst)/.test(text)) {
    return 'supabaseUnavailable';
  }
  if (/(timeout|timed out|etimedout|deadline exceeded)/.test(text)) {
    return 'llmTimeout';
  }
  if (/(malformed|unrecognized_keys|invalid_type|zod|json parse)/.test(text)) {
    return 'llmMalformed';
  }
  if (/(upload|storage|image picker|photo)/.test(text)) {
    return 'uploadFailed';
  }
  if (/(expired|signed url)/.test(text)) {
    return 'expiredPhotoUrl';
  }
  if (/(already recorded|duplicate|unique constraint|23505)/.test(text)) {
    return 'duplicateAction';
  }
  if (/(not a participant|no longer message|conversation may have changed)/.test(text)) {
    return 'staleChat';
  }
  return 'generic';
}
