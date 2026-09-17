import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme';
import { radii, spacing } from '../tokens';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'caution' | 'destructive';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: ReactNode;
}

export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const theme = useTheme();

  const toneStyles: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: theme.colors.surfaceElevated, fg: theme.colors.textSecondary },
    accent: { bg: theme.colors.accentSoft, fg: theme.colors.accent },
    positive: { bg: theme.colors.positiveSoft, fg: theme.colors.positive },
    caution: { bg: theme.colors.cautionSoft, fg: theme.colors.caution },
    destructive: { bg: theme.colors.destructiveSoft, fg: theme.colors.destructive },
  };

  const { bg, fg } = toneStyles[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderRadius: radii.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      }}
    >
      {icon}
      <Text variant="label" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}
