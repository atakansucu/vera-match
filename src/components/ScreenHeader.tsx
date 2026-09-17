import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { HStack, Text, useTheme, VStack } from '@/design';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, showBack, right }: ScreenHeaderProps) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <VStack gap="xs" style={{ marginBottom: theme.spacing.lg }}>
      <HStack justify="space-between">
        <HStack gap="sm" style={{ flex: 1 }}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              hitSlop={12}
              style={{ paddingVertical: 4, paddingRight: 4 }}
            >
              <Text variant="heading" color="secondary">
                {'\u2039'}
              </Text>
            </Pressable>
          ) : null}
          <Text variant="title" style={{ flexShrink: 1 }}>
            {title}
          </Text>
        </HStack>
        {right ? <View>{right}</View> : null}
      </HStack>
      {subtitle ? (
        <Text variant="callout" color="secondary">
          {subtitle}
        </Text>
      ) : null}
    </VStack>
  );
}
