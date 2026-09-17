import { useCallback, useEffect } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { Badge, Text, useTheme, VStack } from '@/design';
import { Icon } from '@/design/primitives/Icon';
import { minTouchTarget, radii, spacing } from '@/design/tokens';
import type { Claim } from '@/types/domain';

import { TextChat } from './TextChat';
import { useVoiceSession } from './useVoiceSession';

interface VoiceChatProps {
  context: 'onboarding' | 'matchmaker';
  /** Called when the user ends the conversation and claims are extracted. */
  onComplete?: (claims: Claim[]) => void;
  /** Called when the user wants to dismiss without completing. */
  onDismiss?: () => void;
}

/**
 * The voice matchmaker conversation component.
 *
 * In dev mode (no OpenAI key), renders a text chat with scripted responses.
 * In production, this would show audio controls and connect via WebSocket
 * to the OpenAI Realtime API using an ephemeral token.
 *
 * Claims are extracted from the conversation transcript when the user ends
 * the session, following the learning loop: all claims start as `unconfirmed`.
 */
export function VoiceChat({ context, onComplete, onDismiss }: VoiceChatProps) {
  const theme = useTheme();
  const { status, messages, sendText, start, end, isLive } = useVoiceSession({
    context,
    onComplete,
  });

  useEffect(() => {
    if (status === 'idle') {
      void start();
    }
  }, [status, start]);

  const handleEnd = useCallback(async () => {
    await end();
  }, [end]);

  if (status === 'ended') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
        <VStack gap="lg" style={{ alignItems: 'center' }}>
          <Icon name="check-circle" size={48} color={theme.colors.positive} />
          <Text variant="heading" align="center">
            Thank you for sharing
          </Text>
          <Text variant="body" color="secondary" align="center">
            I noted a few things to check with you. You can review and correct them anytime.
          </Text>
        </VStack>
      </View>
    );
  }

  if (status === 'connecting') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <VStack gap="md" style={{ alignItems: 'center' }}>
          <Text variant="body" color="secondary">
            Connecting to your matchmaker…
          </Text>
        </VStack>
      </View>
    );
  }

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={headerStyle}>
        <VStack gap="xxs">
          <Text variant="subheading">
            {context === 'onboarding' ? 'Getting to know you' : 'Your matchmaker'}
          </Text>
          <Badge label={isLive ? 'Live AI' : 'Text mode'} tone={isLive ? 'accent' : 'neutral'} />
        </VStack>
        <Pressable
          onPress={handleEnd}
          accessibilityRole="button"
          accessibilityLabel="End conversation"
          style={{
            minWidth: minTouchTarget,
            minHeight: minTouchTarget,
            borderRadius: radii.md,
            backgroundColor: theme.colors.destructiveSoft,
            paddingHorizontal: spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="label" color="destructive">
            Done
          </Text>
        </Pressable>
      </View>
      <TextChat
        messages={messages}
        onSend={sendText}
        disabled={status !== 'active'}
      />
    </View>
  );
}
