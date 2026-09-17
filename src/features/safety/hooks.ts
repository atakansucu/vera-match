import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useBackend, useUserId } from '@/hooks/app';
import type { ReportInput } from '@/types/views';

export function useBlockUser() {
  const backend = useBackend();
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => backend.blockUser(userId, targetUserId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
      void queryClient.invalidateQueries({ queryKey: ['introductions', userId] });
    },
  });
}

export function useReportUser() {
  const backend = useBackend();
  const userId = useUserId();
  return useMutation({
    mutationFn: (input: ReportInput) => backend.reportUser(userId, input),
  });
}
