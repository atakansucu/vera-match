import { View } from 'react-native';

import { useTheme } from '../theme';
import { spacing, type SpacingToken } from '../tokens';

export function Divider({ spacingToken = 'lg' }: { spacingToken?: SpacingToken }) {
  const theme = useTheme();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: spacing[spacingToken],
      }}
    />
  );
}
