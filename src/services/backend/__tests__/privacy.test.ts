import { DEMO_EMAIL } from '../seed';
import { DevBackend } from '../devBackend';

async function demo(backend: DevBackend): Promise<string> {
  const session = await backend.verifyEmailOtp(DEMO_EMAIL, '000000');
  return session.userId;
}

describe('privacy (Phase 8 export / delete / isolation)', () => {
  it('exports the user’s own data, including private reflections and outcomes', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);
    await backend.submitDateOutcome(userId, 'intro-ava-ben', 'met', 'want_again');
    const data = await backend.exportData(userId);

    expect(data.exportedAt).toBeTruthy();
    expect((data.profile as { id: string }).id).toBe(userId);
    expect(Array.isArray(data.claims)).toBe(true);
    expect(Array.isArray(data.reflections)).toBe(true);
    expect(Array.isArray(data.photos)).toBe(true);
    expect(Array.isArray(data.dateOutcomes)).toBe(true);

    const reflections = data.reflections as { userId: string; rawText: string }[];
    expect(reflections.every((r) => r.userId === userId)).toBe(true);
    expect(reflections.some((r) => /cheated on in my last relationship/.test(r.rawText))).toBe(
      true,
    );

    const intros = data.introductions as Record<string, unknown>[];
    expect(intros.length).toBeGreaterThan(0);
    expect(intros.every((row) => !('rankScore' in row))).toBe(true);
  });

  it('never puts another user’s private reflection into an introduction explanation', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    const intro = await backend.getIntroduction(userId, 'intro-ava-liam');
    expect(intro).not.toBeNull();
    const texts = [
      ...intro!.explanation.alignment,
      ...intro!.explanation.friction,
      ...intro!.explanation.unknowns,
    ].map((p) => p.text.toLowerCase());

    // Seeded private reflection about Ben must not leak into Liam's intro.
    expect(texts.join(' ')).not.toMatch(/cheated|affair|last relationship/);
    expect(texts.join(' ')).not.toMatch(/ben/);
  });

  it('deletes the profile, claims, photos, reflections and session', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    await backend.reportUser(userId, {
      reportedUserId: 'david',
      category: 'harassment',
      contextType: 'message',
      contextId: 'conv-ava-david',
      note: 'private reporter note',
    });

    await backend.deleteAccount(userId);

    expect(await backend.getProfile(userId)).toBeNull();
    expect(await backend.listClaims(userId)).toEqual([]);
    expect(await backend.listPhotos(userId)).toEqual([]);
    expect(await backend.getSession()).toBeNull();

    const exportAfter = await backend.exportData(userId);
    expect(exportAfter.profile).toBeNull();
    expect(exportAfter.claims as unknown[]).toEqual([]);
    expect(exportAfter.reflections as unknown[]).toEqual([]);
    expect(exportAfter.dateOutcomes as unknown[]).toEqual([]);
    expect(exportAfter.photos as unknown[]).toEqual([]);

    // Anonymized safety records must not keep the reporter's note or identity.
    const davidView = await backend.listConversations('david');
    expect(JSON.stringify(davidView)).not.toMatch(/private reporter note/);
    expect(JSON.stringify(davidView)).not.toMatch(userId);
  });

  it('does not leak reporter identity to the reported user', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);
    await backend.reportUser(userId, {
      reportedUserId: 'david',
      category: 'harassment',
      contextType: 'message',
      contextId: 'conv-ava-david',
      note: 'confidential reporter note',
    });
    // There is no API for the reported user to list reports against them.
    const davidView = await backend.listConversations('david');
    expect(JSON.stringify(davidView)).not.toMatch(/harassment/);
    expect(JSON.stringify(davidView)).not.toMatch(/confidential reporter note/);
    expect(JSON.stringify(davidView)).not.toMatch(/reporter/);
  });

  it('records AI usage metadata without storing prompts or reflection text', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);
    const unique = 'UNIQUE_REFLECTION_PHRASE_PLANNING_xyzzy';

    await backend.submitReflection(userId, 'intro-ava-ben', unique);

    const usage = backend.aiUsageMetadata();
    expect(usage.some((row) => row.taskType === 'reconcile_reflection' && row.success)).toBe(true);
    expect(JSON.stringify(usage)).not.toMatch(/UNIQUE_REFLECTION_PHRASE/);
    expect(JSON.stringify(usage)).not.toMatch(/xyzzy/);
  });
});
