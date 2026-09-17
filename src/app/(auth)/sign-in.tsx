import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button, Screen, Text, VStack } from '@/design';
import { Field } from '@/design/primitives/Field';
import { useAuthActions } from '@/features/auth/useAuth';
import { emailSchema, isEmailDomainAllowed } from '@/features/auth/validation';
import { classifyError, messageFor } from '@/lib/errors';
import { getBackend } from '@/services/backend';

interface FormValues {
  email: string;
}

export default function SignInScreen() {
  const router = useRouter();
  const auth = useAuthActions();
  const backend = getBackend();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const flags = useQuery({ queryKey: ['flags'], queryFn: () => backend.getFeatureFlags() });

  const { control, handleSubmit } = useForm<FormValues>({ defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    const domains = flags.data?.betaAllowedEmailDomains ?? [];
    if (!isEmailDomainAllowed(email, domains)) {
      setFormError('This beta is limited to approved community email domains right now.');
      return;
    }
    setSubmitting(true);
    try {
      const { devCode } = await auth.sendCode(email);
      router.push({ pathname: '/(auth)/verify', params: { email, devCode: devCode ?? '' } });
    } catch (error) {
      setFormError(messageFor(classifyError(error)));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Screen scroll contentStyle={{ justifyContent: 'center' }}>
      <VStack gap="xxl">
        <VStack gap="sm">
          <Text variant="display">Kindred</Text>
          <Text variant="body" color="secondary">
            A private matchmaker that learns who you actually connect with, and introduces you to
            fewer people for reasons it can explain.
          </Text>
        </VStack>

        <VStack gap="lg">
          <Controller
            control={control}
            name="email"
            rules={{
              validate: (v) => emailSchema.safeParse(v).success || 'Enter a valid email address.',
            }}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <Field
                label="Email"
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          {formError ? (
            <Text variant="caption" color="destructive">
              {formError}
            </Text>
          ) : null}

          <Button label="Email me a code" loading={submitting} onPress={onSubmit} />

          {auth.isDev ? (
            <View>
              <Button
                label="Continue as demo (Ava)"
                variant="secondary"
                onPress={() => auth.signInAsDemo().then(() => router.replace('/'))}
              />
              <Text variant="footnote" color="tertiary" align="center" style={{ marginTop: 8 }}>
                Demo mode uses seeded local data. No real accounts or messages.
              </Text>
            </View>
          ) : null}
        </VStack>

        <Text variant="footnote" color="tertiary">
          Kindred is for adults 18+. By continuing you agree to our community guidelines. We ask for
          consent before using any sensitive matchmaking detail.
        </Text>
      </VStack>
    </Screen>
  );
}
