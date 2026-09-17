import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Callout, ScreenHeader } from '@/components';
import { ChipGroup } from '@/components/form';
import {
  Badge,
  Button,
  Card,
  HStack,
  Icon,
  Screen,
  Spacer,
  Text,
  useTheme,
  VStack,
} from '@/design';
import { Field } from '@/design/primitives/Field';
import {
  useAnswerMicroQuestion,
  useConfirmClaim,
  useMicroQuestion,
  useModelInsights,
  useRejectClaim,
  useShareThought,
} from '@/features/claims/hooks';

export default function MatchmakerScreen() {
  const theme = useTheme();
  const router = useRouter();

  const insights = useModelInsights();
  const microQuestion = useMicroQuestion();
  const answer = useAnswerMicroQuestion();
  const confirm = useConfirmClaim();
  const reject = useRejectClaim();
  const shareThought = useShareThought();

  const [thought, setThought] = useState('');
  const [choice, setChoice] = useState<string | null>(null);

  const pending = (insights.data ?? []).filter((i) => i.status === 'unconfirmed');
  const mq = microQuestion.data;

  const submitThought = () => {
    const text = thought.trim();
    if (!text) return;
    shareThought.mutate(text, { onSuccess: () => setThought('') });
  };

  return (
    <Screen scroll>
      <ScreenHeader
        title="Matchmaker"
        subtitle="A quiet place to correct me and tell me what matters. Most days there's nothing to do here."
      />

      <VStack gap="xl">
        {mq ? (
          <Card elevated>
            <VStack gap="md">
              <Badge label="One quick question" tone="accent" />
              <Text variant="subheading">{mq.question}</Text>
              <ChipGroup
                options={mq.options}
                value={choice}
                onChange={(value) => setChoice(value)}
              />
              <Button
                label="Answer"
                disabled={!choice}
                loading={answer.isPending}
                onPress={() =>
                  choice &&
                  answer.mutate(
                    { dimension: mq.dimension, value: choice },
                    { onSuccess: () => setChoice(null) },
                  )
                }
              />
            </VStack>
          </Card>
        ) : null}

        {pending.length > 0 ? (
          <VStack gap="md">
            <Text variant="label" color="secondary">
              THINGS I&apos;M WONDERING
            </Text>
            {pending.map((item) => (
              <Card key={item.claimId}>
                <VStack gap="md">
                  <Text variant="body">{item.valueLabel}</Text>
                  <Text variant="caption" color="tertiary">
                    {item.sourceText}
                  </Text>
                  <HStack gap="md">
                    <View style={{ flex: 1 }}>
                      <Button label="Yes" onPress={() => confirm.mutate(item.claimId)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        label="Not quite"
                        variant="secondary"
                        onPress={() => reject.mutate(item.claimId)}
                      />
                    </View>
                  </HStack>
                </VStack>
              </Card>
            ))}
          </VStack>
        ) : null}

        <VStack gap="md">
          <Text variant="label" color="secondary">
            SHARE A THOUGHT
          </Text>
          <Field
            placeholder="Something on your mind about dating or what you're looking for..."
            value={thought}
            onChangeText={setThought}
            multiline
            numberOfLines={3}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
          <Button
            label="Share with my matchmaker"
            variant="secondary"
            loading={shareThought.isPending}
            onPress={submitThought}
          />
          {shareThought.isSuccess && shareThought.data.createdClaims.length > 0 ? (
            <Callout>
              Thank you — I noted something to check with you. You&apos;ll find it above.
            </Callout>
          ) : null}
        </VStack>

        <Spacer size="sm" />
        <Card>
          <HStack justify="space-between">
            <VStack gap="xxs" style={{ flex: 1 }}>
              <Text variant="subheading">What my matchmaker knows</Text>
              <Text variant="caption" color="secondary">
                Review and correct everything I believe about you.
              </Text>
            </VStack>
            <Button
              label="Open"
              variant="ghost"
              fullWidth={false}
              onPress={() => router.push('/model')}
              leftIcon={<Icon name="chevron-right" size={18} color={theme.colors.accent} />}
            />
          </HStack>
        </Card>
      </VStack>
    </Screen>
  );
}
