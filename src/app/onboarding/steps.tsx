import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Callout, Photo, ScreenHeader } from '@/components';
import { ChipGroup, LabeledBlock, MultiChipGroup, Stepper, ToggleRow } from '@/components/form';
import { Button, Card, HStack, Screen, Text, useTheme, VStack } from '@/design';
import { Field } from '@/design/primitives/Field';
import {
  CHILDREN_OPTIONS,
  DISTANCE_OPTIONS,
  GENDER_OPTIONS,
  MUNICH_AREAS,
  RELATIONSHIP_GOAL_OPTIONS,
  STYLE_QUESTIONS,
  styleOptions,
} from '@/features/onboarding/options';
import {
  ONBOARDING_DEFAULTS,
  ONBOARDING_STEPS,
  validateStep,
  type OnboardingForm,
} from '@/features/onboarding/schema';
import { useSubmitOnboarding } from '@/features/onboarding/useSubmitOnboarding';
import { classifyError, messageFor } from '@/lib/errors';
import { pickImage } from '@/lib/photos';
import { getBackend } from '@/services/backend';
import { useSessionStore } from '@/state/session';

const MAX_PHOTOS = 6;

export default function OnboardingSteps() {
  const theme = useTheme();
  const router = useRouter();
  const backend = getBackend();
  const session = useSessionStore((s) => s.session);
  const submit = useSubmitOnboarding();

  const [form, setForm] = useState<OnboardingForm>(ONBOARDING_DEFAULTS);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) void backend.track(session.userId, 'onboarding_started');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = ONBOARDING_STEPS[stepIndex];
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;
  const update = (patch: Partial<OnboardingForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const onNext = async () => {
    const result = validateStep(step, form);
    if (!result.ok) {
      setError(result.message ?? 'Please complete this step.');
      return;
    }
    setError(null);
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    setSubmitting(true);
    try {
      await submit(form);
      router.replace('/');
    } catch (error) {
      setError(messageFor(classifyError(error)));
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => {
    setError(null);
    if (stepIndex === 0) router.back();
    else setStepIndex((i) => i - 1);
  };

  const addPhoto = async () => {
    if (form.photos.length >= MAX_PHOTOS) return;
    try {
      const uri = await pickImage();
      if (uri) update({ photos: [...form.photos, uri] });
    } catch (error) {
      setError(messageFor(classifyError(error)));
    }
  };

  const progress = useMemo(
    () => `Step ${stepIndex + 1} of ${ONBOARDING_STEPS.length}`,
    [stepIndex],
  );

  return (
    <Screen
      scroll
      footer={
        <HStack gap="md">
          <View style={{ flex: 1 }}>
            <Button label="Back" variant="secondary" onPress={onBack} />
          </View>
          <View style={{ flex: 2 }}>
            <Button label={isLast ? 'Finish' : 'Continue'} loading={submitting} onPress={onNext} />
          </View>
        </HStack>
      }
    >
      <ScreenHeader title="Set up" subtitle={progress} />

      {step === 'age' ? (
        <VStack gap="lg">
          <Text variant="heading">How old are you?</Text>
          <Callout>
            Your exact date of birth stays private. Others only ever see your age. Kindred is 18+.
          </Callout>
          <Field
            label="Date of birth"
            placeholder="YYYY-MM-DD"
            value={form.dob}
            onChangeText={(v) => update({ dob: v })}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
        </VStack>
      ) : null}

      {step === 'basics' ? (
        <VStack gap="xl">
          <Field
            label="First name"
            placeholder="Ava"
            value={form.displayName}
            onChangeText={(v) => update({ displayName: v })}
          />
          <LabeledBlock label="You are">
            <ChipGroup
              options={GENDER_OPTIONS}
              value={form.gender}
              onChange={(gender) => update({ gender })}
            />
          </LabeledBlock>
          <LabeledBlock
            label="Your area in Munich"
            hint="Only a broad area is shown, never your exact location."
          >
            <ChipGroup
              options={MUNICH_AREAS.map((a) => ({ value: a, label: a }))}
              value={form.area || null}
              onChange={(area) => update({ area })}
            />
          </LabeledBlock>
          <Field
            label="Work or study (optional)"
            placeholder="Architecture MSc"
            value={form.occupation}
            onChangeText={(v) => update({ occupation: v })}
          />
          <ToggleRow
            label="Show this on my profile"
            value={form.showOccupation}
            onValueChange={(showOccupation) => update({ showOccupation })}
          />
          <Field
            label="A short note (optional)"
            placeholder="Slow mornings, long museum afternoons..."
            value={form.bio}
            onChangeText={(v) => update({ bio: v })}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </VStack>
      ) : null}

      {step === 'preferences' ? (
        <VStack gap="xl">
          <LabeledBlock label="I'd like to meet">
            <MultiChipGroup
              options={GENDER_OPTIONS}
              values={form.preferredGenders}
              onToggle={(g) =>
                update({
                  preferredGenders: form.preferredGenders.includes(g)
                    ? form.preferredGenders.filter((x) => x !== g)
                    : [...form.preferredGenders, g],
                })
              }
            />
          </LabeledBlock>
          <ToggleRow
            label="Use this preference to match me"
            description="We ask explicitly, and you can withdraw this consent anytime."
            value={form.partnerGenderConsent}
            onValueChange={(partnerGenderConsent) => update({ partnerGenderConsent })}
          />
          <LabeledBlock label="I'm looking for">
            <ChipGroup
              options={RELATIONSHIP_GOAL_OPTIONS}
              value={form.relationshipGoal}
              onChange={(relationshipGoal) => update({ relationshipGoal })}
            />
          </LabeledBlock>
          <LabeledBlock label="Age range">
            <VStack gap="md">
              <Stepper
                label="From"
                value={form.minAge}
                min={18}
                max={99}
                onChange={(minAge) => update({ minAge })}
              />
              <Stepper
                label="To"
                value={form.maxAge}
                min={18}
                max={99}
                onChange={(maxAge) => update({ maxAge })}
              />
            </VStack>
          </LabeledBlock>
          <LabeledBlock label="Distance">
            <ChipGroup
              options={DISTANCE_OPTIONS.map((km) => ({ value: String(km), label: `${km} km` }))}
              value={String(form.maxDistanceKm)}
              onChange={(v) => update({ maxDistanceKm: Number(v) })}
            />
          </LabeledBlock>
        </VStack>
      ) : null}

      {step === 'dealbreakers' ? (
        <VStack gap="xl">
          <Text variant="callout" color="secondary">
            Just the few things that genuinely matter. Everything else I&apos;ll learn over time.
          </Text>
          <ToggleRow
            label="I'd rather not be matched with smokers"
            value={form.smokingDealbreaker}
            onValueChange={(smokingDealbreaker) => update({ smokingDealbreaker })}
          />
          <LabeledBlock label="Children">
            <ChipGroup
              options={CHILDREN_OPTIONS}
              value={form.childrenIntent}
              onChange={(childrenIntent) => update({ childrenIntent })}
            />
          </LabeledBlock>
          <ToggleRow
            label="This is a dealbreaker for me"
            description="Only match me with compatible intentions about children."
            value={form.childrenDealbreaker}
            onValueChange={(childrenDealbreaker) => update({ childrenDealbreaker })}
          />
        </VStack>
      ) : null}

      {step === 'style' ? (
        <VStack gap="xl">
          <Text variant="callout" color="secondary">
            A few quick, optional questions. Skip any that don&apos;t feel clear yet.
          </Text>
          {STYLE_QUESTIONS.map((q) => (
            <LabeledBlock key={q.dimension} label={q.prompt}>
              <ChipGroup
                options={styleOptions(q.dimension)}
                value={form.styleAnswers[q.dimension] ?? null}
                onChange={(value) =>
                  update({ styleAnswers: { ...form.styleAnswers, [q.dimension]: value } })
                }
              />
            </LabeledBlock>
          ))}
        </VStack>
      ) : null}

      {step === 'photos' ? (
        <VStack gap="lg">
          <Text variant="heading">Add a few photos</Text>
          <Text variant="callout" color="secondary">
            Photos are for people to see once you both choose to meet. They&apos;re stored
            privately.
          </Text>
          <HStack gap="md" wrap>
            {form.photos.map((uri, index) => (
              <Pressable
                key={uri}
                onPress={() => update({ photos: form.photos.filter((_, i) => i !== index) })}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                style={{ width: 96 }}
              >
                <Photo url={uri} name={form.displayName || 'You'} aspectRatio={0.8} />
                <Text variant="footnote" color="tertiary" align="center" style={{ marginTop: 4 }}>
                  Remove
                </Text>
              </Pressable>
            ))}
            {form.photos.length < MAX_PHOTOS ? (
              <Pressable
                onPress={addPhoto}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
                style={{
                  width: 96,
                  aspectRatio: 0.8,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.borderStrong,
                  borderStyle: 'dashed',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="title" color="tertiary">
                  +
                </Text>
              </Pressable>
            ) : null}
          </HStack>
        </VStack>
      ) : null}

      {step === 'consent' ? (
        <VStack gap="xl">
          <Text variant="heading">A little consent, then we&apos;re set</Text>
          <Card>
            <ToggleRow
              label="Let my matchmaker learn from my reflections"
              description="I only update your model with your confirmation. You can review and correct everything."
              value={form.aiConsent}
              onValueChange={(aiConsent) => update({ aiConsent })}
            />
          </Card>
          <Callout>
            That&apos;s enough to start. I&apos;ll learn the rest only when it becomes useful. You
            can verify your identity anytime from your profile.
          </Callout>
        </VStack>
      ) : null}

      {error ? (
        <Text variant="caption" color="destructive" style={{ marginTop: theme.spacing.lg }}>
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}
