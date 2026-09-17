import { useCallback, useEffect } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { Badge, Text, useTheme, VStack } from '@/design';
import { Icon } from '@/design/primitives/Icon';
import { minTouchTarget, radii, spacing } from '@/design/tokens';
import type { Claim } from '@/types/domain';

import { TextChat } from './TextChat';
import { useAudioPlayer, useAudioRecorder } from './useAudio';
import { useVoiceSession } from './useVoiceSession';

interface VoiceChatProps {
  context: 'onboarding' | 'matchmaker';
  onComplete?: (claims: Claim[]) => void;
  onDismiss?: () => void;
}

/**
 * The voice matchmaker conversation component.
 *
 * In dev mode with a live server, supports:
 * - Text input (always available)
 * - Microphone recording → Whisper transcription → AI response
 * - TTS playback of AI responses
 *
 * Without a live server, falls back to scripted text simulation.
 */
export function VoiceChat({ context, onComplete }: VoiceChatProps) {
  const theme = useTheme();
  const { status, messages, sendText, start, end, isLive } = useVoiceSession({
    context,
    onComplete,
  });
  const { recordingStatus, startRecording, stopAndTranscribe } = useAudioRecorder();
  const { playbackStatus, speak, stop: stopPlayback } = useAudioPlayer();

  useEffect(() => {
    if (status === 'idle') {
      void start();
    }
  }, [status, start]);

  // Auto-play TTS for new assistant messages when live
  useEffect(() => {
    if (!isLive || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'assistant' && !last.streaming && last.text && playbackStatus === 'idle') {
      void speak(last.text);
    }
    // Only trigger when message list changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const handleMicPress = useCallback(async () => {
    if (recordingStatus === 'idle') {
      await stopPlayback();
      await startRecording();
    } else if (recordingStatus === 'recording') {
      const transcript = await stopAndTranscribe();
      if (transcript) {
        sendText(transcript);
      }
    }
  }, [recordingStatus, startRecording, stopAndTranscribe, stopPlayback, sendText]);

  const handleEnd = useCallback(async () => {
    await stopPlayback();
    await end();
  }, [end, stopPlayback]);

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

  const micColor =
    recordingStatus === 'recording'
      ? theme.colors.destructive
      : recordingStatus === 'processing'
        ? theme.colors.caution
        : theme.colors.accent;

  const micBgColor =
    recordingStatus === 'recording'
      ? theme.colors.destructiveSoft
      : recordingStatus === 'processing'
        ? theme.colors.cautionSoft
        : theme.colors.accentSoft;

  const micLabel =
    recordingStatus === 'recording'
      ? 'Stop recording'
      : recordingStatus === 'processing'
        ? 'Transcribing…'
        : 'Record voice';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={headerStyle}>
        <VStack gap="xxs">
          <Text variant="subheading">
            {context === 'onboarding' ? 'Getting to know you' : 'Your matchmaker'}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Badge label={isLive ? 'Live AI' : 'Text mode'} tone={isLive ? 'accent' : 'neutral'} />
            {playbackStatus === 'playing' ? (
              <Badge label="Speaking…" tone="accent" />
            ) : null}
          </View>
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

      {/* Mic button — only shown when live server is available */}
      {isLive ? (
        <View
          style={{
            position: 'absolute',
            bottom: 80,
            right: spacing.lg,
          }}
        >
          <Pressable
            onPress={handleMicPress}
            disabled={recordingStatus === 'processing'}
            accessibilityRole="button"
            accessibilityLabel={micLabel}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: micBgColor,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: recordingStatus === 'processing' ? 0.6 : 1,
              // Subtle shadow
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Icon
              name={recordingStatus === 'recording' ? 'mic-off' : 'mic'}
              size={24}
              color={micColor}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
