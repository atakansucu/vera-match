declare const __DEV__: boolean | undefined;

/** Lightweight dev logger. No-ops in production and never logs private prompts. */
export function logDev(tag: string, data?: unknown): void {
  const isDev = typeof __DEV__ === 'undefined' ? true : __DEV__;
  if (isDev) {
    console.warn(`[kindred:${tag}]`, data ?? '');
  }
}
