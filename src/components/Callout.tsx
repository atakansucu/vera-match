import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text, useTheme } from '@/design';

export interface CalloutProps {
  children: ReactNode;
  tone?: 'accent' | 'neutral' | 'caution';
}

/** Soft container for the matchmaker's calm, humble voice. */
export function Callout({ children, tone = 'accent' }: CalloutProps) {
  const theme = useTheme();
  const bg =
    tone === 'accent'
      ? theme.colors.accentSoft
      : tone === 'caution'
        ? theme.colors.cautionSoft
        : theme.colors.surfaceElevated;

  return (
    <View style={{ backgroundColor: bg, borderRadius: theme.radii.md, padding: theme.spacing.lg }}>
      {typeof children === 'string' ? (
        <Text variant="callout" color="secondary">
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
