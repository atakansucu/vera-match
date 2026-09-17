import type { Claim, ClaimStatus } from '@/types/domain';

import { confirmedDimensions } from '../matching';

function claim(dimension: Claim['dimension'], value: string, status: ClaimStatus): Claim {
  return {
    id: `${dimension}-${status}`,
    userId: 'u1',
    dimension,
    value,
    claimType: 'stated',
    confidence: 'explicit_high',
    importance: 3,
    status,
    sourceType: 'onboarding_answer',
    supersededBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('confirmedDimensions (matching input)', () => {
  it('includes only confirmed claims', () => {
    const claims: Claim[] = [
      claim('planning_style', 'planner', 'confirmed'),
      claim('independence', 'independent', 'unconfirmed'),
      claim('social_frequency', 'social', 'rejected'),
      claim('texting_frequency', 'daily', 'superseded'),
    ];
    const dims = confirmedDimensions(claims);
    expect(dims.planning_style).toEqual({ value: 'planner', importance: 3 });
    expect(dims.independence).toBeUndefined();
    expect(dims.social_frequency).toBeUndefined();
    expect(dims.texting_frequency).toBeUndefined();
  });

  it('returns an empty object when nothing is confirmed', () => {
    const claims: Claim[] = [claim('planning_style', 'planner', 'unconfirmed')];
    expect(confirmedDimensions(claims)).toEqual({});
  });
});
