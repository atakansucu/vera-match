import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useBackend, useUserId } from '@/hooks/app';
import type { Message } from '@/types/domain';

export function conversationKeys(userId: string) {
  return {
    list: ['conversations', userId] as const,
    messages: (conversationId: string) => ['messages', userId, conversationId] as const,
  };
}

export function useConversations() {
  const backend = useBackend();
  const userId = useUserId();
  return useQuery({
    queryKey: conversationKeys(userId).list,
    queryFn: () => backend.listConversations(userId),
  });
}

export function useMessages(conversationId: string) {
  const backend = useBackend();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const key = conversationKeys(userId).messages(conversationId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => backend.listMessages(userId, conversationId),
  });

  useEffect(() => {
    void backend.markConversationRead(userId, conversationId);
    const unsubscribe = backend.subscribeMessages(conversationId, (message: Message) => {
      queryClient.setQueryData<Message[]>(key, (old) => {
        if (!old) return [message];
        if (old.some((m) => m.id === message.id)) return old;
        return [...old, message];
      });
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return query;
}

export function useSendMessage(conversationId: string) {
  const backend = useBackend();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const key = conversationKeys(userId).messages(conversationId);

  return useMutation({
    mutationFn: (body: string) => backend.sendMessage(userId, conversationId, body),
    onSuccess: (message) => {
      queryClient.setQueryData<Message[]>(key, (old) => {
        if (!old) return [message];
        if (old.some((m) => m.id === message.id)) return old;
        return [...old, message];
      });
      void queryClient.invalidateQueries({ queryKey: conversationKeys(userId).list });
    },
  });
}
