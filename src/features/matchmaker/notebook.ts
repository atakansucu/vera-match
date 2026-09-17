import type { Claim, ModelRevision } from '@/types/domain';
import type { ModelInsightView, NotebookView } from '@/types/views';

import { claimsToInsights } from '../claims/insights';

const RECENT_REVISION_DAYS = 14;

/**
 * Categorizes the user's model into three postures:
 * - Pretty sure: confirmed, stable insights (no recent revision)
 * - I'm reconsidering: confirmed but recently revised or contradicted
 * - Still figuring out: unconfirmed or low-confidence
 */
export function buildNotebook(
  claims: Claim[],
  revisions: ModelRevision[],
): NotebookView {
  const insights = claimsToInsights(claims);
  const recentCutoff = Date.now() - RECENT_REVISION_DAYS * 86_400_000;

  const recentlyRevisedDimensions = new Set(
    revisions
      .filter((r) => new Date(r.createdAt).getTime() > recentCutoff && r.previousValue !== null)
      .map((r) => r.dimension),
  );

  const prettySure: ModelInsightView[] = [];
  const reconsidering: ModelInsightView[] = [];
  const figuringOut: ModelInsightView[] = [];

  for (const insight of insights) {
    if (insight.status === 'unconfirmed') {
      figuringOut.push(insight);
    } else if (recentlyRevisedDimensions.has(insight.dimension)) {
      reconsidering.push(insight);
    } else {
      prettySure.push(insight);
    }
  }

  return { prettySure, reconsidering, figuringOut };
}
