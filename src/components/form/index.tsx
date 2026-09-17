import type { ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Chip, HStack, Text, useTheme, VStack } from '@/design';

export function LabeledBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <VStack gap="sm">
      <Text variant="label" color="secondary">
        {label}
      </Text>
      {children}
      {hint ? (
        <Text variant="caption" color="tertiary">
          {hint}
        </Text>
      ) : null}
    </VStack>
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <HStack gap="sm" wrap>
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </HStack>
  );
}

export function MultiChipGroup<T extends string>({
  options,
  values,
  onToggle,
}: {
  options: Option<T>[];
  values: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <HStack gap="sm" wrap>
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={values.includes(option.value)}
          onPress={() => onToggle(option.value)}
        />
      ))}
    </HStack>
  );
}

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <HStack justify="space-between" gap="lg" style={{ alignItems: 'center' }}>
      <VStack gap="xxs" style={{ flex: 1 }}>
        <Text variant="body">{label}</Text>
        {description ? (
          <Text variant="caption" color="tertiary">
            {description}
          </Text>
        ) : null}
      </VStack>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
        thumbColor={theme.colors.surface}
      />
    </HStack>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  const button = (symbol: string, onPress: () => void, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${symbol === '+' ? 'Increase' : 'Decrease'} ${label}`}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text variant="heading" color="secondary">
        {symbol}
      </Text>
    </Pressable>
  );

  return (
    <HStack justify="space-between">
      <Text variant="body">{label}</Text>
      <HStack gap="lg">
        {button('\u2212', () => onChange(Math.max(min, value - 1)), value <= min)}
        <View style={{ minWidth: 36, alignItems: 'center' }}>
          <Text variant="subheading">{value}</Text>
        </View>
        {button('+', () => onChange(Math.min(max, value + 1)), value >= max)}
      </HStack>
    </HStack>
  );
}
