import { useCallback, useRef, useState } from 'react';

import { env } from '@/lib/env';
import { getBackend } from '@/services/backend';
import { useSessionStore } from '@/state/session';
import type { Claim } from '@/types/domain';

import type { VoiceMessage } from './realtimeProtocol';

// ---------------------------------------------------------------------------
// Simulated matchmaker responses for the text-based dev mode (no server).
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
  /** Called when a complete sentence is available during streaming, for early TTS. */
  onSentence?: (sentence: string) => void;
  /** Called when the server-side stream finishes (all sentences emitted via onSentence). */
  onStreamingDone?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseVoiceSessionReturn {
  status: VoiceSessionStatus;
  messages: VoiceMessage[];
  sendText: (text: string) => void;
  start: () => Promise<void>;
  end: () => Promise<Claim[]>;
  /** Whether connected to real LLM or using text simulation. */
  isLive: boolean;
  /** Update displayed text of the current streaming message (for TTS-synced reveal). */
  updateStreamingText: (text: string) => void;
  /** Mark the current streaming message as complete (for TTS-synced reveal). */
  finalizeStreaming: () => void;
}

let msgCounter = 0;
function msgId(): string {
  msgCounter += 1;
  return `vmsg-${Date.now().toString(36)}-${msgCounter}`;
}

/**
 * Hook that manages a voice matchmaker conversation.
 *
 * When EXPO_PUBLIC_DEV_REALTIME_URL is set, sends chat messages to the local
 * dev AI server which proxies OpenAI Chat Completions with streaming.
 * Otherwise falls back to scripted text simulation.
 */
export function useVoiceSession({
  context,
  onComplete,
  onSentence,
  onStreamingDone,
}: UseVoiceSessionOptions): UseVoiceSessionReturn {
  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isLive, setIsLive] = useState(false);
  const promptIndex = useRef(0);
  const transcriptRef = useRef<string[]>([]);
  const chatHistoryRef = useRef<ChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);

  const prompts = context === 'onboarding' ? ONBOARDING_PROMPTS : MATCHMAKER_PROMPTS;
  const serverUrl = env.devRealtimeUrl;

  const addMessage = useCallback((msg: VoiceMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const addAssistantReply = useCallback(
    (text: string) => {
      addMessage({ id: msgId(), role: 'assistant', text, streaming: false });
    },
    [addMessage],
  );

  // -----------------------------------------------------------------------
  // Streaming chat completion via local dev server
  // -----------------------------------------------------------------------

  const streamChat = useCallback(
    async (history: ChatMessage[]) => {
      if (!serverUrl) return;

      const id = msgId();
      streamingMsgIdRef.current = id;

      // When onSentence is provided (live TTS sync mode), text is revealed
      // externally via updateStreamingText — we buffer silently here.
      const syncMode = !!onSentence;

      // Add empty streaming message
      setMessages((prev) => [
        ...prev,
        { id, role: 'assistant', text: '', streaming: true },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${serverUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, messages: history }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id
                ? { ...m, text: 'Sorry, I had a connection issue. Could you try again?', streaming: false }
                : m,
            ),
          );
          streamingMsgIdRef.current = null;
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let sentenceBuf = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data) as { delta?: string };
              if (parsed.delta) {
                fullText += parsed.delta;
                sentenceBuf += parsed.delta;

                if (!syncMode) {
                  const captured = fullText;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === id ? { ...m, text: captured } : m,
                    ),
                  );
                }

                // Detect sentence boundary and fire early TTS
                const sentenceEnd = sentenceBuf.match(/[.!?]\s/);
                if (sentenceEnd && onSentence) {
                  const idx = sentenceEnd.index! + 1;
                  const sentence = sentenceBuf.slice(0, idx).trim();
                  sentenceBuf = sentenceBuf.slice(idx);
                  if (sentence.length > 5) onSentence(sentence);
                }
              }
            } catch {
              // skip malformed chunks
            }
          }
        }

        // Send any remaining text as the final sentence
        if (sentenceBuf.trim() && onSentence) {
          onSentence(sentenceBuf.trim());
        }

        if (syncMode) {
          onStreamingDone?.();
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, streaming: false } : m)),
          );
          streamingMsgIdRef.current = null;
        }

        if (fullText) {
          transcriptRef.current.push(`Matchmaker: ${fullText}`);
          chatHistoryRef.current.push({ role: 'assistant', content: fullText });
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id
                ? { ...m, text: 'Connection lost. Try ending and restarting.', streaming: false }
                : m,
            ),
          );
        }
        streamingMsgIdRef.current = null;
      } finally {
        abortRef.current = null;
      }
    },
    [serverUrl, context, onSentence, onStreamingDone],
  );

  const updateStreamingText = useCallback((text: string) => {
    const id = streamingMsgIdRef.current;
    if (!id) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text } : m)),
    );
  }, []);

  const finalizeStreaming = useCallback(() => {
    const id = streamingMsgIdRef.current;
    if (!id) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, streaming: false } : m)),
    );
    streamingMsgIdRef.current = null;
  }, []);

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  const start = useCallback(async () => {
    setStatus('connecting');
    setMessages([]);
    promptIndex.current = 0;
    transcriptRef.current = [];
    chatHistoryRef.current = [];

    if (serverUrl) {
      // Check if server is reachable
      try {
        const healthRes = await fetch(`${serverUrl}/health`, { method: 'GET' });
        if (healthRes.ok) {
          setStatus('active');
          setIsLive(true);
          // Get initial greeting from AI
          await streamChat([]);
          return;
        }
      } catch {
        // Server not reachable, fall through to simulation
      }
    }

    // Text simulation fallback
    setStatus('active');
    setIsLive(false);
    const greeting = prompts[0];
    addAssistantReply(greeting);
    promptIndex.current = 1;
  }, [serverUrl, prompts, addAssistantReply, streamChat]);

  const sendText = useCallback(
    (text: string) => {
      if (status !== 'active') return;
      const trimmed = text.trim();
      if (!trimmed) return;

      addMessage({ id: msgId(), role: 'user', text: trimmed, streaming: false });
      transcriptRef.current.push(`User: ${trimmed}`);

      if (isLive) {
        chatHistoryRef.current.push({ role: 'user', content: trimmed });
        void streamChat([...chatHistoryRef.current]);
      } else {
        const idx = promptIndex.current;
        if (idx < prompts.length) {
          const reply = prompts[idx];
          transcriptRef.current.push(`Matchmaker: ${reply}`);
          setTimeout(() => addAssistantReply(reply), 600);
          promptIndex.current = idx + 1;
        }
      }
    },
    [status, isLive, prompts, addMessage, addAssistantReply, streamChat],
  );

  const end = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();

    setStatus('ended');
    const backend = getBackend();
    const session = useSessionStore.getState().session;
    if (!session) return [];

    const transcript = transcriptRef.current.join('\n');
    if (!transcript) return [];

    // When connected to the live server, use GPT-powered deep analysis.
    // The server returns structured insights that we pass to the backend
    // as a "thought" containing all extracted info, so claims are created.
    if (isLive && serverUrl) {
      try {
        const analyzeRes = await fetch(`${serverUrl}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, modelSummary: [] }),
        });
        if (analyzeRes.ok) {
          const analysis = (await analyzeRes.json()) as {
            insights: { dimension: string; value: string; evidence: string }[];
            summary: string;
          };
          if (analysis.insights?.length > 0) {
            // Feed each insight as a separate thought to create unconfirmed claims.
            // This uses the existing shareThought→extractClaims pipeline.
            const allClaims: Claim[] = [];
            for (const insight of analysis.insights) {
              const text = `${insight.evidence} (${insight.dimension}: ${insight.value})`;
              const { createdClaims } = await backend.shareThought(session.userId, text);
              allClaims.push(...createdClaims);
            }
            // If keyword extraction missed some, also try the full transcript
            if (allClaims.length === 0) {
              const { createdClaims } = await backend.shareThought(session.userId, transcript);
              allClaims.push(...createdClaims);
            }
            onComplete?.(allClaims);
            return allClaims;
          }
        }
      } catch {
        // Fall through to basic processing
      }
    }

    const { createdClaims } = await backend.shareThought(session.userId, transcript);
    onComplete?.(createdClaims);
    return createdClaims;
  }, [onComplete, isLive, serverUrl]);

  return { status, messages, sendText, start, end, isLive, updateStreamingText, finalizeStreaming };
}
