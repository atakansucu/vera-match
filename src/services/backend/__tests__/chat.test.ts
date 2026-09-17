import { DEMO_EMAIL } from '../seed';
import { DevBackend } from '../devBackend';

const SEEDED_CONVERSATION = 'conv-ava-david';

async function demo(backend: DevBackend): Promise<string> {
  const session = await backend.verifyEmailOtp(DEMO_EMAIL, '000000');
  return session.userId;
}

describe('chat (Phase 6 participant-only + block enforcement)', () => {
  it('lets a participant read and send messages', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    const before = await backend.listMessages(userId, SEEDED_CONVERSATION);
    expect(before.length).toBeGreaterThan(0);

    const sent = await backend.sendMessage(userId, SEEDED_CONVERSATION, 'Thursday works!');
    expect(sent.senderId).toBe(userId);

    const after = await backend.listMessages(userId, SEEDED_CONVERSATION);
    expect(after.length).toBe(before.length + 1);
  });

  it('refuses access to a non-participant', async () => {
    const backend = new DevBackend();
    await demo(backend);
    // 'liam' is not a participant of Ava<->David's conversation.
    await expect(backend.listMessages('liam', SEEDED_CONVERSATION)).rejects.toThrow();
    await expect(backend.sendMessage('liam', SEEDED_CONVERSATION, 'hi')).rejects.toThrow();
  });

  it('prevents messaging after a block', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    await backend.blockUser(userId, 'david');
    await expect(backend.sendMessage(userId, SEEDED_CONVERSATION, 'hello?')).rejects.toThrow();
  });

  it('marks incoming messages as read', async () => {
    const backend = new DevBackend();
    const userId = await demo(backend);

    await backend.markConversationRead(userId, SEEDED_CONVERSATION);
    const messages = await backend.listMessages(userId, SEEDED_CONVERSATION);
    const incoming = messages.filter((m) => m.senderId !== userId);
    expect(incoming.every((m) => m.readAt !== null)).toBe(true);
  });
});
