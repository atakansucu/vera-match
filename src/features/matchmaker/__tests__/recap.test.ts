import type { Claim, ModelRevision } from '@/types/domain';

import { buildWeeklyRecap } from '../recap';

function recentRevision(overrides: Partial<ModelRevision> = {}): ModelRevision {
  return {
    id: 'rev-1',
    userId: 'user-1',
    claimId: 'claim-1',
    dimension: 'planning_style',
    previousValue: 'spontaneous',
    newValue: 'planner',
    source: 'reflection',
    confirmed: true,
    reflectionEventId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('buildWeeklyRecap', () => {
  it('returns null when nothing happened and no candidate', () => {
    const result = buildWeeklyRecap([], [], false);
    expect(result).toBeNull();
  });

  it('returns a recap when a revision was confirmed this week', () => {
    const result = buildWeeklyRecap(
      [],
      [recentRevision({ confirmed: true, newValue: 'planner' })],
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.learned).toBeTruthy();
  });

  it('includes stoppedAssuming when a revision was rejected', () => {
    const result = buildWeeklyRecap(
      [],
      [recentRevision({ confirmed: false, previousValue: 'spontaneous' })],
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.stoppedAssuming).toBeTruthy();
  });

  it('includes stillCurious for unknown dimensions', () => {
    const claims: Claim[] = [
      {
        id: 'c1',
        userId: 'u1',
        dimension: 'planning_style',
        value: 'planner',
        claimType: 'stated',
        confidence: 'explicit_high',
        importance: 3,
        status: 'confirmed',
        sourceType: 'onboarding_answer',
        supersededBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const result = buildWeeklyRecap(claims, [recentRevision()], false);
    expect(result).not.toBeNull();
    expect(result!.stillCurious).toBeTruthy();
  });

  it('reflects promising candidate when one exists', () => {
    const result = buildWeeklyRecap([], [], true);
    expect(result).not.toBeNull();
    expect(result!.promisingCandidate).toBe(true);
  });

  it('never fabricates activity', () => {
    const result = buildWeeklyRecap([], [], false);
    expect(result).toBeNull();
  });
});
