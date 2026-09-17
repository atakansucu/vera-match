import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useBackend, useUserId } from '@/hooks/app';
import type { Decision } from '@/types/domain';

export function introductionKeys(userId: string) {
  return {
    list: ['introductions', userId] as const,
    detail: (id: string) => ['introduction', userId, id] as const,
  };
}

export function useIntroductions() {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: introductionKeys(userId).list,
    queryFn: () => backend.listIntroductions(userId),
  });
}

export function useIntroduction(introductionId: string) {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: introductionKeys(userId).detail(introductionId),
    queryFn: () => backend.getIntroduction(userId, introductionId),
  });
}

export function useRequestIntroduction() {
  const backend = useBackend();
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => backend.requestIntroduction(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: introductionKeys(userId).list }),
  });
}

export function useSubmitDecision(introductionId: string) {
  const backend = useBackend();
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (decision: Decision) => backend.submitDecision(userId, introductionId, decision),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: introductionKeys(userId).list });
      void queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    },
  });
}
