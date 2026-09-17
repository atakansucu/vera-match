import { Image } from 'expo-image';
import { useState } from 'react';
import { View, type DimensionValue } from 'react-native';

import { Text, useTheme } from '@/design';
import { colorFromString, initials } from '@/lib/color';

export interface PhotoProps {
  url: string | null;
  name: string;
  size?: number;
  /** width/height ratio when used as a large tile (overrides size). */
  aspectRatio?: number;
  rounded?: boolean;
  radius?: number;
}

/**
 * Renders a user photo, falling back to a calm initials tile when there is no
 * URL or the image fails to load. Keeps the "see photos before deciding" flow
 * working offline in the dev/preview environment.
 */
export function Photo({ url, name, size, aspectRatio, rounded = false, radius = 16 }: PhotoProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(url) && !failed;

  const dimensionStyle: { width: DimensionValue; height?: DimensionValue; aspectRatio?: number } =
    aspectRatio ? { width: '100%', aspectRatio } : { width: size ?? 48, height: size ?? 48 };

  const borderRadius = rounded ? (size ?? 48) / 2 : radius;

  if (showImage) {
    return (
      <Image
        source={{ uri: url as string }}
        style={[dimensionStyle, { borderRadius, backgroundColor: theme.colors.skeleton }]}
        contentFit="cover"
        transition={200}
        onError={() => setFailed(true)}
        accessibilityLabel={`${name}'s photo`}
      />
    );
  }

  return (
    <View
      accessibilityLabel={`${name}'s photo placeholder`}
      style={[
        dimensionStyle,
        {
          borderRadius,
          backgroundColor: colorFromString(name),
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Text variant={size && size < 56 ? 'subheading' : 'display'} style={{ color: '#FFFFFF' }}>
        {initials(name)}
      </Text>
    </View>
  );
}
