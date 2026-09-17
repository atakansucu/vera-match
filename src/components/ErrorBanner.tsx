import { View } from 'react-native';

import { messageFor, type ErrorKind } from '@/lib/errors';

import { Callout } from './Callout';

export interface ErrorBannerProps {
  kind?: ErrorKind;
  message?: string;
}

/** Calm, non-technical failure copy. Never render raw exception text. */
export function ErrorBanner({ kind = 'generic', message }: ErrorBannerProps) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Callout tone="caution">{message ?? messageFor(kind)}</Callout>
    </View>
  );
}
