import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Callout, ErrorBanner, ScreenHeader } from '@/components';
import { ChipGroup } from '@/components/form';
import { Button, Divider, Screen, Text, VStack } from '@/design';
import { Field } from '@/design/primitives/Field';
import { REPORT_CATEGORY_OPTIONS } from '@/features/safety/categories';
import { useBlockUser, useReportUser } from '@/features/safety/hooks';
import { classifyError, type ErrorKind } from '@/lib/errors';
import type { ReportCategory } from '@/types/domain';

export default function ReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    userId: string;
    name?: string;
    contextType?: string;
    contextId?: string;
  }>();

  const report = useReportUser();
  const block = useBlockUser();
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [note, setNote] = useState('');
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);

  const name = params.name ?? 'this person';

  const onSubmit = () => {
    if (!category) return;
    setErrorKind(null);
    report.mutate(
      {
        reportedUserId: params.userId,
        category,
        contextType: (params.contextType as 'profile' | 'message' | 'introduction') ?? 'profile',
        contextId: params.contextId ?? null,
        note: note.trim(),
      },
      {
        onSuccess: () => {
          Alert.alert('Thank you', 'Our team will review this. Your report is confidential.');
          router.back();
        },
        onError: (error) => setErrorKind(classifyError(error)),
      },
    );
  };

  const onBlock = () => {
    Alert.alert(
      `Block ${name}?`,
      'They will not be able to message you, and you won\u2019t be matched again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => block.mutate(params.userId, { onSuccess: () => router.back() }),
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <ScreenHeader
        title="Report or block"
        subtitle={`This is confidential. ${name} won\u2019t be told.`}
        showBack
      />

      <VStack gap="xl">
        <VStack gap="sm">
          <Text variant="label" color="secondary">
            WHAT HAPPENED?
          </Text>
          <ChipGroup options={REPORT_CATEGORY_OPTIONS} value={category} onChange={setCategory} />
        </VStack>

        <Field
          label="Anything you'd like to add? (optional)"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={4}
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />

        <Button
          label="Submit report"
          disabled={!category}
          loading={report.isPending}
          onPress={onSubmit}
        />
        {errorKind ? <ErrorBanner kind={errorKind} /> : null}

        <Divider />

        <VStack gap="sm">
          <Text variant="subheading">Block {name}</Text>
          <Text variant="callout" color="secondary">
            Blocking stops all contact and prevents future introductions between you.
          </Text>
          <View style={{ marginTop: 4 }}>
            <Button label={`Block ${name}`} variant="destructive" onPress={onBlock} />
          </View>
        </VStack>

        <Callout>
          If you&apos;re in immediate danger, contact local emergency services. Kindred can restrict
          an account but cannot respond to emergencies.
        </Callout>
      </VStack>
    </Screen>
  );
}
