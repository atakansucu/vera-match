import { ERROR_COPY, messageFor } from '../errors';
import { NOTIFICATION_COPY, notificationBody } from '../notifications';

describe('error copy', () => {
  it('covers the specified failure modes without leaking internals', () => {
    expect(messageFor('offline')).toMatch(/offline/i);
    expect(messageFor('llmTimeout')).toMatch(/saved/i);
    expect(messageFor('uploadFailed')).toMatch(/photo/i);
    expect(Object.values(ERROR_COPY).join(' ')).not.toMatch(/stack|exception|SQL/i);
  });
});

describe('notification copy (never sensitive)', () => {
  it('uses generic lock-screen text', () => {
    expect(notificationBody('newIntroduction')).toBe('You have a new introduction.');
    expect(notificationBody('mutualInterest')).toMatch(/mutual/i);
    expect(notificationBody('newMessage')).toMatch(/message/i);
    const all = Object.values(NOTIFICATION_COPY).join(' ');
    expect(all).not.toMatch(/marriage|children|compatible|soulmate|percent/i);
  });
});
