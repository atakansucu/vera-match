import { z } from 'zod';

export const emailSchema = z.string().email('Enter a valid email address.');

export const otpSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.');

/**
 * Configurable community email-domain gate for closed beta. An empty allow-list
 * means any email is accepted (development / open testing).
 */
export function isEmailDomainAllowed(email: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) return true;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return allowedDomains.some((allowed) => domain === allowed.toLowerCase());
}
