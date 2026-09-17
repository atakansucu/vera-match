import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme';
import { minTouchTarget, radii, spacing } from '../tokens';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = true,
  disabled,
  leftIcon,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const heights: Record<ButtonSize, number> = { sm: 40, md: minTouchTarget, lg: 52 };

  const base: ViewStyle = {
    minHeight: heights[size],
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    opacity: isDisabled ? 0.5 : 1,
  };

  const variantStyle: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: theme.colors.accent },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
    },
    ghost: { backgroundColor: 'transparent' },
    destructive: { backgroundColor: theme.colors.destructiveSoft },
  };

  const textColor =
    variant === 'primary' ? 'onAccent' : variant === 'destructive' ? 'destructive' : 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [base, variantStyle[variant], pressed && { opacity: 0.85 }]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? theme.colors.onAccent : theme.colors.accent}
        />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text variant="subheading" color={textColor}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
