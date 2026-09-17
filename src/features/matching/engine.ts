import { haversineKm } from '@/lib/geo';
import type { ChildrenIntent, Dimension, RelationshipGoal } from '@/types/domain';
import { DIMENSIONS } from '@/types/domain';

import { DEFAULT_MATCHING_CONFIG, type MatchingConfig } from './config';
import { DIMENSION_SPECS, ordinalIndex } from './dimensions';
import type {
  CandidateScore,
  CompatibilityResult,
  DimensionComparison,
  EligibilityContext,
  EligibilityResult,
  MatchingProfile,
  MicroQuestionNeed,
} from './types';

// ---------------------------------------------------------------------------
// Stage 1 + 2: eligibility and hard boundaries
// ---------------------------------------------------------------------------

function genderMatch(a: MatchingProfile, b: MatchingProfile): boolean {
  return a.preferredGenders.includes(b.gender) && b.preferredGenders.includes(a.gender);
}

function ageMatch(a: MatchingProfile, b: MatchingProfile): boolean {
  return b.age >= a.minAge && b.age <= a.maxAge && a.age >= b.minAge && a.age <= b.maxAge;
}

function distanceMatch(a: MatchingProfile, b: MatchingProfile): boolean {
  const distance = haversineKm(a.approxLat, a.approxLng, b.approxLat, b.approxLng);
  return distance <= Math.min(a.maxDistanceKm, b.maxDistanceKm);
}

const OPPOSED_GOALS: Record<RelationshipGoal, RelationshipGoal[]> = {
  life_partner: ['short_term'],
  long_term: ['short_term'],
  short_term: ['life_partner', 'long_term'],
  unsure: [],
};

function relationshipGoalsCompatible(a: RelationshipGoal, b: RelationshipGoal): boolean {
  return !OPPOSED_GOALS[a].includes(b);
}

function childrenCompatible(
  intentA: ChildrenIntent,
  dealbreakerA: boolean,
  intentB: ChildrenIntent,
): boolean {
  if (!dealbreakerA) return true;
  // "open" / "unsure" are treated as compatible with anything.
  const hard = (i: ChildrenIntent): 'want' | 'dont_want' | null =>
    i === 'want' || i === 'dont_want' ? i : null;
  const a = hard(intentA);
  const b = hard(intentB);
  if (a === null || b === null) return true;
  return a === b;
}

function smokingCompatible(dealbreakerA: boolean, smokingB: MatchingProfile['smoking']): boolean {
  if (!dealbreakerA) return true;
  return smokingB !== 'yes';
}

/**
 * Stage 1 + 2. Hard filters and explicit dealbreakers. Returns every reason the
 * pairing fails so we can debug/test; a single reason makes the pair ineligible.
 * Reasons are INTERNAL and never surfaced to users.
 */
export function checkEligibility(
  viewer: MatchingProfile,
  candidate: MatchingProfile,
  ctx: EligibilityContext,
): EligibilityResult {
  const reasons: EligibilityResult['reasons'] = [];

  if (viewer.userId === candidate.userId) reasons.push('self');
  if (candidate.moderationStatus !== 'active') reasons.push('moderation');
  if (!genderMatch(viewer, candidate)) reasons.push('gender_preference');
  if (!ageMatch(viewer, candidate)) reasons.push('age_range');
  if (!distanceMatch(viewer, candidate)) reasons.push('distance');
  if (ctx.blockedUserIds.has(candidate.userId)) reasons.push('blocked');
  if (ctx.alreadyIntroducedUserIds.has(candidate.userId)) reasons.push('already_introduced');
  if (ctx.previouslyRejectedUserIds.has(candidate.userId)) reasons.push('previously_rejected');
  if (!relationshipGoalsCompatible(viewer.relationshipGoal, candidate.relationshipGoal)) {
    reasons.push('relationship_goal');
  }
  // Smoking dealbreaker applies in both directions.
  if (
    !smokingCompatible(viewer.smokingDealbreaker, candidate.smoking) ||
    !smokingCompatible(candidate.smokingDealbreaker, viewer.smoking)
  ) {
    reasons.push('smoking_dealbreaker');
  }
  // Children dealbreaker applies in both directions.
  if (
    !childrenCompatible(
      viewer.childrenIntent,
      viewer.childrenDealbreaker,
      candidate.childrenIntent,
    ) ||
    !childrenCompatible(
      candidate.childrenIntent,
      candidate.childrenDealbreaker,
      viewer.childrenIntent,
    )
  ) {
    reasons.push('children_dealbreaker');
  }

  return { eligible: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// Stage 3: structured compatibility over CONFIRMED dimensions only
// ---------------------------------------------------------------------------

function maxDistanceFor(dimension: Dimension): number {
  return DIMENSION_SPECS[dimension].scale.length - 1;
}

export function computeCompatibility(
  viewer: MatchingProfile,
  candidate: MatchingProfile,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
): CompatibilityResult {
  const alignment: DimensionComparison[] = [];
  const friction: DimensionComparison[] = [];
  const unknowns: Dimension[] = [];

  let weightedAlignmentSum = 0;
  let weightedFrictionSum = 0;
  let totalImportance = 0;

  for (const dimension of DIMENSIONS) {
    const v = viewer.dimensions[dimension];
    const o = candidate.dimensions[dimension];

    // Unknown if EITHER side lacks a confirmed value. Unknowns never contribute
    // to the positive alignment score.
    if (!v || !o) {
      unknowns.push(dimension);
      continue;
    }

    const distance = Math.abs(ordinalIndex(dimension, v.value) - ordinalIndex(dimension, o.value));
    const importance = (v.importance + o.importance) / 2;
    const maxDistance = maxDistanceFor(dimension);
    const normalizedAlignment = 1 - distance / maxDistance;

    const comparison: DimensionComparison = {
      dimension,
      viewerValue: v.value,
      otherValue: o.value,
      distance,
      importance,
    };

    weightedAlignmentSum += normalizedAlignment * importance;
    totalImportance += importance;

    if (distance === 0) {
      alignment.push(comparison);
    } else if (distance >= config.frictionDistance) {
      friction.push(comparison);
      weightedFrictionSum += (distance / maxDistance) * importance;
    }
  }

  const alignmentScore = totalImportance > 0 ? weightedAlignmentSum / totalImportance : 0;
  const frictionPenalty = totalImportance > 0 ? weightedFrictionSum / totalImportance : 0;

  // Rank alignment/friction by importance so explanations surface what matters.
  alignment.sort((a, b) => b.importance - a.importance);
  friction.sort((a, b) => b.importance - a.importance);
  unknowns.sort(
    (a, b) => DIMENSION_SPECS[b].defaultImportance - DIMENSION_SPECS[a].defaultImportance,
  );

  return { alignment, friction, unknowns, alignmentScore, frictionPenalty };
}

// ---------------------------------------------------------------------------
// Stage 4: uncertainty -> micro-question need
// ---------------------------------------------------------------------------

/**
 * Returns a dimension worth asking the viewer about, or null. A question is only
 * proposed when the viewer's value is unknown AND the candidate cares about it
 * (high importance). Recency ("not recently asked") is enforced by the caller.
 */
export function selectMicroQuestionNeed(
  viewer: MatchingProfile,
  candidate: MatchingProfile,
  importanceThreshold = 3,
): MicroQuestionNeed | null {
  const candidates: { dimension: Dimension; importance: number }[] = [];
  for (const dimension of DIMENSIONS) {
    const viewerKnows = Boolean(viewer.dimensions[dimension]);
    const candidateValue = candidate.dimensions[dimension];
    if (viewerKnows || !candidateValue) continue;
    if (candidateValue.importance >= importanceThreshold) {
      candidates.push({ dimension, importance: candidateValue.importance });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.importance - a.importance);
  return { dimension: candidates[0].dimension, reason: 'unknown_high_impact' };
}

// ---------------------------------------------------------------------------
// Stage 5: deterministic ranking
// ---------------------------------------------------------------------------

/**
 * Small, deterministic exploration bonus derived from the pair ids. Encourages
 * diversity so the product doesn't collapse into a narrow filter bubble, while
 * remaining reproducible for tests. It is NOT randomness at request time.
 */
export function explorationBonus(viewerId: string, candidateId: string, max: number): number {
  const seed = `${viewerId}:${candidateId}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  const unit = (Math.abs(hash) % 1000) / 1000;
  return unit * max;
}

export function scoreCandidate(
  viewer: MatchingProfile,
  candidate: MatchingProfile,
  ctx: EligibilityContext,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
): CandidateScore {
  const eligibility = checkEligibility(viewer, candidate, ctx);
  const compatibility = computeCompatibility(viewer, candidate, config);
  const bonus = explorationBonus(viewer.userId, candidate.userId, config.explorationBonusMax);

  const rawScore =
    config.alignmentWeight * compatibility.alignmentScore -
    config.frictionWeight * compatibility.frictionPenalty +
    bonus;

  const score = eligibility.eligible ? Math.max(0, rawScore) : 0;

  return {
    candidateId: candidate.userId,
    eligibility,
    compatibility,
    score,
    explorationBonus: bonus,
  };
}

/** Ranks eligible candidates by internal score (highest first). */
export function rankCandidates(
  viewer: MatchingProfile,
  candidates: MatchingProfile[],
  ctx: EligibilityContext,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
): CandidateScore[] {
  return candidates
    .map((candidate) => scoreCandidate(viewer, candidate, ctx, config))
    .filter((result) => result.eligibility.eligible)
    .sort((a, b) => b.score - a.score);
}
