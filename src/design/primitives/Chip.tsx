import { Pressable, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { minTouchTarget, radii, spacing } from '../tokens';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

/** Selectable pill used across onboarding and preference editing. */
export function Chip({ label, selected = false, onPress, disabled }: ChipProps) {
  const theme = useTheme();

  const style: ViewStyle = {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: selected ? theme.colors.accent : theme.colors.borderStrong,
    backgroundColor: selected ? theme.colors.accentSoft : theme.colors.surface,
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && { opacity: 0.85 }]}
    >
      <Text variant="callout" color={selected ? 'accent' : 'secondary'}>
        {label}
      </Text>
    </Pressable>
  );
}
