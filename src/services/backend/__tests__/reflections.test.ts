import { confirmedDimensions } from '@/features/claims/matching';

import { DEMO_EMAIL } from '../seed';
import { DevBackend } from '../devBackend';

async function demo(backend: DevBackend): Promise<string> {
  const session = await backend.verifyEmailOtp(DEMO_EMAIL, '000000');
  return session.userId;
}

describe('post-date reflection (Phase 7 outcome learning)', () => {
  it('stores the reflection first and proposes a confirmable revision', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    const { reflection, proposals } = await backend.submitReflection(
      userId,
      'intro-ava-ben',
      'Conversation was easy but I felt like we had completely different attitudes toward planning.',
    );

    expect(reflection.rawText).toMatch(/planning/);
    expect(reflection.aiProcessed).toBe(true);
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals[0].dimension).toBe('planning_style');
    expect(proposals[0].question.length).toBeGreaterThan(0);
  });

  it('only confirmed revisions influence future matching; rejected ones do not', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    const { reflection, proposals } = await backend.submitReflection(
      userId,
      'intro-ava-ben',
      'Their texting rhythm felt off — I am still learning how much contact I actually want.',
    );
    const proposal = proposals.find((p) => p.dimension === 'texting_frequency');
    expect(proposal).toBeDefined();

    // Unconfirmed hypotheses never enter matching.
    const before = confirmedDimensions(await backend.listClaims(userId));
    expect(before.texting_frequency).toBeUndefined();

    await backend.confirmRevision(userId, reflection.id, proposal!);

    const after = confirmedDimensions(await backend.listClaims(userId));
    expect(after.texting_frequency?.value).toBe('sometimes');

    const insights = await backend.getModelInsights(userId);
    const texting = insights.find(
      (i) => i.dimension === 'texting_frequency' && i.status === 'confirmed',
    );
    expect(texting).toBeDefined();
  });

  it('never loses the reflection when AI extraction fails', async () => {
    const failing = {
      name: 'failing',
      extractClaims: async () => {
        throw new Error('timeout');
      },
      reconcileReflection: async () => {
        throw new Error('timeout');
      },
      generateIntroductionExplanation: async () => {
        throw new Error('timeout');
      },
      proposeMicroQuestion: async () => {
        throw new Error('timeout');
      },
      summarizeRelationshipModel: async () => {
        throw new Error('timeout');
      },
    };
    const backend = new DevBackend(failing);
    const userId = await demo(backend);

    const { reflection, proposals } = await backend.submitReflection(
      userId,
      'intro-ava-ben',
      'It felt off, but I cannot put it into words yet.',
    );

    expect(reflection.rawText).toContain('felt off');
    expect(reflection.aiProcessed).toBe(false);
    expect(proposals).toEqual([]);
  });

  it('records a private date outcome without exposing the other user’s intent', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    await backend.submitDateOutcome(userId, 'intro-ava-ben', 'met', 'want_again');
    const exported = await backend.exportData(userId);
    expect(exported.reflections).toBeDefined();
    // The view never carries the counterpart's second-date intent.
    const intro = await backend.getIntroduction(userId, 'intro-ava-ben');
    expect(intro).not.toHaveProperty('otherSecondDateIntent');
  });
});
