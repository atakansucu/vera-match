import { isAtLeastAge } from '@/lib/date';
import type { PreferencesInput, ProfileInput } from '@/services/backend';
import type { ChildrenIntent, Dimension, Gender, RelationshipGoal } from '@/types/domain';

import { AREA_COORDINATES } from './options';

export const MIN_AGE = 18;

export interface OnboardingForm {
  displayName: string;
  dob: string; // yyyy-mm-dd
  gender: Gender;
  area: string;
  occupation: string;
  showOccupation: boolean;
  bio: string;
  preferredGenders: Gender[];
  partnerGenderConsent: boolean;
  relationshipGoal: RelationshipGoal;
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  smokingDealbreaker: boolean;
  childrenIntent: ChildrenIntent;
  childrenDealbreaker: boolean;
  styleAnswers: Partial<Record<Dimension, string>>;
  aiConsent: boolean;
  photos: string[];
}

export const ONBOARDING_DEFAULTS: OnboardingForm = {
  displayName: '',
  dob: '',
  gender: 'woman',
  area: '',
  occupation: '',
  showOccupation: true,
  bio: '',
  preferredGenders: [],
  partnerGenderConsent: false,
  relationshipGoal: 'long_term',
  minAge: 24,
  maxAge: 34,
  maxDistanceKm: 25,
  smokingDealbreaker: false,
  childrenIntent: 'open',
  childrenDealbreaker: false,
  styleAnswers: {},
  aiConsent: false,
  photos: [],
};

export interface StepValidation {
  ok: boolean;
  message?: string;
}

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateDob(dob: string): StepValidation {
  if (!DOB_PATTERN.test(dob))
    return { ok: false, message: 'Enter your date of birth as YYYY-MM-DD.' };
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return { ok: false, message: 'That date is not valid.' };
  if (!isAtLeastAge(dob, MIN_AGE)) {
    return { ok: false, message: 'You must be 18 or older to use Kindred.' };
  }
  return { ok: true };
}

export function validateStep(step: OnboardingStep, form: OnboardingForm): StepValidation {
  switch (step) {
    case 'age':
      return validateDob(form.dob);
    case 'basics':
      if (form.displayName.trim().length < 2)
        return { ok: false, message: 'Please enter your first name.' };
      if (!form.area) return { ok: false, message: 'Choose your area.' };
      return { ok: true };
    case 'preferences':
      if (form.preferredGenders.length === 0)
        return { ok: false, message: 'Choose who you would like to meet.' };
      if (!form.partnerGenderConsent)
        return { ok: false, message: 'We need your consent to use this preference for matching.' };
      if (form.maxAge < form.minAge)
        return { ok: false, message: 'Your maximum age should be at least your minimum age.' };
      return { ok: true };
    case 'dealbreakers':
      return { ok: true };
    case 'style':
      return { ok: true };
    case 'photos':
      return { ok: true };
    case 'consent':
      return { ok: true };
  }
}

export const ONBOARDING_STEPS = [
  'age',
  'basics',
  'preferences',
  'dealbreakers',
  'style',
  'photos',
  'consent',
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function toProfileInput(form: OnboardingForm): ProfileInput {
  const coords = AREA_COORDINATES[form.area] ?? { lat: 48.137, lng: 11.575 };
  return {
    displayName: form.displayName.trim(),
    dateOfBirth: form.dob,
    gender: form.gender,
    city: 'Munich',
    area: form.area,
    approxLat: coords.lat,
    approxLng: coords.lng,
    occupation: form.occupation.trim() ? form.occupation.trim() : null,
    showOccupation: form.showOccupation,
    bio: form.bio.trim(),
  };
}

export function toPreferencesInput(form: OnboardingForm): PreferencesInput {
  return {
    preferredGenders: form.preferredGenders,
    minAge: form.minAge,
    maxAge: form.maxAge,
    maxDistanceKm: form.maxDistanceKm,
    relationshipGoal: form.relationshipGoal,
    smokingDealbreaker: form.smokingDealbreaker,
    childrenIntent: form.childrenIntent,
    childrenDealbreaker: form.childrenDealbreaker,
  };
}
