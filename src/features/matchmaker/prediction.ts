import { DIMENSION_SPECS } from '@/features/matching/dimensions';
import type { Claim, PredictionEvent } from '@/types/domain';
import type { PredictionGameView, PredictionResultView } from '@/types/views';

export interface CandidateSummary {
  label: string;
  traits: string[];
}

/**
 * Builds a sanitized pair of candidate summaries for "Would I get you right?"
 * Uses only dimension labels and value labels — never private data, photos, or names.
 */
export function buildPredictionPair(
  confirmedClaims: Claim[],
): { a: CandidateSummary; b: CandidateSummary } | null {
  if (confirmedClaims.length < 2) return null;

  const dims = confirmedClaims
    .filter((c) => c.status === 'confirmed')
    .map((c) => c.dimension);

  const uniqueDims = [...new Set(dims)];
  if (uniqueDims.length < 2) return null;

  const traitsA: string[] = [];
  const traitsB: string[] = [];

  for (const dim of uniqueDims.slice(0, 4)) {
    const spec = DIMENSION_SPECS[dim];
    if (!spec || spec.scale.length < 2) continue;
    const userClaim = confirmedClaims.find((c) => c.dimension === dim && c.status === 'confirmed');
    if (!userClaim) continue;

    const userIdx = spec.scale.indexOf(userClaim.value);
    const alignedValue = userClaim.value;
    const oppositeIdx = userIdx === 0 ? spec.scale.length - 1 : 0;
    const oppositeValue = spec.scale[oppositeIdx];

    traitsA.push(spec.valueLabels[alignedValue] ?? alignedValue);
    traitsB.push(spec.valueLabels[oppositeValue] ?? oppositeValue);
  }

  if (traitsA.length < 2 || traitsB.length < 2) return null;

  return {
    a: { label: 'Person A', traits: traitsA },
    b: { label: 'Person B', traits: traitsB },
  };
}

/**
 * Predicts which candidate the user would prefer based on confirmed dimensions.
 * Always returns 'a' because candidate A is built from aligned traits.
 * This is deterministic — no LLM involved.
 */
export function predictChoice(): 'a' | 'b' {
  return 'a';
}

export function createPredictionEvent(
  userId: string,
  pair: { a: CandidateSummary; b: CandidateSummary },
): PredictionEvent {
  return {
    id: `pred-${userId}-${Date.now()}`,
    userId,
    predictionType: 'candidate_preference',
    candidateAPayload: pair.a,
    candidateBPayload: pair.b,
    predictedChoice: predictChoice(),
    actualChoice: null,
    correct: null,
    modelVersion: 'heuristic-v1',
    reason: null,
    createdAt: new Date().toISOString(),
  };
}

export function predictionToView(event: PredictionEvent): PredictionGameView {
  return {
    id: event.id,
    candidateA: event.candidateAPayload,
    candidateB: event.candidateBPayload,
  };
}

export function resolvePrediction(
  event: PredictionEvent,
  userChoice: 'a' | 'b',
  reason: string | null,
): { updated: PredictionEvent; result: PredictionResultView } {
  const correct = event.predictedChoice === userChoice;
  const updated: PredictionEvent = {
    ...event,
    actualChoice: userChoice,
    correct,
    reason,
  };
  return {
    updated,
    result: {
      correct,
      matchmakerPredicted: event.predictedChoice,
      userChose: userChoice,
    },
  };
}
