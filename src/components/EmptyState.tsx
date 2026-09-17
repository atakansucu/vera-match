import { View } from 'react-native';

import { Button, Text, VStack } from '@/design';

export interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <VStack gap="md" align="center" style={{ maxWidth: 340 }}>
        <Text variant="heading" align="center">
          {title}
        </Text>
        <Text variant="body" color="secondary" align="center">
          {body}
        </Text>
        {actionLabel && onAction ? (
          <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
            <Button label={actionLabel} onPress={onAction} />
          </View>
        ) : null}
        {secondaryLabel && onSecondary ? (
          <Button label={secondaryLabel} variant="ghost" onPress={onSecondary} />
        ) : null}
      </VStack>
    </View>
  );
}
