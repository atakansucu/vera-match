import { useQueryClient } from '@tanstack/react-query';

import { getBackend } from '@/services/backend';
import { useSessionStore } from '@/state/session';

import { toPreferencesInput, toProfileInput, type OnboardingForm } from './schema';

/** Persists a completed onboarding form through the backend in a single flow. */
export function useSubmitOnboarding() {
  const backend = getBackend();
  const session = useSessionStore((s) => s.session);
  const queryClient = useQueryClient();

  return async function submit(form: OnboardingForm): Promise<void> {
    if (!session) throw new Error('Not signed in.');
    const userId = session.userId;

    await backend.saveProfile(userId, toProfileInput(form));
    await backend.savePreferences(userId, toPreferencesInput(form));
    await backend.recordConsent(userId, 'partner_gender_matching', form.partnerGenderConsent);
    await backend.recordConsent(userId, 'ai_processing', form.aiConsent);
    await backend.recordConsent(userId, 'photo_processing', form.photos.length > 0);
    for (const uri of form.photos) {
      await backend.addPhoto(userId, uri);
    }
    await backend.saveOnboardingClaims(userId, form.styleAnswers);
    await backend.completeOnboarding(userId);
    await queryClient.invalidateQueries();
  };
}
