import { classifyError, ERROR_COPY, messageFor } from '../errors';
import { NOTIFICATION_COPY, notificationBody } from '../notifications';

describe('error copy', () => {
  it('covers the specified failure modes without leaking internals', () => {
    expect(messageFor('offline')).toMatch(/offline/i);
    expect(messageFor('llmTimeout')).toMatch(/saved/i);
    expect(messageFor('uploadFailed')).toMatch(/photo/i);
    expect(Object.values(ERROR_COPY).join(' ')).not.toMatch(/stack|exception|SQL/i);
  });

  it('maps known failures onto copy without leaking internals', () => {
    expect(classifyError(new Error('Failed to fetch'))).toBe('offline');
    expect(classifyError(new Error('Network request failed'))).toBe('offline');
    expect(classifyError(new Error('jwt expired from supabase'))).toBe('supabaseUnavailable');
    expect(classifyError(new Error('timeout'))).toBe('llmTimeout');
    expect(classifyError(new Error('unrecognized_keys in schema'))).toBe('llmMalformed');
    expect(classifyError(new Error('photo upload failed'))).toBe('uploadFailed');
    expect(classifyError(new Error('signed url expired'))).toBe('expiredPhotoUrl');
    expect(classifyError(new Error('duplicate key 23505'))).toBe('duplicateAction');
    expect(classifyError(new Error('You are not a participant in this conversation.'))).toBe(
      'staleChat',
    );
    expect(classifyError(new Error('SQLSTATE 42P01 relation does not exist'))).toBe('generic');
    expect(messageFor(classifyError(new Error('SQLSTATE 42P01')))).not.toMatch(/SQLSTATE/i);
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
