import { DEMO_EMAIL } from '../seed';
import { DevBackend } from '../devBackend';

async function demo(backend: DevBackend): Promise<string> {
  const session = await backend.verifyEmailOtp(DEMO_EMAIL, '000000');
  return session.userId;
}

describe('introduction decisions (Phase 5 double-blind mutual)', () => {
  it('opens a chat only when both independently choose interested', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    // Liam is a seeded, responsive counterpart who independently says yes.
    const result = await backend.submitDecision(userId, 'intro-ava-liam', 'interested');
    expect(result.mutual).toBe(true);
    expect(result.conversationId).not.toBeNull();

    const intro = await backend.getIntroduction(userId, 'intro-ava-liam');
    expect(intro?.mutual).toBe(true);
    expect(intro?.conversationId).toBe(result.conversationId);

    const conversations = await backend.listConversations(userId);
    expect(conversations.some((c) => c.id === result.conversationId)).toBe(true);
  });

  it('closes the introduction on rejection without revealing anything to the other side', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    const fresh = await backend.requestIntroduction(userId);
    expect(fresh).not.toBeNull();
    const result = await backend.submitDecision(userId, fresh!.id, 'not_for_me');
    expect(result.mutual).toBe(false);
    expect(result.conversationId).toBeNull();

    // A rejected introduction disappears from the user's active list.
    const list = await backend.listIntroductions(userId);
    expect(list.some((i) => i.id === fresh!.id)).toBe(false);
  });

  it('is idempotent — repeating interested does not create duplicate matches', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    const before = (await backend.listConversations(userId)).length;
    await backend.submitDecision(userId, 'intro-ava-liam', 'interested');
    await backend.submitDecision(userId, 'intro-ava-liam', 'interested');
    const after = await backend.listConversations(userId);
    // Exactly one new conversation despite two interested actions.
    expect(after.length).toBe(before + 1);
  });
});
