import {
  checkEligibility,
  computeCompatibility,
  rankCandidates,
  scoreCandidate,
  selectMicroQuestionNeed,
} from '../engine';
import type { EligibilityContext, MatchingProfile } from '../types';

function emptyContext(): EligibilityContext {
  return {
    blockedUserIds: new Set(),
    alreadyIntroducedUserIds: new Set(),
    previouslyRejectedUserIds: new Set(),
  };
}

function makeProfile(overrides: Partial<MatchingProfile> = {}): MatchingProfile {
  return {
    userId: 'user-a',
    age: 27,
    gender: 'woman',
    preferredGenders: ['man'],
    approxLat: 48.14,
    approxLng: 11.58,
    maxDistanceKm: 25,
    minAge: 24,
    maxAge: 33,
    relationshipGoal: 'long_term',
    smoking: 'no',
    smokingDealbreaker: false,
    childrenIntent: 'open',
    childrenDealbreaker: false,
    verificationStatus: 'email_verified',
    moderationStatus: 'active',
    dimensions: {},
    ...overrides,
  };
}

describe('checkEligibility (Stage 1 + 2)', () => {
  const ctx = emptyContext();

  it('accepts a mutually compatible pair', () => {
    const a = makeProfile({ userId: 'a', gender: 'woman', preferredGenders: ['man'] });
    const b = makeProfile({ userId: 'b', gender: 'man', preferredGenders: ['woman'] });
    expect(checkEligibility(a, b, ctx)).toEqual({ eligible: true, reasons: [] });
  });

  it('requires mutual partner-gender preference', () => {
    const a = makeProfile({ userId: 'a', gender: 'woman', preferredGenders: ['man'] });
    // b does not want women
    const b = makeProfile({ userId: 'b', gender: 'man', preferredGenders: ['man'] });
    const result = checkEligibility(a, b, ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('gender_preference');
  });

  it('excludes candidates outside the age range (both directions)', () => {
    const a = makeProfile({
      userId: 'a',
      minAge: 24,
      maxAge: 30,
      gender: 'woman',
      preferredGenders: ['man'],
    });
    const b = makeProfile({ userId: 'b', age: 41, gender: 'man', preferredGenders: ['woman'] });
    const result = checkEligibility(a, b, ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('age_range');
  });

  it('excludes blocked users', () => {
    const a = makeProfile({ userId: 'a', gender: 'woman', preferredGenders: ['man'] });
    const b = makeProfile({ userId: 'b', gender: 'man', preferredGenders: ['woman'] });
    const blockedCtx = { ...emptyContext(), blockedUserIds: new Set(['b']) };
    const result = checkEligibility(a, b, blockedCtx);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('blocked');
  });

  it('excludes previously rejected pairs', () => {
    const a = makeProfile({ userId: 'a', gender: 'woman', preferredGenders: ['man'] });
    const b = makeProfile({ userId: 'b', gender: 'man', preferredGenders: ['woman'] });
    const rejectedCtx = { ...emptyContext(), previouslyRejectedUserIds: new Set(['b']) };
    const result = checkEligibility(a, b, rejectedCtx);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('previously_rejected');
  });

  it('excludes candidates who are too far away', () => {
    const a = makeProfile({
      userId: 'a',
      approxLat: 48.14,
      approxLng: 11.58,
      maxDistanceKm: 10,
      gender: 'woman',
      preferredGenders: ['man'],
    });
    // Berlin-ish, far from Munich
    const b = makeProfile({
      userId: 'b',
      approxLat: 52.52,
      approxLng: 13.4,
      gender: 'man',
      preferredGenders: ['woman'],
    });
    const result = checkEligibility(a, b, ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('distance');
  });

  it('applies smoking dealbreaker in both directions', () => {
    const a = makeProfile({
      userId: 'a',
      smokingDealbreaker: true,
      gender: 'woman',
      preferredGenders: ['man'],
    });
    const b = makeProfile({
      userId: 'b',
      smoking: 'yes',
      gender: 'man',
      preferredGenders: ['woman'],
    });
    const result = checkEligibility(a, b, ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('smoking_dealbreaker');
  });

  it('applies children dealbreaker for opposed intentions', () => {
    const a = makeProfile({
      userId: 'a',
      childrenIntent: 'want',
      childrenDealbreaker: true,
      gender: 'woman',
      preferredGenders: ['man'],
    });
    const b = makeProfile({
      userId: 'b',
      childrenIntent: 'dont_want',
      gender: 'man',
      preferredGenders: ['woman'],
    });
    const result = checkEligibility(a, b, ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('children_dealbreaker');
  });

  it('does not trigger children dealbreaker for open/unsure intents', () => {
    const a = makeProfile({
      userId: 'a',
      childrenIntent: 'want',
      childrenDealbreaker: true,
      gender: 'woman',
      preferredGenders: ['man'],
    });
    const b = makeProfile({
      userId: 'b',
      childrenIntent: 'unsure',
      gender: 'man',
      preferredGenders: ['woman'],
    });
    expect(checkEligibility(a, b, ctx).eligible).toBe(true);
  });

  it('excludes directly opposed relationship goals', () => {
    const a = makeProfile({
      userId: 'a',
      relationshipGoal: 'life_partner',
      gender: 'woman',
      preferredGenders: ['man'],
    });
    const b = makeProfile({
      userId: 'b',
      relationshipGoal: 'short_term',
      gender: 'man',
      preferredGenders: ['woman'],
    });
    const result = checkEligibility(a, b, ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('relationship_goal');
  });

  it('excludes non-active moderation status', () => {
    const a = makeProfile({ userId: 'a', gender: 'woman', preferredGenders: ['man'] });
    const b = makeProfile({
      userId: 'b',
      gender: 'man',
      preferredGenders: ['woman'],
      moderationStatus: 'suspended',
    });
    const result = checkEligibility(a, b, ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('moderation');
  });
});

describe('computeCompatibility (Stage 3)', () => {
  it('marks identical confirmed dimensions as alignment', () => {
    const a = makeProfile({
      dimensions: { independence: { value: 'independent', importance: 4 } },
    });
    const b = makeProfile({
      dimensions: { independence: { value: 'independent', importance: 4 } },
    });
    const result = computeCompatibility(a, b);
    expect(result.alignment.map((c) => c.dimension)).toContain('independence');
    expect(result.friction).toHaveLength(0);
    expect(result.alignmentScore).toBeCloseTo(1, 5);
  });

  it('marks opposite ends of a scale as friction', () => {
    const a = makeProfile({ dimensions: { planning_style: { value: 'planner', importance: 4 } } });
    const b = makeProfile({
      dimensions: { planning_style: { value: 'spontaneous', importance: 4 } },
    });
    const result = computeCompatibility(a, b);
    expect(result.friction.map((c) => c.dimension)).toContain('planning_style');
    expect(result.frictionPenalty).toBeGreaterThan(0);
  });

  it('treats a dimension known by only one side as unknown, not positive', () => {
    const a = makeProfile({ dimensions: { texting_frequency: { value: 'daily', importance: 3 } } });
    const b = makeProfile({ dimensions: {} });
    const result = computeCompatibility(a, b);
    expect(result.unknowns).toContain('texting_frequency');
    expect(result.alignment).toHaveLength(0);
    // Crucially, an unknown must not inflate the alignment score.
    expect(result.alignmentScore).toBe(0);
  });

  it('gives zero alignment score when there are no shared confirmed dimensions', () => {
    const a = makeProfile({ dimensions: {} });
    const b = makeProfile({ dimensions: {} });
    const result = computeCompatibility(a, b);
    expect(result.alignmentScore).toBe(0);
    expect(result.frictionPenalty).toBe(0);
  });
});

describe('scoreCandidate + rankCandidates (Stage 5)', () => {
  const ctx = emptyContext();

  it('scores ineligible candidates as zero', () => {
    const a = makeProfile({ userId: 'a', gender: 'woman', preferredGenders: ['man'] });
    const b = makeProfile({ userId: 'b', gender: 'woman', preferredGenders: ['woman'] });
    const result = scoreCandidate(a, b, ctx);
    expect(result.eligibility.eligible).toBe(false);
    expect(result.score).toBe(0);
  });

  it('ranks a well-aligned candidate above a friction-heavy one', () => {
    const viewer = makeProfile({
      userId: 'viewer',
      gender: 'woman',
      preferredGenders: ['man'],
      dimensions: {
        independence: { value: 'independent', importance: 4 },
        planning_style: { value: 'planner', importance: 4 },
      },
    });
    const aligned = makeProfile({
      userId: 'aligned',
      gender: 'man',
      preferredGenders: ['woman'],
      dimensions: {
        independence: { value: 'independent', importance: 4 },
        planning_style: { value: 'planner', importance: 4 },
      },
    });
    const friction = makeProfile({
      userId: 'friction',
      gender: 'man',
      preferredGenders: ['woman'],
      dimensions: {
        independence: { value: 'togetherness', importance: 4 },
        planning_style: { value: 'spontaneous', importance: 4 },
      },
    });
    const ranked = rankCandidates(viewer, [friction, aligned], ctx);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].candidateId).toBe('aligned');
  });

  it('filters out ineligible candidates from ranking', () => {
    const viewer = makeProfile({ userId: 'viewer', gender: 'woman', preferredGenders: ['man'] });
    const eligible = makeProfile({
      userId: 'eligible',
      gender: 'man',
      preferredGenders: ['woman'],
    });
    const wrongGender = makeProfile({
      userId: 'wrong',
      gender: 'woman',
      preferredGenders: ['woman'],
    });
    const ranked = rankCandidates(viewer, [eligible, wrongGender], ctx);
    expect(ranked.map((r) => r.candidateId)).toEqual(['eligible']);
  });
});

describe('selectMicroQuestionNeed (Stage 4)', () => {
  it('asks about a dimension the viewer is missing but the candidate cares about', () => {
    const viewer = makeProfile({ dimensions: {} });
    const candidate = makeProfile({
      dimensions: { texting_frequency: { value: 'daily', importance: 4 } },
    });
    const need = selectMicroQuestionNeed(viewer, candidate);
    expect(need?.dimension).toBe('texting_frequency');
  });

  it('does not ask when the viewer already has the value', () => {
    const viewer = makeProfile({
      dimensions: { texting_frequency: { value: 'sometimes', importance: 3 } },
    });
    const candidate = makeProfile({
      dimensions: { texting_frequency: { value: 'daily', importance: 4 } },
    });
    expect(selectMicroQuestionNeed(viewer, candidate)).toBeNull();
  });

  it('does not ask about low-importance unknowns', () => {
    const viewer = makeProfile({ dimensions: {} });
    const candidate = makeProfile({
      dimensions: { travel_tendency: { value: 'frequent', importance: 1 } },
    });
    expect(selectMicroQuestionNeed(viewer, candidate)).toBeNull();
  });
});
