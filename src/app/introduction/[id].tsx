import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Callout, EmptyState, FullScreenLoader, Photo, ScreenHeader } from '@/components';
import {
  Badge,
  Button,
  Card,
  Divider,
  HStack,
  Icon,
  Screen,
  Spacer,
  Text,
  useTheme,
  VStack,
} from '@/design';
import { useIntroduction, useSubmitDecision } from '@/features/introductions/hooks';
import { useBackend, useUserId } from '@/hooks/app';
import type { ExplanationPoint } from '@/types/domain';

type Stage = 'explanation' | 'profile' | 'result';

export default function IntroductionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const backend = useBackend();
  const userId = useUserId();
  const { id } = useLocalSearchParams<{ id: string }>();

  const introQuery = useIntroduction(id);
  const decision = useSubmitDecision(id);
  const flags = useQuery({ queryKey: ['flags'], queryFn: () => backend.getFeatureFlags() });

  const [stage, setStage] = useState<Stage>('explanation');
  const [result, setResult] = useState<{ mutual: boolean; conversationId: string | null } | null>(
    null,
  );

  if (introQuery.isPending) return <FullScreenLoader />;
  const intro = introQuery.data;
  if (!intro) {
    return (
      <Screen>
        <ScreenHeader title="Introduction" showBack />
        <EmptyState title="This introduction isn't available." body="It may have been closed." />
      </Screen>
    );
  }

  const frictionVisible = flags.data?.frictionVisible ?? true;

  const revealProfile = () => {
    void backend.track(userId, 'introduction_profile_opened', { introductionId: intro.id });
    setStage('profile');
  };

  const decide = async (value: 'interested' | 'not_for_me') => {
    const outcome = await decision.mutateAsync(value);
    if (value === 'not_for_me') {
      router.back();
      return;
    }
    setResult(outcome);
    setStage('result');
  };

  return (
    <Screen scroll>
      <ScreenHeader title="An introduction" showBack />

      {stage === 'explanation' ? (
        <VStack gap="xl">
          <Text variant="heading">Someone may be worth discovering.</Text>

          <Section title="Why this person?">
            <PointList
              heading="You may align on"
              tone="positive"
              points={intro.explanation.alignment}
              emptyText="I don't yet have strong shared signals — but enough to be worth a look."
            />
            {frictionVisible && intro.explanation.friction.length > 0 ? (
              <PointList
                heading="Something to notice"
                tone="caution"
                points={intro.explanation.friction}
              />
            ) : null}
            {intro.explanation.unknowns.length > 0 ? (
              <PointList
                heading="Still unknown"
                tone="neutral"
                points={intro.explanation.unknowns}
              />
            ) : null}
          </Section>

          <Button label="Continue to their profile" onPress={revealProfile} />
        </VStack>
      ) : null}

      {stage === 'profile' ? (
        <VStack gap="xl">
          <VStack gap="md">
            {intro.other.photos.length > 0 ? (
              intro.other.photos.map((p) => (
                <Photo key={p.id} url={p.url} name={intro.other.firstName} aspectRatio={0.85} />
              ))
            ) : (
              <Photo url={null} name={intro.other.firstName} aspectRatio={0.85} />
            )}
          </VStack>

          <VStack gap="xs">
            <HStack gap="sm">
              <Text variant="title">
                {intro.other.firstName}, {intro.other.age}
              </Text>
              {intro.other.verified ? (
                <Badge
                  label="Verified"
                  tone="positive"
                  icon={<Icon name="check-circle" size={14} color={theme.colors.positive} />}
                />
              ) : null}
            </HStack>
            <Text variant="callout" color="secondary">
              {intro.other.area}, {intro.other.city}
              {intro.other.occupation ? ` · ${intro.other.occupation}` : ''}
            </Text>
          </VStack>

          {intro.other.bio ? <Text variant="body">{intro.other.bio}</Text> : null}

          <Divider />

          <VStack gap="md">
            <Button
              label="I'd like to meet them"
              loading={decision.isPending}
              onPress={() => decide('interested')}
            />
            <Button label="Not for me" variant="secondary" onPress={() => decide('not_for_me')} />
          </VStack>
          <Text variant="footnote" color="tertiary" align="center">
            Your choice is private. If it isn&apos;t mutual, they&apos;re never told.
          </Text>
          <Button
            label="Report or block"
            variant="ghost"
            onPress={() =>
              router.push({
                pathname: '/report',
                params: {
                  userId: intro.other.userId,
                  name: intro.other.firstName,
                  contextType: 'introduction',
                  contextId: intro.id,
                },
              })
            }
          />
        </VStack>
      ) : null}

      {stage === 'result' && result ? (
        <VStack gap="xl">
          <Spacer size="xl" />
          {result.mutual ? (
            <Card elevated>
              <VStack gap="md" align="center">
                <Text variant="display" align="center">
                  It&apos;s mutual.
                </Text>
                <Text variant="body" color="secondary" align="center">
                  You both chose to meet. The rest is up to the two of you.
                </Text>
                <Spacer size="xs" />
                <Button
                  label="Open chat"
                  onPress={() =>
                    result.conversationId
                      ? router.replace({
                          pathname: '/chat/[conversationId]',
                          params: { conversationId: result.conversationId },
                        })
                      : router.replace('/(tabs)/chats')
                  }
                />
              </VStack>
            </Card>
          ) : (
            <Callout>
              You&apos;re interested. If they feel the same, I&apos;ll open a chat. Either way,
              I&apos;ll keep this quiet.
            </Callout>
          )}
          {!result.mutual ? (
            <Button
              label="Back home"
              variant="secondary"
              onPress={() => router.replace('/(tabs)')}
            />
          ) : null}
        </VStack>
      ) : null}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <VStack gap="lg">
      <Text variant="subheading">{title}</Text>
      {children}
    </VStack>
  );
}

function PointList({
  heading,
  points,
  tone,
  emptyText,
}: {
  heading: string;
  points: ExplanationPoint[];
  tone: 'positive' | 'caution' | 'neutral';
  emptyText?: string;
}) {
  const theme = useTheme();
  const dotColor =
    tone === 'positive'
      ? theme.colors.positive
      : tone === 'caution'
        ? theme.colors.caution
        : theme.colors.textTertiary;

  if (points.length === 0 && !emptyText) return null;

  return (
    <VStack gap="sm">
      <Text variant="label" color="secondary">
        {heading.toUpperCase()}
      </Text>
      {points.length === 0 && emptyText ? (
        <Text variant="body" color="secondary">
          {emptyText}
        </Text>
      ) : (
        points.map((point, index) => (
          <HStack key={index} gap="sm" align="flex-start">
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: dotColor,
                marginTop: 8,
              }}
            />
            <Text variant="body" style={{ flex: 1 }}>
              {point.text}
            </Text>
          </HStack>
        ))
      )}
    </VStack>
  );
}
