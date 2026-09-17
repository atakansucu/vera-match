import { Feather } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

import { useTheme } from '../theme';

export type IconName =
  | 'home'
  | 'compass'
  | 'message-circle'
  | 'user'
  | 'check'
  | 'x'
  | 'chevron-left'
  | 'chevron-right'
  | 'shield'
  | 'edit-2'
  | 'trash-2'
  | 'heart'
  | 'more-horizontal'
  | 'camera'
  | 'log-out'
  | 'lock'
  | 'alert-triangle'
  | 'check-circle'
  | 'download'
  | 'bell'
  | 'send'
  | 'flag'
  | 'slash'
  | 'mic'
  | 'mic-off'
  | 'phone'
  | 'phone-off';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
}

export function Icon({ name, size = 22, color }: IconProps) {
  const theme = useTheme();
  return <Feather name={name} size={size} color={color ?? theme.colors.textSecondary} />;
}
