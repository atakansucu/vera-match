import { forwardRef } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme';
import { minTouchTarget, radii, spacing } from '../tokens';
import { Text } from './Text';

export interface FieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Labelled text input with an inline error region. Errors are communicated with
 * text + an icon-free colour change so we never rely on colour alone.
 */
export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, hint, style, ...rest },
  ref,
) {
  const theme = useTheme();
  const hasError = Boolean(error);

  return (
    <View style={{ gap: spacing.sm }}>
      {label ? (
        <Text variant="label" color="secondary">
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.textTertiary}
        style={[
          {
            minHeight: minTouchTarget,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: hasError ? theme.colors.destructive : theme.colors.borderStrong,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            color: theme.colors.textPrimary,
            fontSize: theme.typography.body.fontSize,
          },
          style,
        ]}
        {...rest}
      />
      {hasError ? (
        <Text variant="caption" color="destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
