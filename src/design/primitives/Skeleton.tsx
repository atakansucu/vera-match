import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';
import { radii, type RadiusToken } from '../tokens';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: RadiusToken;
}

export function Skeleton({ width = '100%', height = 16, radius = 'sm' }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radii[radius], backgroundColor: theme.colors.skeleton },
        animatedStyle,
      ]}
    />
  );
}
