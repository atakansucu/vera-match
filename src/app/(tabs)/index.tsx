import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView } from 'react-native';

import { Callout, EmptyState, ScreenHeader } from '@/components';
import { Badge, Button, Card, Screen, Spacer, Text, useTheme, VStack } from '@/design';
import { useIntroductions, useRequestIntroduction } from '@/features/introductions/hooks';
import { useBackend, useUserId } from '@/hooks/app';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const backend = useBackend();
  const userId = useUserId();
  const introductions = useIntroductions();
  const requestIntro = useRequestIntroduction();

  const list = introductions.data ?? [];
  const active = list.find((i) => i.status === 'active' && i.myDecision === null);
  const waiting = list.find((i) => i.status === 'active' && i.myDecision === 'interested');
  const mutual = list.filter((i) => i.mutual);

  const openIntro = (id: string) => {
    void backend.track(userId, 'introduction_viewed', { introductionId: id });
    router.push({ pathname: '/introduction/[id]', params: { id } });
  };

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.xl, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={introductions.isRefetching}
            onRefresh={() => introductions.refetch()}
            tintColor={theme.colors.accent}
          />
        }
      >
        <ScreenHeader title="Home" subtitle="A small number of introductions, chosen with care." />

        {active ? (
          <Card padding="xl">
            <VStack gap="md">
              <Badge label="New introduction" tone="accent" />
              <Text variant="heading">Someone may be worth discovering.</Text>
              {active.explanation.alignment[0] ? (
                <Text variant="body" color="secondary">
                  {active.explanation.alignment[0].text}
                </Text>
              ) : (
                <Text variant="body" color="secondary">
                  I have a few reasons, and one thing I&apos;m still unsure about.
                </Text>
              )}
              <Spacer size="xs" />
              <Button label="Open introduction" onPress={() => openIntro(active.id)} />
            </VStack>
          </Card>
        ) : waiting ? (
          <Card>
            <VStack gap="sm">
              <Badge label="Waiting" tone="neutral" />
              <Text variant="heading">You said you&apos;re interested.</Text>
              <Text variant="body" color="secondary">
                If they feel the same, I&apos;ll open a chat. If they don&apos;t, I won&apos;t make
                a fuss about it — and I won&apos;t tell them either.
              </Text>
            </VStack>
          </Card>
        ) : (
          <EmptyState
            title="I'm still looking."
            body="I'd rather show you nobody than someone I don't have a meaningful reason to suggest."
            actionLabel={backend.kind === 'dev' ? 'Look for an introduction' : undefined}
            onAction={backend.kind === 'dev' ? () => requestIntro.mutate(undefined) : undefined}
            secondaryLabel="Review my preferences"
            onSecondary={() => router.push('/(tabs)/me')}
          />
        )}

        {mutual.length > 0 ? (
          <>
            <Spacer size="xl" />
            <Callout tone="neutral">
              You have {mutual.length} open {mutual.length === 1 ? 'conversation' : 'conversations'}
              . Find {mutual.length === 1 ? 'it' : 'them'} under Chats.
            </Callout>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
