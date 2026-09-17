import { DEMO_EMAIL } from '../seed';
import { DevBackend } from '../devBackend';
import { confirmedDimensions } from '@/features/claims/matching';

async function demo(backend: DevBackend): Promise<string> {
  const session = await backend.verifyEmailOtp(DEMO_EMAIL, '000000');
  return session.userId;
}

describe('claim lifecycle (Phase 2 invariants)', () => {
  it('creates unconfirmed hypotheses that do not influence matching until confirmed', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    const { createdClaims } = await backend.shareThought(
      userId,
      'I want someone emotionally open, not guarded.',
    );
    expect(createdClaims.length).toBeGreaterThan(0);
    const claim = createdClaims[0];
    expect(claim.dimension).toBe('emotional_openness');
    expect(claim.status).toBe('unconfirmed');

    // Not yet part of the matching input.
    const before = confirmedDimensions(await backend.listClaims(userId));
    expect(before.emotional_openness).toBeUndefined();

    await backend.confirmClaim(userId, claim.id);

    const after = confirmedDimensions(await backend.listClaims(userId));
    expect(after.emotional_openness?.value).toBe('open');
  });

  it('excludes rejected claims from the model and from matching', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);
    // emotional_openness is a dimension the demo user does not already have.
    const { createdClaims } = await backend.shareThought(
      userId,
      'I want someone emotionally open, not guarded.',
    );
    const claim = createdClaims[0];
    expect(claim.dimension).toBe('emotional_openness');

    await backend.rejectClaim(userId, claim.id);

    const insights = await backend.getModelInsights(userId);
    expect(insights.some((i) => i.claimId === claim.id)).toBe(false);
    const dims = confirmedDimensions(await backend.listClaims(userId));
    // The rejected hypothesis must not appear as a confirmed dimension.
    expect(dims.emotional_openness).toBeUndefined();
  });

  it('supersedes a prior confirmed claim on revision and preserves history', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    // Ava starts with work_life_balance = balanced (seeded, confirmed).
    await backend.confirmRevision(userId, 'refl-test', {
      dimension: 'work_life_balance',
      value: 'life_focused',
      previousValue: 'balanced',
      rationale: 'Reflection suggested a shift.',
      question: 'Does this sound right?',
    });

    const claims = (await backend.listClaims(userId)).filter(
      (c) => c.dimension === 'work_life_balance',
    );
    const confirmed = claims.filter((c) => c.status === 'confirmed');
    const superseded = claims.filter((c) => c.status === 'superseded');
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0].value).toBe('life_focused');
    expect(superseded).toHaveLength(1);
    expect(superseded[0].value).toBe('balanced');
    expect(superseded[0].supersededBy).toBe(confirmed[0].id);

    const revisions = await backend.listRevisions(userId);
    const revision = revisions.find((r) => r.dimension === 'work_life_balance');
    expect(revision?.previousValue).toBe('balanced');
    expect(revision?.newValue).toBe('life_focused');
    expect(revision?.confirmed).toBe(true);

    // Only the current value is surfaced; the superseded one is hidden.
    const insights = await backend.getModelInsights(userId);
    const wlb = insights.filter((i) => i.dimension === 'work_life_balance');
    expect(wlb).toHaveLength(1);
    expect(wlb[0].value).toBe('life_focused');
  });
});
