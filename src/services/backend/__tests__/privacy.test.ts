import { DEMO_EMAIL } from '../seed';
import { DevBackend } from '../devBackend';

async function demo(backend: DevBackend): Promise<string> {
  const session = await backend.verifyEmailOtp(DEMO_EMAIL, '000000');
  return session.userId;
}

describe('privacy (Phase 8 export / delete / isolation)', () => {
  it('exports the user’s own data, including private reflections', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);
    const data = await backend.exportData(userId);

    expect(data.exportedAt).toBeTruthy();
    expect((data.profile as { id: string }).id).toBe(userId);
    expect(Array.isArray(data.claims)).toBe(true);
    expect(Array.isArray(data.reflections)).toBe(true);
    // Reflections stay in the export (they are the user’s own data).
    const reflections = data.reflections as { userId: string; rawText: string }[];
    expect(reflections.every((r) => r.userId === userId)).toBe(true);
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

    // Seeded private reflection about planning with Ben must not leak into Liam's intro.
    expect(texts.join(' ')).not.toMatch(/cheated|affair|last relationship/);
    expect(texts.join(' ')).not.toMatch(/ben/);
  });

  it('deletes the profile, claims, photos, reflections and session', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    await backend.deleteAccount(userId);

    expect(await backend.getProfile(userId)).toBeNull();
    expect(await backend.listClaims(userId)).toEqual([]);
    expect(await backend.listPhotos(userId)).toEqual([]);
    expect(await backend.getSession()).toBeNull();

    const exportAfter = await backend.exportData(userId);
    expect(exportAfter.profile).toBeNull();
    expect(exportAfter.claims as unknown[]).toEqual([]);
    expect(exportAfter.reflections as unknown[]).toEqual([]);
  });

  it('does not leak reporter identity to the reported user', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);
    await backend.reportUser(userId, {
      reportedUserId: 'david',
      category: 'harassment',
      contextType: 'message',
      contextId: 'conv-ava-david',
      note: 'test',
    });
    // There is no API for the reported user to list reports against them.
    const davidView = await backend.listConversations('david');
    expect(JSON.stringify(davidView)).not.toMatch(/harassment/);
    expect(JSON.stringify(davidView)).not.toMatch(/reporter/);
  });
});
