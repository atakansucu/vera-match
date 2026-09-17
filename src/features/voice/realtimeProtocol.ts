/**
 * Type definitions for the OpenAI Realtime API WebSocket protocol.
 *
 * Only the subset used by Kindred is typed here — the full spec lives at
 * https://platform.openai.com/docs/api-reference/realtime
 *
 * The app connects via an ephemeral token obtained server-side so the API key
 * never reaches the client (see AGENTS.md trust boundary).
 */

// ---------------------------------------------------------------------------
// Client → Server events
// ---------------------------------------------------------------------------

export interface SessionUpdateEvent {
  type: 'session.update';
  session: {
    modalities?: ('text' | 'audio')[];
    instructions?: string;
    voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
    input_audio_format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
    output_audio_format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
    turn_detection?: {
      type: 'server_vad';
      threshold?: number;
      prefix_padding_ms?: number;
      silence_duration_ms?: number;
    } | null;
    temperature?: number;
    max_response_output_tokens?: number | 'inf';
  };
}

export interface InputAudioBufferAppendEvent {
  type: 'input_audio_buffer.append';
  audio: string; // base64 encoded PCM16
}

export interface InputAudioBufferCommitEvent {
  type: 'input_audio_buffer.commit';
}

export interface ConversationItemCreateEvent {
  type: 'conversation.item.create';
  item: {
    type: 'message';
    role: 'user';
    content: { type: 'input_text'; text: string }[];
  };
}

export interface ResponseCreateEvent {
  type: 'response.create';
  response?: {
    modalities?: ('text' | 'audio')[];
  };
}

export type ClientEvent =
  | SessionUpdateEvent
  | InputAudioBufferAppendEvent
  | InputAudioBufferCommitEvent
  | ConversationItemCreateEvent
  | ResponseCreateEvent;

// ---------------------------------------------------------------------------
// Server → Client events
// ---------------------------------------------------------------------------

export interface SessionCreatedEvent {
  type: 'session.created';
  session: { id: string };
}

export interface SessionUpdatedEvent {
  type: 'session.updated';
  session: { id: string };
}

export interface ResponseAudioDeltaEvent {
  type: 'response.audio.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string; // base64 encoded audio
}

export interface ResponseAudioDoneEvent {
  type: 'response.audio.done';
  response_id: string;
  item_id: string;
}

export interface ResponseAudioTranscriptDeltaEvent {
  type: 'response.audio_transcript.delta';
  response_id: string;
  delta: string;
}

export interface ResponseAudioTranscriptDoneEvent {
  type: 'response.audio_transcript.done';
  response_id: string;
  transcript: string;
}

export interface ResponseTextDeltaEvent {
  type: 'response.text.delta';
  response_id: string;
  delta: string;
}

export interface ResponseTextDoneEvent {
  type: 'response.text.done';
  response_id: string;
  text: string;
}

export interface ResponseDoneEvent {
  type: 'response.done';
  response: {
    id: string;
    status: 'completed' | 'cancelled' | 'failed' | 'incomplete';
    output: {
      type: string;
      role?: string;
      content?: { type: string; text?: string; transcript?: string }[];
    }[];
  };
}

export interface InputAudioBufferSpeechStartedEvent {
  type: 'input_audio_buffer.speech_started';
}

export interface InputAudioBufferSpeechStoppedEvent {
  type: 'input_audio_buffer.speech_stopped';
}

export interface ConversationItemInputAudioTranscriptionCompletedEvent {
  type: 'conversation.item.input_audio_transcription.completed';
  item_id: string;
  transcript: string;
}

export interface ErrorEvent {
  type: 'error';
  error: { type: string; code: string; message: string };
}

export type ServerEvent =
  | SessionCreatedEvent
  | SessionUpdatedEvent
  | ResponseAudioDeltaEvent
  | ResponseAudioDoneEvent
  | ResponseAudioTranscriptDeltaEvent
  | ResponseAudioTranscriptDoneEvent
  | ResponseTextDeltaEvent
  | ResponseTextDoneEvent
  | ResponseDoneEvent
  | InputAudioBufferSpeechStartedEvent
  | InputAudioBufferSpeechStoppedEvent
  | ConversationItemInputAudioTranscriptionCompletedEvent
  | ErrorEvent;

// ---------------------------------------------------------------------------
// Conversation message (app-level abstraction)
// ---------------------------------------------------------------------------

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Set to true while the assistant is still generating. */
  streaming: boolean;
}

// ---------------------------------------------------------------------------
// Session configuration
// ---------------------------------------------------------------------------

export const REALTIME_API_URL = 'wss://api.openai.com/v1/realtime';
export const REALTIME_MODEL = 'gpt-4o-realtime-preview';
