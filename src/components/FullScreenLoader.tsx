import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/design';

export function FullScreenLoader() {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
      }}
    >
      <ActivityIndicator color={theme.colors.accent} />
    </View>
  );
}
