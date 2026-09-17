import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '../theme';
import type { TypeVariant } from '../tokens';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'accent'
  | 'positive'
  | 'caution'
  | 'destructive'
  | 'onAccent';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: TextColor;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
}

export function Text({
  variant = 'body',
  color = 'primary',
  align,
  weight,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const typeStyle = theme.typography[variant];

  const colorMap: Record<TextColor, string> = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    tertiary: theme.colors.textTertiary,
    inverse: theme.colors.textInverse,
    accent: theme.colors.accent,
    positive: theme.colors.positive,
    caution: theme.colors.caution,
    destructive: theme.colors.destructive,
    onAccent: theme.colors.onAccent,
  };

  return (
    <RNText
      style={[
        {
          fontSize: typeStyle.fontSize,
          lineHeight: typeStyle.lineHeight,
          fontWeight: weight ?? typeStyle.fontWeight,
          letterSpacing: typeStyle.letterSpacing,
          color: colorMap[color],
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
}
