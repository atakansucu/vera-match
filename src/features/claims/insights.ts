import { DIMENSION_SPECS, type DimensionGroup } from '@/features/matching/dimensions';
import type { Claim } from '@/types/domain';
import type { ModelInsightView } from '@/types/views';

import { confidenceLanguage, deriveConfidence, sourceLanguage } from './confidence';

const GROUP_LABELS: Record<DimensionGroup, string> = {
  intentions: 'Relationship intentions',
  lifestyle: 'Lifestyle',
  communication: 'Communication',
  dynamics: 'Relationship dynamics',
};

export function groupLabel(group: DimensionGroup): string {
  return GROUP_LABELS[group];
}

/** Maps a claim to a user-facing insight row. Returns null for hidden statuses. */
export function claimToInsight(claim: Claim): ModelInsightView | null {
  if (claim.status === 'rejected' || claim.status === 'superseded') return null;
  const spec = DIMENSION_SPECS[claim.dimension];
  if (!spec) return null;

  return {
    claimId: claim.id,
    dimension: claim.dimension,
    group: GROUP_LABELS[spec.group],
    label: spec.label,
    valueLabel: spec.valueLabels[claim.value] ?? claim.value,
    value: claim.value,
    importance: claim.importance,
    confidenceText: confidenceLanguage(deriveConfidence(claim)),
    sourceText: sourceLanguage(claim),
    status: claim.status === 'confirmed' ? 'confirmed' : 'unconfirmed',
  };
}

export function claimsToInsights(claims: Claim[]): ModelInsightView[] {
  return claims
    .map(claimToInsight)
    .filter((insight): insight is ModelInsightView => insight !== null);
}
