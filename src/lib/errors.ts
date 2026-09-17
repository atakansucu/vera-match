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
