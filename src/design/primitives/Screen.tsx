import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { spacing } from '../tokens';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: readonly Edge[];
  background?: 'background' | 'surface';
  contentStyle?: ViewStyle;
  footer?: ReactNode;
}

/**
 * Base screen wrapper: applies safe-area insets, theme background and a
 * consistent content gutter. Keeps individual screens free of layout chrome.
 */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'bottom'],
  background = 'background',
  contentStyle,
  footer,
}: ScreenProps) {
  const theme = useTheme();
  const backgroundColor = background === 'surface' ? theme.colors.surface : theme.colors.background;

  const innerStyle: ViewStyle = {
    padding: padded ? spacing.xl : 0,
    flexGrow: 1,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[innerStyle, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[innerStyle, contentStyle, { flex: 1 }]}>{children}</View>
      )}
      {footer ? (
        <View
          style={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor,
          }}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
