import { emailSchema, isEmailDomainAllowed, otpSchema } from '../validation';

describe('email + otp validation', () => {
  it('accepts valid emails and rejects invalid ones', () => {
    expect(emailSchema.safeParse('ava@tum.de').success).toBe(true);
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('requires a 6-digit OTP', () => {
    expect(otpSchema.safeParse('000000').success).toBe(true);
    expect(otpSchema.safeParse('123').success).toBe(false);
    expect(otpSchema.safeParse('abcdef').success).toBe(false);
  });
});

describe('isEmailDomainAllowed (beta gate)', () => {
  it('allows any email when the allow-list is empty', () => {
    expect(isEmailDomainAllowed('anyone@example.com', [])).toBe(true);
  });

  it('restricts to allowed community domains', () => {
    const allowed = ['tum.de', 'lmu.de'];
    expect(isEmailDomainAllowed('student@tum.de', allowed)).toBe(true);
    expect(isEmailDomainAllowed('student@TUM.de', allowed)).toBe(true);
    expect(isEmailDomainAllowed('someone@gmail.com', allowed)).toBe(false);
  });
});
