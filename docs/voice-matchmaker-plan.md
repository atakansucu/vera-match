# Voice Matchmaker — Implementation Plan

## Goal

Replace the static form-based onboarding and text-only matchmaker with a voice-first
conversational experience using OpenAI's Realtime API.

## UX Flow

### Hybrid Onboarding
1. **Form steps (kept):** age/DOB, gender, area, partner preference + consent (legal requirements)
2. **Voice transition:** after the essentials, the matchmaker says hello and starts a natural
   conversation about relationship goals, lifestyle, communication style
3. **Claim extraction:** the AI extracts claims from the conversation (all start as `unconfirmed`)
4. **Photos + consent:** after the conversation, finish with photos and AI consent (form)

### Matchmaker Tab (always available)
- Large "Talk to your matchmaker" button
- Tap → opens voice conversation
- User speaks naturally, matchmaker responds with voice
- Claims extracted and surfaced for confirmation
- Text fallback always available

## Architecture

### Trust Boundary (AGENTS.md compliant)

```
App (no secrets)                    Server (secrets)
┌──────────────┐                   ┌──────────────────┐
│ VoiceChat    │ ── request ──►    │ Edge Function    │
│ component    │ ◄── token ────    │ ai-realtime-     │
│              │                   │ session          │
│ WebSocket ───┼──────────────────►│                  │
│ to OpenAI    │ (ephemeral token) │ Creates session  │
│ Realtime API │                   │ with system      │
│              │                   │ prompt + config  │
└──────────────┘                   └──────────────────┘
```

1. App requests an ephemeral token from the server (authenticated)
2. Server creates a Realtime API session with the system prompt and config
3. Server returns the ephemeral token to the app
4. App connects directly to OpenAI Realtime API via WebSocket
5. API key never reaches the app — only the ephemeral token

### For DevBackend (no OpenAI key)

Since the dev environment has no OpenAI key, the voice experience uses a
text-based simulation:
- User types (or we mock voice input as text)
- MockAIProvider processes the text via `extractClaims`
- Responses are displayed as text (no TTS in dev mode)
- The same conversation UI works for both modes

### Packages

- `expo-av` — audio recording and playback on device
- Native `WebSocket` — connection to OpenAI Realtime API (built into React Native)

### New Files

- `src/features/voice/VoiceChat.tsx` — voice conversation component
- `src/features/voice/useVoiceSession.ts` — WebSocket + audio management hook
- `src/features/voice/realtimeProtocol.ts` — OpenAI Realtime API message types
- `src/features/voice/TextChat.tsx` — text fallback for dev mode
- `src/app/voice.tsx` — standalone voice conversation screen
- `supabase/functions/ai-realtime-session/index.ts` — ephemeral token endpoint

### Modified Files

- `src/app/onboarding/steps.tsx` — insert voice conversation after dealbreakers step
- `src/app/(tabs)/matchmaker.tsx` — add "Talk to your matchmaker" button
- `src/services/backend/types.ts` — new `createVoiceSession` method
- `src/services/backend/devBackend.ts` — text-based voice session simulation

## Conversation Design

### Onboarding Conversation (system prompt)

The matchmaker:
1. Introduces itself briefly
2. Asks about relationship goals naturally
3. Explores communication and lifestyle preferences
4. Picks up on what the user says, asks follow-ups
5. Wraps up after 3-5 minutes

Claims are extracted from the transcript and presented for confirmation.

### Ongoing Matchmaker Conversations

The matchmaker:
1. References what it already knows
2. Asks contextual questions based on recent activity
3. Discusses recent introductions or reflections
4. Proposes revised hypotheses
5. Always humble and curious

## Privacy

- Voice audio is streamed and NOT stored
- Only the text transcript is processed for claim extraction
- Transcript is treated as private reflection data (same privacy level)
- System prompt includes injection defense
- No private data from other users is included in the conversation
