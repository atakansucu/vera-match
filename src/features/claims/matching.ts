import type { ConfirmedDimension } from '@/features/matching/types';
import type { Claim, Dimension } from '@/types/domain';

/**
 * Derives the matching dimensions from a user's claims. ONLY confirmed claims
 * are included — unconfirmed hypotheses, rejected claims and superseded claims
 * never influence matching. This is the single enforcement point for the
 * "LLM output is never the source of truth" invariant.
 */
export function confirmedDimensions(
  claims: Claim[],
): Partial<Record<Dimension, ConfirmedDimension>> {
  const dimensions: Partial<Record<Dimension, ConfirmedDimension>> = {};
  for (const claim of claims) {
    if (claim.status !== 'confirmed') continue;
    dimensions[claim.dimension] = { value: claim.value, importance: claim.importance };
  }
  return dimensions;
}
