import { DIMENSION_SPECS } from '@/features/matching/dimensions';
import type { Claim, Dimension, ModelRevision } from '@/types/domain';
import type { WeeklyRecapView } from '@/types/views';

const RECAP_WINDOW_DAYS = 7;

/**
 * Derives a weekly recap from existing claims and revisions.
 * Never fabricates activity — returns null if nothing meaningful happened.
 */
export function buildWeeklyRecap(
  claims: Claim[],
  revisions: ModelRevision[],
  hasPromisingCandidate: boolean,
): WeeklyRecapView | null {
  const cutoff = Date.now() - RECAP_WINDOW_DAYS * 86_400_000;

  const recentRevisions = revisions.filter(
    (r) => new Date(r.createdAt).getTime() > cutoff,
  );

  if (recentRevisions.length === 0 && !hasPromisingCandidate) return null;

  const confirmed = recentRevisions.filter((r) => r.confirmed && r.newValue);
  const rejected = recentRevisions.filter((r) => !r.confirmed);

  const unknownDimensions = findUnknownDimensions(claims);

  const learned = confirmed.length > 0
    ? describeLearned(confirmed[0])
    : null;

  const stoppedAssuming = rejected.length > 0
    ? describeStoppedAssuming(rejected[0])
    : null;

  const stillCurious = unknownDimensions.length > 0
    ? describeStillCurious(unknownDimensions[0])
    : null;

  if (!learned && !stoppedAssuming && !stillCurious && !hasPromisingCandidate) {
    return null;
  }

  return {
    learned,
    stoppedAssuming,
    stillCurious,
    promisingCandidate: hasPromisingCandidate,
  };
}

function describeLearned(revision: ModelRevision): string {
  const spec = DIMENSION_SPECS[revision.dimension as Dimension];
  if (!spec) return `I learned something new about your ${revision.dimension.replace(/_/g, ' ')}.`;
  const label = revision.newValue
    ? (spec.valueLabels[revision.newValue] ?? revision.newValue)
    : spec.label.toLowerCase();
  return `You care about being ${label} — more than I originally thought.`;
}

function describeStoppedAssuming(revision: ModelRevision): string {
  const spec = DIMENSION_SPECS[revision.dimension as Dimension];
  if (!spec) return `I stopped assuming something about your ${revision.dimension.replace(/_/g, ' ')}.`;
  const prevLabel = revision.previousValue
    ? (spec.valueLabels[revision.previousValue] ?? revision.previousValue)
    : spec.label.toLowerCase();
  return `That ${prevLabel} automatically means a good fit.`;
}

function describeStillCurious(dimension: Dimension): string {
  const spec = DIMENSION_SPECS[dimension];
  if (!spec) return `How you feel about ${dimension.replace(/_/g, ' ')}.`;
  return `How much ${spec.label.toLowerCase()} matters to you.`;
}

function findUnknownDimensions(claims: Claim[]): Dimension[] {
  const knownDims = new Set(
    claims
      .filter((c) => c.status === 'confirmed' || c.status === 'unconfirmed')
      .map((c) => c.dimension),
  );
  const allDims: Dimension[] = Object.keys(DIMENSION_SPECS) as Dimension[];
  return allDims.filter((d) => !knownDims.has(d));
}
