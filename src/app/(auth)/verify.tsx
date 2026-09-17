import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button, Screen, Text, VStack } from '@/design';
import { Field } from '@/design/primitives/Field';
import { ScreenHeader } from '@/components';
import { useAuthActions } from '@/features/auth/useAuth';
import { otpSchema } from '@/features/auth/validation';

interface FormValues {
  code: string;
}

export default function VerifyScreen() {
  const router = useRouter();
  const auth = useAuthActions();
  const { email, devCode } = useLocalSearchParams<{ email: string; devCode?: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<FormValues>({ defaultValues: { code: '' } });

  const onSubmit = handleSubmit(async ({ code }) => {
    setFormError(null);
    setSubmitting(true);
    try {
      await auth.verify(email ?? '', code);
      router.replace('/');
    } catch {
      setFormError('That code is not correct. Please try again.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Screen scroll>
      <ScreenHeader
        title="Check your email"
        subtitle={`We sent a 6-digit code to ${email ?? ''}.`}
        showBack
      />
      <VStack gap="lg">
        <Controller
          control={control}
          name="code"
          rules={{ validate: (v) => otpSchema.safeParse(v).success || 'Enter the 6-digit code.' }}
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <Field
              label="Verification code"
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

        {devCode ? (
          <Text variant="footnote" color="tertiary">
            Development code: {devCode}
          </Text>
        ) : null}

        {formError ? (
          <Text variant="caption" color="destructive">
            {formError}
          </Text>
        ) : null}

        <Button label="Verify" loading={submitting} onPress={onSubmit} />
      </VStack>
    </Screen>
  );
}
