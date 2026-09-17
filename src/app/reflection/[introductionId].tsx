import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Callout, ErrorBanner, ScreenHeader } from '@/components';
import { ChipGroup } from '@/components/form';
import { Button, Card, HStack, Screen, Spacer, Text, VStack } from '@/design';
import { Field } from '@/design/primitives/Field';
import {
  useConfirmRevision,
  useRejectRevision,
  useSubmitDateOutcome,
  useSubmitReflection,
} from '@/features/reflections/hooks';
import { classifyError, type ErrorKind } from '@/lib/errors';
import type { RevisionProposal } from '@/services/ai/schemas';
import type { DateOutcomeValue, SecondDateIntent } from '@/types/domain';

const OUTCOME_OPTIONS: { value: DateOutcomeValue; label: string }[] = [
  { value: 'met', label: 'We met' },
  { value: 'did_not_meet', label: "We didn't meet" },
  { value: 'prefer_not_say', label: 'Prefer not to say' },
];

const SECOND_DATE_OPTIONS: { value: SecondDateIntent; label: string }[] = [
  { value: 'want_again', label: 'Definitely' },
  { value: 'no_continue', label: 'Probably not' },
  { value: 'prefer_not_say', label: 'Prefer not to say' },
];

export default function ReflectionScreen() {
  const router = useRouter();
  const { introductionId } = useLocalSearchParams<{ introductionId: string }>();

  const submitReflection = useSubmitReflection();
  const submitOutcome = useSubmitDateOutcome();
  const confirmRevision = useConfirmRevision();
  const rejectRevision = useRejectRevision();

  const [outcome, setOutcome] = useState<DateOutcomeValue | null>(null);
  const [secondDate, setSecondDate] = useState<SecondDateIntent | null>(null);
  const [text, setText] = useState('');
  const [reflectionId, setReflectionId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<RevisionProposal[] | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);

  const onShare = async () => {
    setErrorKind(null);
    try {
      if (outcome) {
        await submitOutcome.mutateAsync({
          introductionId,
          outcome,
          secondDate: secondDate ?? 'prefer_not_say',
        });
      }
      const result = await submitReflection.mutateAsync({ introductionId, text: text.trim() });
      setReflectionId(result.reflection.id);
      setProposals(result.proposals);
    } catch (error) {
      setErrorKind(classifyError(error));
    }
  };

  const resolve = (proposal: RevisionProposal, accept: boolean) => {
    if (!reflectionId) return;
    if (accept) confirmRevision.mutate({ reflectionId, proposal });
    else rejectRevision.mutate({ reflectionId, proposal });
    setProposals((prev) => prev?.filter((p) => p !== proposal) ?? null);
  };

  const finished = proposals !== null;
  const allHandled = finished && proposals.length === 0;

  return (
    <Screen scroll>
      <ScreenHeader title="How did it feel?" showBack />

      {!finished ? (
        <VStack gap="xl">
          <Callout>
            This is just between us. I only update what I&apos;ve learned about you with your
            confirmation.
          </Callout>
          {errorKind ? <ErrorBanner kind={errorKind} /> : null}

          <VStack gap="sm">
            <Text variant="label" color="secondary">
              WOULD YOU WANT TO SEE THEM AGAIN?
            </Text>
            <ChipGroup options={SECOND_DATE_OPTIONS} value={secondDate} onChange={setSecondDate} />
          </VStack>

          <VStack gap="sm">
            <Text variant="label" color="secondary">
              DID YOU MEET?
            </Text>
            <ChipGroup options={OUTCOME_OPTIONS} value={outcome} onChange={setOutcome} />
          </VStack>

          <VStack gap="sm">
            <Text variant="label" color="secondary">
              HOW DID IT ACTUALLY FEEL?
            </Text>
            <Field
              accessibilityLabel="How did it actually feel?"
              placeholder="It was easy to talk to them, but..."
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={5}
              style={{ minHeight: 130, textAlignVertical: 'top' }}
            />
          </VStack>

          <Button
            label="Share reflection"
            loading={submitReflection.isPending}
            disabled={!text.trim() && !outcome}
            onPress={onShare}
          />
        </VStack>
      ) : (
        <VStack gap="xl">
          {proposals.length > 0 ? (
            <>
              <Text variant="subheading">One thing I learned</Text>
              <Text variant="body" color="secondary">
                Only what you confirm will shape future introductions.
              </Text>
              {proposals.map((proposal, index) => (
                <Card key={index} elevated>
                  <VStack gap="md">
                    <Text variant="body">{proposal.question}</Text>
                    <HStack gap="sm">
                      <View style={{ flex: 1 }}>
                        <Button label="Yep" onPress={() => resolve(proposal, true)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          label="Partly"
                          variant="secondary"
                          onPress={() => resolve(proposal, true)}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          label="Not quite"
                          variant="ghost"
                          onPress={() => resolve(proposal, false)}
                        />
                      </View>
                    </HStack>
                  </VStack>
                </Card>
              ))}
            </>
          ) : (
            <Callout>
              {allHandled
                ? 'Thank you. Your model reflects what you confirmed.'
                : "Thank you — I've saved your reflection. Nothing stood out that I need to check right now."}
            </Callout>
          )}

          <Spacer size="sm" />
          <Button label="Done" onPress={() => router.replace('/(tabs)')} />
        </VStack>
      )}
    </Screen>
  );
}
