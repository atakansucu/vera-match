import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View, type ViewStyle } from 'react-native';

import { Badge, Text, useTheme, VStack } from '@/design';
import { Icon } from '@/design/primitives/Icon';
import { minTouchTarget, radii, spacing } from '@/design/tokens';
import type { Claim } from '@/types/domain';

import { TextChat } from './TextChat';
import type { VoiceMessage } from './realtimeProtocol';
import { useAudioPlayer, useAudioRecorder } from './useAudio';
import { useVoiceSession } from './useVoiceSession';

interface VoiceChatProps {
  context: 'onboarding' | 'matchmaker';
  onComplete?: (claims: Claim[]) => void;
  onDismiss?: () => void;
}

/**
 * Voice matchmaker with push-to-talk: hold the mic button to record,
 * release to send. TTS plays the AI response automatically.
 */
export function VoiceChat({ context, onComplete }: VoiceChatProps) {
  const theme = useTheme();
  const { recordingStatus, partialTranscript, useNativeRecognition, startRecording, stopAndTranscribe } = useAudioRecorder();
  const { playbackStatus, speak, stop: stopPlayback } = useAudioPlayer();

  // Sentence queue: onSentence pushes sentences, effect plays them sequentially.
  // queueTrigger forces a re-render so the effect can pick up newly queued items.
  const ttsQueueRef = useRef<string[]>([]);
  const [queueTrigger, setQueueTrigger] = useState(0);

  // Word-by-word reveal state for TTS-synced text display
  const revealedTextRef = useRef('');
  const pendingWordsRef = useRef<string[]>([]);
  const wordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamingDoneRef = useRef(false);

  const handleSentence = useCallback((sentence: string) => {
    ttsQueueRef.current.push(sentence);
    setQueueTrigger((t) => t + 1);
  }, []);

  const handleStreamingDone = useCallback(() => {
    streamingDoneRef.current = true;
    setQueueTrigger((t) => t + 1);
  }, []);

  const { status, messages, sendText, start, end, isLive, updateStreamingText, finalizeStreaming } = useVoiceSession({
    context,
    onComplete,
    onSentence: handleSentence,
    onStreamingDone: handleStreamingDone,
  });

  // --- TTS-synced word reveal ---

  const REVEAL_MS_PER_WORD = 250;

  const flushPendingWords = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }
    if (pendingWordsRef.current.length > 0) {
      const sep = revealedTextRef.current ? ' ' : '';
      revealedTextRef.current += sep + pendingWordsRef.current.join(' ');
      pendingWordsRef.current = [];
      updateStreamingText(revealedTextRef.current);
    }
  }, [updateStreamingText]);

  const startWordReveal = useCallback((sentence: string) => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }
    const words = sentence.split(/\s+/).filter(Boolean);
    pendingWordsRef.current = words;

    const revealNextWord = () => {
      const word = pendingWordsRef.current.shift();
      if (!word) {
        if (wordTimerRef.current) {
          clearInterval(wordTimerRef.current);
          wordTimerRef.current = null;
        }
        return;
      }
      const sep = revealedTextRef.current ? ' ' : '';
      revealedTextRef.current += sep + word;
      updateStreamingText(revealedTextRef.current);
    };

    revealNextWord();
    if (pendingWordsRef.current.length > 0) {
      wordTimerRef.current = setInterval(revealNextWord, REVEAL_MS_PER_WORD);
    }
  }, [updateStreamingText]);

  const flushAllReveal = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }
    if (pendingWordsRef.current.length > 0) {
      const sep = revealedTextRef.current ? ' ' : '';
      revealedTextRef.current += sep + pendingWordsRef.current.join(' ');
      pendingWordsRef.current = [];
    }
    while (ttsQueueRef.current.length > 0) {
      const sentence = ttsQueueRef.current.shift()!;
      const sep = revealedTextRef.current ? ' ' : '';
      revealedTextRef.current += sep + sentence;
    }
    if (revealedTextRef.current) {
      updateStreamingText(revealedTextRef.current);
    }
    finalizeStreaming();
    streamingDoneRef.current = false;
    revealedTextRef.current = '';
  }, [updateStreamingText, finalizeStreaming]);

  // Clean up word timer on unmount
  useEffect(() => {
    return () => {
      if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    };
  }, []);

  // Play next sentence when player becomes idle and queue has items.
  // In live mode, word reveal starts only when audio playback actually begins
  // (via onPlaybackStart callback) so text and audio stay in sync.
  useEffect(() => {
    if (playbackStatus !== 'idle' || recordingStatus !== 'idle') return;

    flushPendingWords();

    const next = ttsQueueRef.current.shift();
    if (next) {
      if (isLive) {
        void speak(next, { onPlaybackStart: () => startWordReveal(next) });
      } else {
        void speak(next);
      }
    } else if (streamingDoneRef.current) {
      finalizeStreaming();
      streamingDoneRef.current = false;
      revealedTextRef.current = '';
    }
  }, [playbackStatus, recordingStatus, speak, queueTrigger, isLive, flushPendingWords, startWordReveal, finalizeStreaming]);

  // --- Streaming user message (real-time transcription while speaking) ---
  const isRecording = recordingStatus === 'recording';
  const showStreamingUser = isRecording && useNativeRecognition;

  const displayMessages: VoiceMessage[] = useMemo(() => {
    if (!showStreamingUser) return messages;
    const streamingUserMsg: VoiceMessage = {
      id: '__streaming_user__',
      role: 'user',
      text: partialTranscript || '…',
      streaming: true,
    };
    return [...messages, streamingUserMsg];
  }, [messages, showStreamingUser, partialTranscript]);

  // Pulsing animation for the mic button while recording
  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    if (recordingStatus === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [recordingStatus, pulseAnim]);

  useEffect(() => {
    if (status === 'idle') {
      void start();
    }
  }, [status, start]);

  // TTS is now handled by the sentence-level queue via onSentence callback.
  // For the scripted fallback (non-live), auto-play full messages:
  useEffect(() => {
    if (isLive || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'assistant' && !last.streaming && last.text && playbackStatus === 'idle') {
      void speak(last.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isLive]);

  // --- Push-to-talk handlers ---

  const handlePressIn = useCallback(async () => {
    if (recordingStatus !== 'idle') return;
    flushAllReveal();
    ttsQueueRef.current = [];
    await stopPlayback();
    // Small delay lets iOS fully release the playback audio session
    // before the recorder reconfigures it for mic input.
    await new Promise((r) => setTimeout(r, 150));
    await startRecording();
  }, [recordingStatus, stopPlayback, startRecording, flushAllReveal]);

  const handlePressOut = useCallback(async () => {
    if (recordingStatus !== 'recording') return;
    const transcript = await stopAndTranscribe();
    if (transcript) {
      sendText(transcript);
    }
  }, [recordingStatus, stopAndTranscribe, sendText]);

  const handleEnd = useCallback(async () => {
    flushAllReveal();
    await stopPlayback();
    await end();
  }, [end, stopPlayback, flushAllReveal]);

  // --- Render states ---

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
        <Text variant="body" color="secondary">
          Connecting to your matchmaker…
        </Text>
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

  const isProcessing = recordingStatus === 'processing';

  const micSize = 64;
  const micBg = isRecording
    ? theme.colors.destructive
    : isProcessing
      ? theme.colors.cautionSoft
      : theme.colors.accent;
  const micIconColor = isRecording
    ? theme.colors.textInverse
    : isProcessing
      ? theme.colors.caution
      : theme.colors.onAccent;

  const micHint = isRecording
    ? useNativeRecognition
      ? 'Listening… release to send'
      : 'Release to send'
    : isProcessing
      ? 'Transcribing…'
      : 'Hold to talk';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View style={headerStyle}>
        <VStack gap="xxs">
          <Text variant="subheading">
            {context === 'onboarding' ? 'Getting to know you' : 'Your matchmaker'}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Badge label={isLive ? 'Live AI' : 'Text mode'} tone={isLive ? 'accent' : 'neutral'} />
            {playbackStatus === 'playing' ? <Badge label="Speaking…" tone="accent" /> : null}
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
          <Text variant="label" color="destructive">Done</Text>
        </Pressable>
      </View>

      {/* Chat messages */}
      <TextChat messages={displayMessages} onSend={sendText} disabled={status !== 'active'} />

      {/* Push-to-talk mic button */}
      {isLive ? (
        <View
          style={{
            alignItems: 'center',
            paddingBottom: spacing.md,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text variant="caption" color={isRecording ? 'destructive' : 'secondary'} style={{ marginBottom: spacing.sm }}>
            {micHint}
          </Text>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isProcessing}
              accessibilityRole="button"
              accessibilityLabel={micHint}
              style={{
                width: micSize,
                height: micSize,
                borderRadius: micSize / 2,
                backgroundColor: micBg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isProcessing ? 0.5 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <Icon
                name={isRecording ? 'mic' : 'mic'}
                size={28}
                color={micIconColor}
              />
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}
