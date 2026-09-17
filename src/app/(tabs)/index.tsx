import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Callout, EmptyState, ScreenHeader } from '@/components';
import { Badge, Button, Card, HStack, Screen, Spacer, Text, useTheme, VStack } from '@/design';
import { useIntroductions, useRequestIntroduction } from '@/features/introductions/hooks';
import {
  useAcknowledgeRevisionCard,
  useAnswerMicroScenario,
  useHomeState,
  useWeeklyRecap,
} from '@/features/matchmaker/hooks';
import { useBackend, useUserId } from '@/hooks/app';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const backend = useBackend();
  const userId = useUserId();
  const introductions = useIntroductions();
  const requestIntro = useRequestIntroduction();
  const homeState = useHomeState();
  const weeklyRecap = useWeeklyRecap();
  const ackRevision = useAcknowledgeRevisionCard();
  const answerScenario = useAnswerMicroScenario();

  const [scenarioChoice, setScenarioChoice] = useState<string | null>(null);

  const list = introductions.data ?? [];
  const active = list.find((i) => i.status === 'active' && i.myDecision === null);
  const waiting = list.find((i) => i.status === 'active' && i.myDecision === 'interested');
  const mutual = list.filter((i) => i.mutual);

  const state = homeState.data;
  const recap = weeklyRecap.data;

  const openIntro = (id: string) => {
    void backend.track(userId, 'match_drop_opened', { introductionId: id });
    router.push({ pathname: '/introduction/[id]', params: { id } });
  };

  const isRefreshing = introductions.isRefetching || homeState.isRefetching;
  const onRefresh = () => {
    void introductions.refetch();
    void homeState.refetch();
  };

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.xl, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        <ScreenHeader title="Home" subtitle="A small number of introductions, chosen with care." />

        {/* Priority 1: Match Drop */}
        {active ? (
          <Card padding="xl">
            <VStack gap="md">
              <Badge label="New introduction" tone="accent" />
              <Text variant="heading">Your matchmaker found someone worth looking at.</Text>
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
              <Button label="See why" onPress={() => openIntro(active.id)} />
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
        ) : null}

        {/* Priority 2: "I changed my mind" revision card */}
        {!active && !waiting && state?.revisionCard ? (
          <>
            <Spacer size="lg" />
            <Card elevated>
              <VStack gap="md">
                <Badge label="I changed my mind" tone="caution" />
                <Text variant="body">{state.revisionCard.narrative}</Text>
                <Text variant="callout" color="secondary">
                  Does that sound right?
                </Text>
                <HStack gap="sm">
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Exactly"
                      onPress={() =>
                        ackRevision.mutate({
                          revisionId: state.revisionCard!.revisionId,
                          response: 'exactly',
                        })
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Sort of"
                      variant="secondary"
                      onPress={() =>
                        ackRevision.mutate({
                          revisionId: state.revisionCard!.revisionId,
                          response: 'sort_of',
                        })
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Not really"
                      variant="ghost"
                      onPress={() =>
                        ackRevision.mutate({
                          revisionId: state.revisionCard!.revisionId,
                          response: 'not_really',
                        })
                      }
                    />
                  </View>
                </HStack>
              </VStack>
            </Card>
          </>
        ) : null}

        {/* Priority 3: Micro-scenario */}
        {!active && !waiting && !state?.revisionCard && state?.microScenario ? (
          <>
            <Spacer size="lg" />
            <Card elevated>
              <VStack gap="md">
                <Badge label="Quick scenario" tone="accent" />
                <Text variant="body">{state.microScenario.prompt}</Text>
                <Text variant="footnote" color="tertiary">
                  {state.microScenario.reason}
                </Text>
                <VStack gap="sm">
                  {state.microScenario.options.map((opt) => (
                    <Button
                      key={opt.value}
                      label={opt.label}
                      variant={scenarioChoice === opt.value ? 'primary' : 'secondary'}
                      onPress={() => {
                        setScenarioChoice(opt.value);
                        answerScenario.mutate({
                          scenarioId: state.microScenario!.id,
                          value: opt.value,
                        });
                      }}
                    />
                  ))}
                </VStack>
              </VStack>
            </Card>
          </>
        ) : null}

        {/* Priority 4: Weekly recap */}
        {!active && !waiting && recap ? (
          <>
            <Spacer size="lg" />
            <Card>
              <VStack gap="md">
                <Text variant="label" color="secondary">
                  YOUR MATCHMAKER THIS WEEK
                </Text>
                {recap.learned ? (
                  <VStack gap="xxs">
                    <Text variant="caption" color="tertiary">
                      I LEARNED
                    </Text>
                    <Text variant="body">{recap.learned}</Text>
                  </VStack>
                ) : null}
                {recap.stoppedAssuming ? (
                  <VStack gap="xxs">
                    <Text variant="caption" color="tertiary">
                      I STOPPED ASSUMING
                    </Text>
                    <Text variant="body">{recap.stoppedAssuming}</Text>
                  </VStack>
                ) : null}
                {recap.stillCurious ? (
                  <VStack gap="xxs">
                    <Text variant="caption" color="tertiary">
                      I&apos;M STILL CURIOUS ABOUT
                    </Text>
                    <Text variant="body">{recap.stillCurious}</Text>
                  </VStack>
                ) : null}
                {recap.promisingCandidate ? (
                  <Callout tone="accent">
                    One person currently looks especially promising.
                  </Callout>
                ) : null}
              </VStack>
            </Card>
          </>
        ) : null}

        {/* Calm empty state (no match drop, no revision, no scenario, no recap) */}
        {!active &&
          !waiting &&
          !state?.revisionCard &&
          !state?.microScenario &&
          !recap ? (
          <EmptyState
            title="I'm still looking."
            body="I'd rather show you nobody than someone I don't have a meaningful reason to suggest."
            actionLabel={backend.kind === 'dev' ? 'Look for an introduction' : undefined}
            onAction={backend.kind === 'dev' ? () => requestIntro.mutate(undefined) : undefined}
            secondaryLabel="Review what I know about you"
            onSecondary={() => router.push('/model')}
          />
        ) : null}

        {/* Open conversations callout */}
        {mutual.length > 0 ? (
          <>
            <Spacer size="xl" />
            <Callout tone="neutral">
              You have {mutual.length} open {mutual.length === 1 ? 'conversation' : 'conversations'}
              . Find {mutual.length === 1 ? 'it' : 'them'} under Chats.
            </Callout>
          </>
        ) : null}

        {/* Prediction game teaser */}
        {state?.hasPredictionGame && !active ? (
          <>
            <Spacer size="lg" />
            <Card>
              <VStack gap="sm">
                <Text variant="subheading">Would I get you right?</Text>
                <Text variant="caption" color="secondary">
                  A quick way to see if I understand what you&apos;re drawn to.
                </Text>
                <Button
                  label="Try it"
                  variant="secondary"
                  onPress={() => router.push('/prediction')}
                />
              </VStack>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
