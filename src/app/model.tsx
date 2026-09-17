import { useState } from 'react';
import { View } from 'react-native';

import { Callout, EmptyState, FullScreenLoader, ScreenHeader } from '@/components';
import { ChipGroup, Stepper } from '@/components/form';
import { Badge, Button, Card, HStack, Screen, Text, useTheme, VStack } from '@/design';
import {
  useConfirmClaim,
  useEditClaim,
  useForgetClaim,
  useRejectClaim,
} from '@/features/claims/hooks';
import { DIMENSION_SPECS } from '@/features/matching/dimensions';
import { useNotebook } from '@/features/matchmaker/hooks';
import type { ModelInsightView } from '@/types/views';

export default function ModelScreen() {
  const notebook = useNotebook();

  if (notebook.isPending) return <FullScreenLoader />;

  const data = notebook.data;
  const hasAny =
    data &&
    (data.prettySure.length > 0 || data.reconsidering.length > 0 || data.figuringOut.length > 0);

  return (
    <Screen scroll>
      <ScreenHeader
        title="Your matchmaker's notebook"
        subtitle="Everything I believe about you, in your words. You can change any of it."
        showBack
      />

      {!hasAny ? (
        <EmptyState
          title="I'm still getting to know you."
          body="As you reflect and answer the occasional question, what I learn will appear here — always for you to confirm or correct."
        />
      ) : (
        <VStack gap="xxl">
          {data.prettySure.length > 0 ? (
            <VStack gap="md">
              <Text variant="label" color="secondary">
                PRETTY SURE
              </Text>
              {data.prettySure.map((item) => (
                <InsightCard key={item.claimId} insight={item} />
              ))}
            </VStack>
          ) : null}

          {data.reconsidering.length > 0 ? (
            <VStack gap="md">
              <Text variant="label" color="caution">
                I&apos;M RECONSIDERING
              </Text>
              {data.reconsidering.map((item) => (
                <InsightCard key={item.claimId} insight={item} />
              ))}
            </VStack>
          ) : null}

          {data.figuringOut.length > 0 ? (
            <VStack gap="md">
              <Text variant="label" color="tertiary">
                STILL FIGURING OUT
              </Text>
              {data.figuringOut.map((item) => (
                <InsightCard key={item.claimId} insight={item} />
              ))}
            </VStack>
          ) : null}

          <Callout>
            I only let confirmed insights shape who I suggest. Hypotheses wait for your yes.
          </Callout>
        </VStack>
      )}
    </Screen>
  );
}

function InsightCard({ insight }: { insight: ModelInsightView }) {
  const theme = useTheme();
  const confirm = useConfirmClaim();
  const reject = useRejectClaim();
  const edit = useEditClaim();
  const forget = useForgetClaim();

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(insight.value);
  const [importance, setImportance] = useState(insight.importance);

  const spec = DIMENSION_SPECS[insight.dimension];
  const options = spec.scale.map((v) => ({ value: v, label: spec.valueLabels[v] ?? v }));

  return (
    <Card>
      <VStack gap="md">
        <HStack justify="space-between">
          <Text variant="label" color="tertiary">
            {insight.label}
          </Text>
          {insight.status === 'unconfirmed' ? <Badge label="Checking" tone="caution" /> : null}
        </HStack>

        <Text variant="body">{insight.valueLabel}</Text>
        <VStack gap="xxs">
          <Text variant="caption" color="secondary">
            {insight.confidenceText}
          </Text>
          <Text variant="footnote" color="tertiary">
            {insight.sourceText}
          </Text>
        </VStack>

        {editing ? (
          <VStack
            gap="md"
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              paddingTop: theme.spacing.md,
            }}
          >
            <ChipGroup options={options} value={value} onChange={setValue} />
            <Stepper
              label="How much this matters"
              value={importance}
              min={1}
              max={5}
              onChange={setImportance}
            />
            <HStack gap="md">
              <View style={{ flex: 1 }}>
                <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Save"
                  loading={edit.isPending}
                  onPress={() =>
                    edit.mutate(
                      { claimId: insight.claimId, value, importance },
                      { onSuccess: () => setEditing(false) },
                    )
                  }
                />
              </View>
            </HStack>
          </VStack>
        ) : insight.status === 'unconfirmed' ? (
          <VStack gap="sm">
            <Text variant="callout" color="secondary">
              Does this sound right?
            </Text>
            <HStack gap="md">
              <View style={{ flex: 1 }}>
                <Button label="Yes" onPress={() => confirm.mutate(insight.claimId)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Not quite"
                  variant="secondary"
                  onPress={() => reject.mutate(insight.claimId)}
                />
              </View>
            </HStack>
          </VStack>
        ) : (
          <HStack gap="lg">
            <Button
              label="Edit"
              variant="ghost"
              fullWidth={false}
              onPress={() => setEditing(true)}
            />
            <Button
              label="Forget this"
              variant="ghost"
              fullWidth={false}
              onPress={() => forget.mutate(insight.claimId)}
            />
          </HStack>
        )}
      </VStack>
    </Card>
  );
}
