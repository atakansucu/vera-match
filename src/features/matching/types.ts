import type {
  ChildrenIntent,
  Dimension,
  Gender,
  ModerationStatus,
  RelationshipGoal,
  SmokingHabit,
  UserId,
  VerificationStatus,
} from '@/types/domain';

/**
 * A `MatchingProfile` is the sanitized, derived view of a user that the matching
 * engine operates on. It contains only confirmed facts — never raw reflections,
 * private text, or unconfirmed hypotheses.
 */
export interface MatchingProfile {
  userId: UserId;
  age: number;
  gender: Gender;
  preferredGenders: Gender[];
  approxLat: number;
  approxLng: number;
  maxDistanceKm: number;
  minAge: number;
  maxAge: number;
  relationshipGoal: RelationshipGoal;
  smoking: SmokingHabit;
  smokingDealbreaker: boolean;
  childrenIntent: ChildrenIntent;
  childrenDealbreaker: boolean;
  verificationStatus: VerificationStatus;
  moderationStatus: ModerationStatus;
  /** Confirmed soft preferences only. Unknown dimensions are simply absent. */
  dimensions: Partial<Record<Dimension, ConfirmedDimension>>;
}

export interface ConfirmedDimension {
  value: string;
  importance: number;
}

export interface EligibilityContext {
  /** Pairs of userIds that have blocked each other (either direction). */
  blockedUserIds: Set<UserId>;
  /** Users already introduced (prevents duplicates), by userId. */
  alreadyIntroducedUserIds: Set<UserId>;
  /** Users this viewer previously rejected (or who rejected the viewer). */
  previouslyRejectedUserIds: Set<UserId>;
}

export type IneligibilityReason =
  | 'self'
  | 'gender_preference'
  | 'age_range'
  | 'distance'
  | 'blocked'
  | 'already_introduced'
  | 'previously_rejected'
  | 'moderation'
  | 'relationship_goal'
  | 'smoking_dealbreaker'
  | 'children_dealbreaker';

export interface EligibilityResult {
  eligible: boolean;
  reasons: IneligibilityReason[];
}

export interface DimensionComparison {
  dimension: Dimension;
  viewerValue: string;
  otherValue: string;
  /** Ordinal distance between the two values on the scale. */
  distance: number;
  importance: number;
}

export interface CompatibilityResult {
  alignment: DimensionComparison[];
  friction: DimensionComparison[];
  unknowns: Dimension[];
  /** Normalized [0..1] weighted alignment across shared confirmed dimensions. */
  alignmentScore: number;
  /** Normalized [0..1] weighted friction penalty. */
  frictionPenalty: number;
}

export interface CandidateScore {
  candidateId: UserId;
  eligibility: EligibilityResult;
  compatibility: CompatibilityResult;
  /** INTERNAL composite score. Never surfaced to users. */
  score: number;
  explorationBonus: number;
}

export interface MicroQuestionNeed {
  dimension: Dimension;
  /** Why this question could plausibly change the current decision. */
  reason: 'unknown_high_impact';
}
