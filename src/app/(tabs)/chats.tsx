import { useRouter } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';

import { EmptyState, Photo, ScreenHeader } from '@/components';
import { Badge, HStack, Screen, Text, useTheme, VStack } from '@/design';
import { useConversations } from '@/features/chat/hooks';
import { formatRelativeTime } from '@/lib/date';

export default function ChatsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const conversations = useConversations();
  const data = conversations.data ?? [];

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xl }}>
        <ScreenHeader title="Chats" subtitle="Only people you've both chosen to meet." />
      </View>

      {data.length === 0 ? (
        <EmptyState
          title="No conversations yet."
          body="When you and someone both say you'd like to meet, your chat opens here."
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.xl }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: theme.colors.border }} />
          )}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/chat/[conversationId]',
                  params: { conversationId: item.id },
                })
              }
              style={{ paddingVertical: theme.spacing.md }}
            >
              <HStack gap="md">
                <Photo url={item.other.photoUrl} name={item.other.firstName} size={52} rounded />
                <VStack gap="xxs" style={{ flex: 1 }}>
                  <HStack justify="space-between">
                    <Text variant="subheading">{item.other.firstName}</Text>
                    {item.lastMessage ? (
                      <Text variant="footnote" color="tertiary">
                        {formatRelativeTime(item.lastMessage.createdAt)}
                      </Text>
                    ) : null}
                  </HStack>
                  <HStack justify="space-between" gap="sm">
                    <Text variant="callout" color="secondary" numberOfLines={1} style={{ flex: 1 }}>
                      {item.lastMessage?.body ?? 'Say hello'}
                    </Text>
                    {item.unreadCount > 0 ? (
                      <Badge label={String(item.unreadCount)} tone="accent" />
                    ) : null}
                  </HStack>
                </VStack>
              </HStack>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
