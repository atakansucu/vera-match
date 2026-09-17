import type { Claim, ConfidenceTier } from '@/types/domain';

/**
 * Confidence is derived deterministically from claim status + source. The LLM is
 * never allowed to invent a confidence value (e.g. "0.87"). Rules:
 *  - rejected / superseded            -> unknown (excluded from matching)
 *  - unconfirmed                      -> weak_low
 *  - confirmed & directly stated      -> explicit_high
 *  - confirmed inference              -> confirmed_medium_high
 */
export function deriveConfidence(
  claim: Pick<Claim, 'status' | 'claimType' | 'sourceType'>,
): ConfidenceTier {
  if (claim.status === 'rejected' || claim.status === 'superseded') return 'unknown';
  if (claim.status === 'unconfirmed') return 'weak_low';

  const directSources = new Set(['onboarding_answer', 'micro_question_answer', 'direct_edit']);
  if (claim.claimType === 'stated' || directSources.has(claim.sourceType)) {
    return 'explicit_high';
  }
  return 'confirmed_medium_high';
}

/** Language used in the UI to communicate uncertainty (never a percentage). */
export const CONFIDENCE_LANGUAGE: Record<ConfidenceTier, string> = {
  explicit_high: "You've told me this directly.",
  confirmed_medium_high: "I'm fairly confident about this.",
  weak_low: "I'm still learning this.",
  unknown: "I'm not sure yet.",
};

export function confidenceLanguage(tier: ConfidenceTier): string {
  return CONFIDENCE_LANGUAGE[tier];
}

export function sourceLanguage(claim: Pick<Claim, 'sourceType' | 'status'>): string {
  switch (claim.sourceType) {
    case 'onboarding_answer':
      return 'You told me during setup.';
    case 'micro_question_answer':
      return 'You answered a quick question.';
    case 'direct_edit':
      return 'You edited this yourself.';
    case 'reflection':
      return claim.status === 'confirmed'
        ? 'Learned from your reflections and confirmed by you.'
        : 'A hypothesis from your reflection, awaiting your confirmation.';
    case 'decision_behavior':
      return 'Noticed from your choices.';
    case 'profile_text':
      return 'From your profile.';
    default:
      return '';
  }
}
