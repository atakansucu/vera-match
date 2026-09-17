import type { VerificationStatus } from '@/types/domain';

/**
 * Matching weights and thresholds. These are intentionally server-configurable
 * (feature flags / app_config) so the product can be tuned without code changes.
 * A future learned ranker can replace the heuristic without touching product code.
 */
export interface MatchingConfig {
  algoVersion: string;
  /** Multiplier applied to normalized weighted alignment [0..1]. */
  alignmentWeight: number;
  /** Multiplier applied to normalized friction penalty [0..1]. */
  frictionWeight: number;
  /** Max exploration bonus added to avoid an overly narrow filter bubble. */
  explorationBonusMax: number;
  /**
   * Ordinal distance (steps on the scale) that counts as meaningful friction.
   * A 3-point scale has max distance 2, so 2 = clear friction.
   */
  frictionDistance: number;
  /** Minimum verification level required before a match can open a chat. */
  minVerificationForMatch: VerificationStatus;
}

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  algoVersion: 'heuristic-v1',
  alignmentWeight: 1,
  frictionWeight: 0.6,
  explorationBonusMax: 0.15,
  frictionDistance: 2,
  minVerificationForMatch: 'email_verified',
};

const VERIFICATION_RANK: Record<VerificationStatus, number> = {
  rejected: -1,
  unverified: 0,
  email_verified: 1,
  selfie_pending: 1,
  selfie_verified: 2,
};

export function meetsVerification(
  status: VerificationStatus,
  minimum: VerificationStatus,
): boolean {
  return VERIFICATION_RANK[status] >= VERIFICATION_RANK[minimum];
}
