import { DevBackend } from '../devBackend';
import type { PreferencesInput, ProfileInput } from '../types';

const profileInput: ProfileInput = {
  displayName: 'Nadia',
  dateOfBirth: '1996-05-20',
  gender: 'woman',
  city: 'Munich',
  area: 'Lehel',
  approxLat: 48.139,
  approxLng: 11.591,
  occupation: 'Engineer',
  showOccupation: true,
  bio: 'Coffee, climbing, and long walks along the Isar.',
};

const preferencesInput: PreferencesInput = {
  preferredGenders: ['man'],
  minAge: 27,
  maxAge: 36,
  maxDistanceKm: 25,
  relationshipGoal: 'long_term',
  smokingDealbreaker: true,
  childrenIntent: 'open',
  childrenDealbreaker: false,
};

async function onboardNewUser(backend: DevBackend) {
  await backend.sendEmailOtp('nadia@kindred.app');
  const session = await backend.verifyEmailOtp('nadia@kindred.app', '000000');
  await backend.saveProfile(session.userId, profileInput);
  await backend.savePreferences(session.userId, preferencesInput);
  await backend.recordConsent(session.userId, 'partner_gender_matching', true);
  await backend.recordConsent(session.userId, 'ai_processing', true);
  await backend.saveOnboardingClaims(session.userId, {
    planning_style: 'planner',
    independence: 'independent',
  });
  await backend.completeOnboarding(session.userId);
  return session.userId;
}

describe('DevBackend onboarding flow', () => {
  it('persists a completed profile with stated, confirmed claims and consents', async () => {
    const backend = new DevBackend();
    const userId = await onboardNewUser(backend);

    const profile = await backend.getProfile(userId);
    expect(profile).not.toBeNull();
    expect(profile?.onboardingCompletedAt).not.toBeNull();
    // Email verification is granted on completion.
    expect(profile?.verificationStatus).toBe('email_verified');

    const insights = await backend.getModelInsights(userId);
    const planning = insights.find((i) => i.dimension === 'planning_style');
    expect(planning?.status).toBe('confirmed');
    // Onboarding answers are directly stated -> highest-confidence language.
    expect(planning?.confidenceText).toMatch(/told me/i);

    const consents = await backend.listConsents(userId);
    expect(consents.find((c) => c.consentType === 'partner_gender_matching')?.granted).toBe(true);
  });

  it('creates a new user on first OTP verification and reuses it afterwards', async () => {
    const backend = new DevBackend();
    const first = await backend.verifyEmailOtp('someone@kindred.app', '000000');
    const second = await backend.verifyEmailOtp('someone@kindred.app', '000000');
    expect(first.userId).toBe(second.userId);
  });

  it('does not surface a not-yet-onboarded user as a match candidate', async () => {
    const backend = new DevBackend();
    // Sign in a brand-new user who has not completed onboarding.
    const session = await backend.verifyEmailOtp('ghost@kindred.app', '000000');
    const intro = await backend.requestIntroduction(session.userId);
    // No profile/preferences yet => no matching profile => no introduction.
    expect(intro).toBeNull();
  });
});
