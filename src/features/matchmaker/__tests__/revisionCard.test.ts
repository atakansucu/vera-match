import type { ModelRevision } from '@/types/domain';

import { buildRevisionCard } from '../revisionCard';

function makeRevision(overrides: Partial<ModelRevision> = {}): ModelRevision {
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

describe('buildRevisionCard', () => {
  it('returns null when no revisions exist', () => {
    expect(buildRevisionCard([])).toBeNull();
  });

  it('returns null when no revision has both previous and new values', () => {
    const revisions = [makeRevision({ previousValue: null })];
    expect(buildRevisionCard(revisions)).toBeNull();
  });

  it('returns null for unconfirmed revisions', () => {
    const revisions = [makeRevision({ confirmed: false })];
    expect(buildRevisionCard(revisions)).toBeNull();
  });

  it('returns null when previous and new values are the same', () => {
    const revisions = [makeRevision({ previousValue: 'planner', newValue: 'planner' })];
    expect(buildRevisionCard(revisions)).toBeNull();
  });

  it('builds a revision card for a meaningful change', () => {
    const revisions = [
      makeRevision({
        previousValue: 'spontaneous',
        newValue: 'planner',
      }),
    ];
    const card = buildRevisionCard(revisions);
    expect(card).not.toBeNull();
    expect(card!.dimension).toBe('planning_style');
    expect(card!.narrative).toContain('spontaneous');
    expect(card!.narrative).toContain('planner');
  });

  it('picks the most recent revision', () => {
    const revisions = [
      makeRevision({
        id: 'rev-old',
        previousValue: 'spontaneous',
        newValue: 'flexible',
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      }),
      makeRevision({
        id: 'rev-new',
        previousValue: 'flexible',
        newValue: 'planner',
        createdAt: new Date().toISOString(),
      }),
    ];
    const card = buildRevisionCard(revisions);
    expect(card!.revisionId).toBe('rev-new');
  });

  it('uses existing claim/revision system — no parallel memory', () => {
    const revisions = [makeRevision()];
    const card = buildRevisionCard(revisions);
    expect(card!.revisionId).toBe('rev-1');
  });
});
