import { View, type ViewProps, type ViewStyle } from 'react-native';

import { spacing, type SpacingToken } from '../tokens';

export interface StackProps extends ViewProps {
  gap?: SpacingToken;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  flex?: number;
  wrap?: boolean;
}

function stackStyle(direction: 'row' | 'column', props: StackProps): ViewStyle {
  return {
    flexDirection: direction,
    gap: props.gap ? spacing[props.gap] : undefined,
    alignItems: props.align,
    justifyContent: props.justify,
    flex: props.flex,
    flexWrap: props.wrap ? 'wrap' : undefined,
  };
}

export function VStack({ gap, align, justify, flex, wrap, style, ...rest }: StackProps) {
  return (
    <View style={[stackStyle('column', { gap, align, justify, flex, wrap }), style]} {...rest} />
  );
}

export function HStack({ gap, align = 'center', justify, flex, wrap, style, ...rest }: StackProps) {
  return <View style={[stackStyle('row', { gap, align, justify, flex, wrap }), style]} {...rest} />;
}

export function Spacer({ size = 'lg' }: { size?: SpacingToken }) {
  return <View style={{ height: spacing[size] }} />;
}
