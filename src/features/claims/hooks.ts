import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useBackend, useUserId } from '@/hooks/app';
import type { Dimension } from '@/types/domain';

export function claimKeys(userId: string) {
  return {
    insights: ['insights', userId] as const,
    microQuestion: ['micro-question', userId] as const,
    revisions: ['revisions', userId] as const,
  };
}

export function useModelInsights() {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: claimKeys(userId).insights,
    queryFn: () => backend.getModelInsights(userId),
  });
}

export function useMicroQuestion() {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: claimKeys(userId).microQuestion,
    queryFn: () => backend.getPendingMicroQuestion(userId),
  });
}

export function useRevisions() {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: claimKeys(userId).revisions,
    queryFn: () => backend.listRevisions(userId),
  });
}

function useInvalidateModel() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: claimKeys(userId).insights });
    void queryClient.invalidateQueries({ queryKey: claimKeys(userId).revisions });
    void queryClient.invalidateQueries({ queryKey: ['introductions', userId] });
  };
}

export function useConfirmClaim() {
  const backend = useBackend();
  const userId = useUserId();
  const invalidate = useInvalidateModel();
  return useMutation({
    mutationFn: (claimId: string) => backend.confirmClaim(userId, claimId),
    onSuccess: invalidate,
  });
}

export function useRejectClaim() {
  const backend = useBackend();
  const userId = useUserId();
  const invalidate = useInvalidateModel();
  return useMutation({
    mutationFn: (claimId: string) => backend.rejectClaim(userId, claimId),
    onSuccess: invalidate,
  });
}

export function useEditClaim() {
  const backend = useBackend();
  const userId = useUserId();
  const invalidate = useInvalidateModel();
  return useMutation({
    mutationFn: (input: { claimId: string; value: string; importance: number }) =>
      backend.editClaim(userId, input.claimId, input.value, input.importance),
    onSuccess: invalidate,
  });
}

export function useForgetClaim() {
  const backend = useBackend();
  const userId = useUserId();
  const invalidate = useInvalidateModel();
  return useMutation({
    mutationFn: (claimId: string) => backend.forgetClaim(userId, claimId),
    onSuccess: invalidate,
  });
}

export function useShareThought() {
  const backend = useBackend();
  const userId = useUserId();
  const invalidate = useInvalidateModel();
  return useMutation({
    mutationFn: (text: string) => backend.shareThought(userId, text),
    onSuccess: invalidate,
  });
}

export function useAnswerMicroQuestion() {
  const backend = useBackend();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateModel();
  return useMutation({
    mutationFn: (input: { dimension: Dimension; value: string }) =>
      backend.answerMicroQuestion(userId, input.dimension, input.value),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: claimKeys(userId).microQuestion });
    },
  });
}
