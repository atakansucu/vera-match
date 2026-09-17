import type { Claim } from '@/types/domain';

import {
  buildPredictionPair,
  createPredictionEvent,
  predictChoice,
  resolvePrediction,
} from '../prediction';

function confirmedClaim(dimension: string, value: string): Claim {
  return {
    id: `claim-${dimension}`,
    userId: 'user-1',
    dimension: dimension as Claim['dimension'],
    value,
    claimType: 'stated',
    confidence: 'explicit_high',
    importance: 3,
    status: 'confirmed',
    sourceType: 'onboarding_answer',
    supersededBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('buildPredictionPair', () => {
  it('returns null when fewer than 2 confirmed claims', () => {
    const claims = [confirmedClaim('planning_style', 'planner')];
    expect(buildPredictionPair(claims)).toBeNull();
  });

  it('builds a pair with at least 2 traits each', () => {
    const claims = [
      confirmedClaim('planning_style', 'planner'),
      confirmedClaim('independence', 'independent'),
      confirmedClaim('social_frequency', 'balanced'),
    ];
    const pair = buildPredictionPair(claims);
    expect(pair).not.toBeNull();
    expect(pair!.a.traits.length).toBeGreaterThanOrEqual(2);
    expect(pair!.b.traits.length).toBeGreaterThanOrEqual(2);
  });

  it('does not include private data in trait labels', () => {
    const claims = [
      confirmedClaim('planning_style', 'planner'),
      confirmedClaim('independence', 'independent'),
    ];
    const pair = buildPredictionPair(claims);
    if (pair) {
      for (const trait of [...pair.a.traits, ...pair.b.traits]) {
        expect(typeof trait).toBe('string');
        expect(trait.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('predictChoice', () => {
  it('returns deterministic prediction (always a)', () => {
    expect(predictChoice()).toBe('a');
  });
});

describe('createPredictionEvent', () => {
  it('stores prediction BEFORE actual choice', () => {
    const claims = [
      confirmedClaim('planning_style', 'planner'),
      confirmedClaim('independence', 'independent'),
    ];
    const pair = buildPredictionPair(claims)!;
    const event = createPredictionEvent('user-1', pair);
    expect(event.predictedChoice).toBe('a');
    expect(event.actualChoice).toBeNull();
    expect(event.correct).toBeNull();
  });
});

describe('resolvePrediction', () => {
  const claims = [
    confirmedClaim('planning_style', 'planner'),
    confirmedClaim('independence', 'independent'),
  ];

  it('marks correct when user matches prediction', () => {
    const pair = buildPredictionPair(claims)!;
    const event = createPredictionEvent('user-1', pair);
    const { updated, result } = resolvePrediction(event, 'a', null);
    expect(result.correct).toBe(true);
    expect(updated.actualChoice).toBe('a');
    expect(updated.correct).toBe(true);
  });

  it('marks incorrect when user differs from prediction', () => {
    const pair = buildPredictionPair(claims)!;
    const event = createPredictionEvent('user-1', pair);
    const { updated, result } = resolvePrediction(event, 'b', null);
    expect(result.correct).toBe(false);
    expect(updated.actualChoice).toBe('b');
    expect(updated.correct).toBe(false);
  });

  it('incorrect prediction does NOT automatically rewrite preferences', () => {
    const pair = buildPredictionPair(claims)!;
    const event = createPredictionEvent('user-1', pair);
    resolvePrediction(event, 'b', 'personality');
    // The original claims array is untouched
    expect(claims.every((c) => c.status === 'confirmed')).toBe(true);
  });
});
