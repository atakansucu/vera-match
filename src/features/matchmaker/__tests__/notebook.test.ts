import type { Claim, ModelRevision } from '@/types/domain';

import { buildNotebook } from '../notebook';

function makeClaim(overrides: Partial<Claim>): Claim {
  return {
    id: 'claim-1',
    userId: 'user-1',
    dimension: 'planning_style',
    value: 'planner',
    claimType: 'stated',
    confidence: 'explicit_high',
    importance: 3,
    status: 'confirmed',
    sourceType: 'onboarding_answer',
    supersededBy: null,
    createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    ...overrides,
  };
}

function makeRevision(overrides: Partial<ModelRevision>): ModelRevision {
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

describe('buildNotebook', () => {
  it('categorizes confirmed stable claims as prettySure', () => {
    const claims = [makeClaim({ status: 'confirmed' })];
    const result = buildNotebook(claims, []);
    expect(result.prettySure).toHaveLength(1);
    expect(result.reconsidering).toHaveLength(0);
    expect(result.figuringOut).toHaveLength(0);
  });

  it('categorizes unconfirmed claims as figuringOut', () => {
    const claims = [makeClaim({ status: 'unconfirmed' })];
    const result = buildNotebook(claims, []);
    expect(result.prettySure).toHaveLength(0);
    expect(result.figuringOut).toHaveLength(1);
  });

  it('categorizes recently revised claims as reconsidering', () => {
    const claims = [makeClaim({ dimension: 'planning_style', status: 'confirmed' })];
    const revisions = [
      makeRevision({
        dimension: 'planning_style',
        previousValue: 'spontaneous',
        newValue: 'planner',
        createdAt: new Date().toISOString(),
      }),
    ];
    const result = buildNotebook(claims, revisions);
    expect(result.reconsidering).toHaveLength(1);
    expect(result.prettySure).toHaveLength(0);
  });

  it('excludes rejected and superseded claims', () => {
    const claims = [
      makeClaim({ id: 'c1', status: 'rejected' }),
      makeClaim({ id: 'c2', status: 'superseded' }),
    ];
    const result = buildNotebook(claims, []);
    expect(result.prettySure).toHaveLength(0);
    expect(result.figuringOut).toHaveLength(0);
    expect(result.reconsidering).toHaveLength(0);
  });

  it('old revisions do not move claims to reconsidering', () => {
    const claims = [makeClaim({ status: 'confirmed' })];
    const revisions = [
      makeRevision({
        createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
      }),
    ];
    const result = buildNotebook(claims, revisions);
    expect(result.prettySure).toHaveLength(1);
    expect(result.reconsidering).toHaveLength(0);
  });
});
