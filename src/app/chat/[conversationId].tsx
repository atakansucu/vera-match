import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components';
import { HStack, Icon, Text, useTheme, VStack } from '@/design';
import { useConversations, useMessages, useSendMessage } from '@/features/chat/hooks';
import { useUserId } from '@/hooks/app';

export default function ConversationScreen() {
  const theme = useTheme();
  const userId = useUserId();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const listRef = useRef<FlatList>(null);
  const [draft, setDraft] = useState('');

  const conversations = useConversations();
  const messagesQuery = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);

  const other = conversations.data?.find((c) => c.id === conversationId)?.other;
  const messages = messagesQuery.data ?? [];

  const onSend = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    sendMessage.mutate(body);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={['top', 'bottom']}
    >
      <View style={{ paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md }}>
        <ScreenHeader title={other?.firstName ?? 'Chat'} showBack />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.sm }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <VStack gap="sm" align="center" style={{ marginTop: theme.spacing.xxl }}>
              <Text variant="body" color="secondary" align="center">
                You matched. Say hello whenever you&apos;re ready.
              </Text>
            </VStack>
          }
          renderItem={({ item }) => {
            const mine = item.senderId === userId;
            return (
              <View
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  backgroundColor: mine ? theme.colors.accent : theme.colors.surface,
                  borderWidth: mine ? 0 : 1,
                  borderColor: theme.colors.border,
                  borderRadius: 16,
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: theme.spacing.md,
                }}
              >
                <Text
                  variant="body"
                  style={{ color: mine ? theme.colors.onAccent : theme.colors.textPrimary }}
                >
                  {item.body}
                </Text>
              </View>
            );
          }}
        />

        <HStack
          gap="sm"
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: theme.colors.borderStrong,
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.md,
              color: theme.colors.textPrimary,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={onSend}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="send" size={18} color={theme.colors.onAccent} />
          </Pressable>
        </HStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
