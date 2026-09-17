import { useRouter } from 'expo-router';
import { useState } from 'react';

import { EmptyState, FullScreenLoader, ScreenHeader } from '@/components';
import { Button, Card, Screen, Spacer, Text, VStack } from '@/design';
import { usePredictionGame, useSubmitPrediction } from '@/features/matchmaker/hooks';
import { useBackend, useUserId } from '@/hooks/app';
import type { PredictionResultView } from '@/types/views';

export default function PredictionScreen() {
  const router = useRouter();
  const backend = useBackend();
  const userId = useUserId();
  const game = usePredictionGame();
  const submit = useSubmitPrediction();

  const [result, setResult] = useState<PredictionResultView | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  if (game.isPending) return <FullScreenLoader />;

  const data = game.data;
  if (!data) {
    return (
      <Screen>
        <ScreenHeader title="Would I get you right?" showBack />
        <EmptyState
          title="Nothing to predict right now."
          body="I need to know you a bit better first. Come back after a few more reflections."
        />
      </Screen>
    );
  }

  const choose = async (choice: 'a' | 'b') => {
    void backend.track(userId, 'prediction_game_answered', { choice });
    const res = await submit.mutateAsync({ predictionId: data.id, choice });
    void backend.track(userId, res.correct ? 'prediction_correct' : 'prediction_incorrect', {});
    setResult(res);
  };

  if (result && !reason) {
    return (
      <Screen scroll>
        <ScreenHeader title="Would I get you right?" showBack />
        <VStack gap="xl">
          <Card elevated>
            <VStack gap="md" align="center">
              <Text variant="heading" align="center">
                {result.correct ? 'I got that one right.' : 'Interesting — I got that wrong.'}
              </Text>
              <Text variant="body" color="secondary" align="center">
                {result.correct
                  ? "I'm starting to understand what draws you in."
                  : "That's useful. It helps me recalibrate."}
              </Text>
            </VStack>
          </Card>

          <VStack gap="md">
            <Text variant="subheading">What mattered most?</Text>
            {['Their personality overall', 'Lifestyle compatibility', 'Independence', 'Energy', 'Something else', 'Not sure'].map(
              (label) => (
                <Button
                  key={label}
                  label={label}
                  variant="secondary"
                  onPress={() => {
                    setReason(label);
                  }}
                />
              ),
            )}
          </VStack>
        </VStack>
      </Screen>
    );
  }

  if (reason) {
    return (
      <Screen scroll>
        <ScreenHeader title="Would I get you right?" showBack />
        <VStack gap="xl">
          <Spacer size="xl" />
          <Text variant="heading" align="center">
            Thank you.
          </Text>
          <Text variant="body" color="secondary" align="center">
            I&apos;ll keep that in mind for future introductions.
          </Text>
          <Spacer size="md" />
          <Button label="Done" onPress={() => router.replace('/(tabs)')} />
        </VStack>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Would I get you right?" showBack />
      <VStack gap="xl">
        <Text variant="body" color="secondary">
          Two people. Based on what I know about you, I have a guess. Who would you be more
          interested in?
        </Text>

        <Card>
          <VStack gap="md">
            <Text variant="subheading">{data.candidateA.label}</Text>
            {data.candidateA.traits.map((trait, i) => (
              <Text key={i} variant="body" color="secondary">
                · {trait}
              </Text>
            ))}
            <Button label="This person" variant="secondary" onPress={() => choose('a')} />
          </VStack>
        </Card>

        <Card>
          <VStack gap="md">
            <Text variant="subheading">{data.candidateB.label}</Text>
            {data.candidateB.traits.map((trait, i) => (
              <Text key={i} variant="body" color="secondary">
                · {trait}
              </Text>
            ))}
            <Button label="This person" variant="secondary" onPress={() => choose('b')} />
          </VStack>
        </Card>
      </VStack>
    </Screen>
  );
}
