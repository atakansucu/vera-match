import { useCallback, useRef, useState } from 'react';

import { getBackend } from '@/services/backend';
import { useSessionStore } from '@/state/session';
import type { Claim } from '@/types/domain';

import type { VoiceMessage } from './realtimeProtocol';

// ---------------------------------------------------------------------------
// Simulated matchmaker responses for the text-based dev mode.
// The real voice session uses the OpenAI Realtime API directly.
// ---------------------------------------------------------------------------

const ONBOARDING_PROMPTS: string[] = [
  "Hi — I'm your matchmaker. I'd love to understand what you're really looking for. Can you tell me a bit about what matters most to you in a relationship?",
  "That's helpful, thank you. How do you usually like to spend your time — are you more of a planner or do you prefer spontaneous days?",
  "Interesting. And when it comes to communication — do you prefer someone who texts throughout the day, or is a check-in now and then enough?",
  "One more thing: how important is alone time to you? Some people need a lot of space, others prefer being together most of the time.",
  "Thank you — I feel like I have a good starting picture. Let's continue setting up your profile.",
];

const MATCHMAKER_PROMPTS: string[] = [
  "Welcome back. Is there anything on your mind about dating lately — something you've been noticing or wondering about?",
  "That's an interesting observation. Has that shifted how you think about what you're looking for?",
  "I appreciate you sharing that. I'll keep it in mind as I think about your next introduction.",
];

export type VoiceSessionStatus = 'idle' | 'connecting' | 'active' | 'ended';

interface UseVoiceSessionOptions {
  context: 'onboarding' | 'matchmaker';
  onComplete?: (claims: Claim[]) => void;
}

interface UseVoiceSessionReturn {
  status: VoiceSessionStatus;
  messages: VoiceMessage[];
  /** In text mode, send a typed message. */
  sendText: (text: string) => void;
  /** Start the conversation. */
  start: () => Promise<void>;
  /** End the conversation and extract claims from transcript. */
  end: () => Promise<Claim[]>;
}

let msgCounter = 0;
function msgId(): string {
  msgCounter += 1;
  return `vmsg-${Date.now().toString(36)}-${msgCounter}`;
}

/**
 * Hook that manages a voice matchmaker conversation.
 *
 * In dev mode (ephemeralToken is null), it uses text-based simulation with
 * scripted matchmaker prompts and claim extraction via the existing AI pipeline.
 *
 * In production mode, it would connect to the OpenAI Realtime API via WebSocket
 * using the ephemeral token. (WebSocket integration is prepared but requires a
 * live OpenAI key, which only exists server-side in production.)
 */
export function useVoiceSession({
  context,
  onComplete,
}: UseVoiceSessionOptions): UseVoiceSessionReturn {
  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const promptIndex = useRef(0);
  const transcriptRef = useRef<string[]>([]);

  const prompts = context === 'onboarding' ? ONBOARDING_PROMPTS : MATCHMAKER_PROMPTS;

  const addMessage = useCallback((msg: VoiceMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const addAssistantReply = useCallback(
    (text: string) => {
      addMessage({ id: msgId(), role: 'assistant', text, streaming: false });
    },
    [addMessage],
  );

  const start = useCallback(async () => {
    setStatus('connecting');
    const backend = getBackend();
    const session = useSessionStore.getState().session;
    if (!session) throw new Error('Not authenticated');

    const voiceSession = await backend.createVoiceSession(session.userId, context);

    if (voiceSession.mode === 'text') {
      setStatus('active');
      promptIndex.current = 0;
      transcriptRef.current = [];
      setMessages([]);
      const greeting = prompts[0];
      addAssistantReply(greeting);
      promptIndex.current = 1;
    }
    // Production WebSocket mode would be handled here:
    // connect to REALTIME_API_URL with voiceSession.ephemeralToken
  }, [context, prompts, addAssistantReply]);

  const sendText = useCallback(
    (text: string) => {
      if (status !== 'active') return;
      const trimmed = text.trim();
      if (!trimmed) return;

      addMessage({ id: msgId(), role: 'user', text: trimmed, streaming: false });
      transcriptRef.current.push(`User: ${trimmed}`);

      // Respond with next scripted prompt or a closing message
      const idx = promptIndex.current;
      if (idx < prompts.length) {
        const reply = prompts[idx];
        transcriptRef.current.push(`Matchmaker: ${reply}`);
        setTimeout(() => addAssistantReply(reply), 600);
        promptIndex.current = idx + 1;
      }
    },
    [status, prompts, addMessage, addAssistantReply],
  );

  const end = useCallback(async () => {
    setStatus('ended');
    const backend = getBackend();
    const session = useSessionStore.getState().session;
    if (!session) return [];

    const transcript = transcriptRef.current.join('\n');
    if (!transcript) return [];

    const { createdClaims } = await backend.processVoiceTranscript(session.userId, transcript);
    onComplete?.(createdClaims);
    return createdClaims;
  }, [onComplete]);

  return { status, messages, sendText, start, end };
}
