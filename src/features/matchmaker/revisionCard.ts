import { DIMENSION_SPECS } from '@/features/matching/dimensions';
import type { Dimension, ModelRevision } from '@/types/domain';
import type { RevisionCardView } from '@/types/views';

/**
 * Derives an "I changed my mind about something" card from the most recent
 * meaningful revision. Returns null if nothing worth surfacing exists.
 *
 * Uses the existing model_revisions table — no parallel memory system.
 */
export function buildRevisionCard(
  revisions: ModelRevision[],
): RevisionCardView | null {
  const candidate = revisions
    .filter(
      (r) =>
        r.confirmed &&
        r.previousValue !== null &&
        r.newValue !== null &&
        r.previousValue !== r.newValue,
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!candidate) return null;

  const spec = DIMENSION_SPECS[candidate.dimension as Dimension];
  if (!spec) return null;

  const prevLabel = spec.valueLabels[candidate.previousValue!] ?? candidate.previousValue!;
  const newLabel = spec.valueLabels[candidate.newValue!] ?? candidate.newValue!;

  const narrative =
    `At first I thought ${spec.label.toLowerCase()} leaned toward ${prevLabel} for you. ` +
    `Your recent choices suggest ${newLabel} may matter more.`;

  return {
    revisionId: candidate.id,
    dimension: candidate.dimension as Dimension,
    label: spec.label,
    previousValueLabel: prevLabel,
    newValueLabel: newLabel,
    narrative,
  };
}
