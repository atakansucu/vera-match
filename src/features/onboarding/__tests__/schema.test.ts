import {
  ONBOARDING_DEFAULTS,
  toPreferencesInput,
  toProfileInput,
  validateDob,
  validateStep,
  type OnboardingForm,
} from '../schema';

function form(overrides: Partial<OnboardingForm> = {}): OnboardingForm {
  return { ...ONBOARDING_DEFAULTS, ...overrides };
}

function yearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

describe('validateDob (age gate)', () => {
  it('accepts an adult', () => {
    expect(validateDob('1990-01-01').ok).toBe(true);
  });

  it('rejects someone under 18', () => {
    const result = validateDob(yearsAgo(15));
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/18 or older/i);
  });

  it('rejects a badly formatted date', () => {
    expect(validateDob('01/01/1990').ok).toBe(false);
  });

  it('rejects an impossible date', () => {
    expect(validateDob('1990-13-40').ok).toBe(false);
  });
});

describe('validateStep', () => {
  it('requires a first name and area in basics', () => {
    expect(validateStep('basics', form({ displayName: 'A', area: 'Schwabing' })).ok).toBe(false);
    expect(validateStep('basics', form({ displayName: 'Ava', area: '' })).ok).toBe(false);
    expect(validateStep('basics', form({ displayName: 'Ava', area: 'Schwabing' })).ok).toBe(true);
  });

  it('requires partner selection and explicit consent in preferences', () => {
    const base = form({ preferredGenders: [], partnerGenderConsent: false });
    expect(validateStep('preferences', base).ok).toBe(false);

    const noConsent = form({ preferredGenders: ['man'], partnerGenderConsent: false });
    expect(validateStep('preferences', noConsent).ok).toBe(false);
    expect(validateStep('preferences', noConsent).message).toMatch(/consent/i);

    const ok = form({ preferredGenders: ['man'], partnerGenderConsent: true });
    expect(validateStep('preferences', ok).ok).toBe(true);
  });

  it('rejects an inverted age range', () => {
    const inverted = form({
      preferredGenders: ['man'],
      partnerGenderConsent: true,
      minAge: 35,
      maxAge: 30,
    });
    expect(validateStep('preferences', inverted).ok).toBe(false);
  });

  it('treats optional steps as always valid', () => {
    expect(validateStep('dealbreakers', form()).ok).toBe(true);
    expect(validateStep('style', form()).ok).toBe(true);
    expect(validateStep('photos', form()).ok).toBe(true);
    expect(validateStep('consent', form()).ok).toBe(true);
  });
});

describe('form -> backend input mapping', () => {
  it('maps profile fields and resolves coarse area coordinates', () => {
    const input = toProfileInput(
      form({ displayName: '  Ava  ', area: 'Maxvorstadt', occupation: '', dob: '1999-04-12' }),
    );
    expect(input.displayName).toBe('Ava');
    expect(input.city).toBe('Munich');
    expect(input.occupation).toBeNull();
    expect(input.approxLat).toBeCloseTo(48.147, 3);
    expect(input.approxLng).toBeCloseTo(11.567, 3);
  });

  it('maps preferences including dealbreakers', () => {
    const input = toPreferencesInput(
      form({
        preferredGenders: ['man'],
        minAge: 25,
        maxAge: 33,
        maxDistanceKm: 25,
        smokingDealbreaker: true,
      }),
    );
    expect(input.preferredGenders).toEqual(['man']);
    expect(input.minAge).toBe(25);
    expect(input.smokingDealbreaker).toBe(true);
  });
});
