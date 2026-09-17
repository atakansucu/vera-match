import { DEFAULT_MATCHING_CONFIG, meetsVerification } from '../config';

describe('meetsVerification', () => {
  it('selfie_verified meets any minimum', () => {
    expect(meetsVerification('selfie_verified', 'unverified')).toBe(true);
    expect(meetsVerification('selfie_verified', 'email_verified')).toBe(true);
    expect(meetsVerification('selfie_verified', 'selfie_verified')).toBe(true);
  });

  it('email_verified meets email_verified and unverified', () => {
    expect(meetsVerification('email_verified', 'unverified')).toBe(true);
    expect(meetsVerification('email_verified', 'email_verified')).toBe(true);
  });

  it('email_verified does NOT meet selfie_verified', () => {
    expect(meetsVerification('email_verified', 'selfie_verified')).toBe(false);
  });

  it('selfie_pending has same rank as email_verified', () => {
    expect(meetsVerification('selfie_pending', 'email_verified')).toBe(true);
    expect(meetsVerification('selfie_pending', 'selfie_verified')).toBe(false);
  });

  it('unverified only meets unverified', () => {
    expect(meetsVerification('unverified', 'unverified')).toBe(true);
    expect(meetsVerification('unverified', 'email_verified')).toBe(false);
  });

  it('rejected never meets any minimum', () => {
    expect(meetsVerification('rejected', 'unverified')).toBe(false);
    expect(meetsVerification('rejected', 'email_verified')).toBe(false);
    expect(meetsVerification('rejected', 'selfie_verified')).toBe(false);
  });
});

describe('DEFAULT_MATCHING_CONFIG', () => {
  it('has expected default values', () => {
    expect(DEFAULT_MATCHING_CONFIG.algoVersion).toBe('heuristic-v1');
    expect(DEFAULT_MATCHING_CONFIG.alignmentWeight).toBe(1);
    expect(DEFAULT_MATCHING_CONFIG.frictionWeight).toBe(0.6);
    expect(DEFAULT_MATCHING_CONFIG.explorationBonusMax).toBe(0.15);
    expect(DEFAULT_MATCHING_CONFIG.frictionDistance).toBe(2);
    expect(DEFAULT_MATCHING_CONFIG.minVerificationForMatch).toBe('email_verified');
  });
});
