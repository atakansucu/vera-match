import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '../theme';
import { radii, spacing, type RadiusToken, type SpacingToken } from '../tokens';

export interface CardProps extends ViewProps {
  children: ReactNode;
  elevated?: boolean;
  padding?: SpacingToken;
  radius?: RadiusToken;
  bordered?: boolean;
}

export function Card({
  children,
  elevated = false,
  padding = 'xl',
  radius = 'lg',
  bordered = true,
  style,
  ...rest
}: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: elevated ? theme.colors.surfaceElevated : theme.colors.surface,
          borderRadius: radii[radius],
          padding: spacing[padding],
          borderWidth: bordered ? 1 : 0,
          borderColor: theme.colors.border,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
