import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useBackend, useUserId } from '@/hooks/app';

import { claimKeys } from '../claims/hooks';
import { introductionKeys } from '../introductions/hooks';

export function matchmakerKeys(userId: string) {
  return {
    notebook: ['notebook', userId] as const,
    revisionCard: ['revision-card', userId] as const,
    scenario: ['micro-scenario', userId] as const,
    prediction: ['prediction-game', userId] as const,
    recap: ['weekly-recap', userId] as const,
    homeState: ['home-state', userId] as const,
    conversationStarter: (convId: string) => ['conversation-starter', userId, convId] as const,
  };
}

export function useNotebook() {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: matchmakerKeys(userId).notebook,
    queryFn: () => backend.getNotebook(userId),
  });
}

export function useRevisionCard() {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: matchmakerKeys(userId).revisionCard,
    queryFn: () => backend.getLatestRevisionCard(userId),
  });
}

export function useMicroScenario() {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: matchmakerKeys(userId).scenario,
    queryFn: () => backend.getMicroScenario(userId),
  });
}

export function useAnswerMicroScenario() {
  const backend = useBackend();
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { scenarioId: string; value: string }) =>
      backend.answerMicroScenario(userId, input.scenarioId, input.value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchmakerKeys(userId).scenario });
      void queryClient.invalidateQueries({ queryKey: claimKeys(userId).insights });
    },
  });
}

export function usePredictionGame() {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: matchmakerKeys(userId).prediction,
    queryFn: () => backend.getPredictionGame(userId),
  });
}

export function useSubmitPrediction() {
  const backend = useBackend();
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { predictionId: string; choice: 'a' | 'b'; reason?: string }) =>
      backend.submitPrediction(userId, input.predictionId, input.choice, input.reason ?? null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchmakerKeys(userId).prediction });
    },
  });
}

export function useWeeklyRecap() {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: matchmakerKeys(userId).recap,
    queryFn: () => backend.getWeeklyRecap(userId),
  });
}

export function useHomeState() {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: matchmakerKeys(userId).homeState,
    queryFn: () => backend.getHomeState(userId),
  });
}

export function useConversationStarter(conversationId: string) {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: matchmakerKeys(userId).conversationStarter(conversationId),
    queryFn: () => backend.getConversationStarter(userId, conversationId),
    enabled: !!conversationId,
  });
}

export function useAcknowledgeRevisionCard() {
  const backend = useBackend();
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { revisionId: string; response: 'exactly' | 'sort_of' | 'not_really' }) =>
      backend.acknowledgeRevisionCard(userId, input.revisionId, input.response),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchmakerKeys(userId).revisionCard });
      void queryClient.invalidateQueries({ queryKey: claimKeys(userId).insights });
      void queryClient.invalidateQueries({ queryKey: matchmakerKeys(userId).notebook });
      void queryClient.invalidateQueries({ queryKey: introductionKeys(userId).list });
    },
  });
}
