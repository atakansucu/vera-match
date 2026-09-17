import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { RevisionProposal } from '@/services/ai/schemas';
import { claimKeys } from '@/features/claims/hooks';
import { useBackend, useUserId } from '@/hooks/app';
import type { DateOutcomeValue, SecondDateIntent } from '@/types/domain';

export function useSubmitReflection() {
  const backend = useBackend();
  const userId = useUserId();
  return useMutation({
    mutationFn: (input: { introductionId: string; text: string }) =>
      backend.submitReflection(userId, input.introductionId, input.text),
  });
}

export function useConfirmRevision() {
  const backend = useBackend();
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reflectionId: string; proposal: RevisionProposal }) =>
      backend.confirmRevision(userId, input.reflectionId, input.proposal),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claimKeys(userId).insights });
      void queryClient.invalidateQueries({ queryKey: claimKeys(userId).revisions });
      void queryClient.invalidateQueries({ queryKey: ['introductions', userId] });
    },
  });
}

export function useRejectRevision() {
  const backend = useBackend();
  const userId = useUserId();
  return useMutation({
    mutationFn: (input: { reflectionId: string; proposal: RevisionProposal }) =>
      backend.rejectRevision(userId, input.reflectionId, input.proposal),
  });
}

export function useSubmitDateOutcome() {
  const backend = useBackend();
  const userId = useUserId();
  return useMutation({
    mutationFn: (input: {
      introductionId: string;
      outcome: DateOutcomeValue;
      secondDate: SecondDateIntent;
    }) => backend.submitDateOutcome(userId, input.introductionId, input.outcome, input.secondDate),
  });
}
