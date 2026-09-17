/**
 * Supabase Edge Function: ai-realtime-session
 *
 * Creates an ephemeral token for the OpenAI Realtime API. The API key lives
 * ONLY on the server (see AGENTS.md trust boundary). The client receives a
 * short-lived token that grants access to a single session.
 *
 * POST /ai-realtime-session
 * Body: { context: "onboarding" | "matchmaker" }
 * Response: { ephemeralToken: string, mode: "voice", context: string }
 */

// @ts-expect-error — Deno edge runtime import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_REALTIME_MODEL = Deno.env.get('OPENAI_REALTIME_MODEL') ?? 'gpt-4o-realtime-preview';

const ONBOARDING_INSTRUCTIONS = `You are Kindred's matchmaker — calm, curious, and brief.
You are having your first conversation with a new user during onboarding.

Your goal:
1. Introduce yourself warmly but briefly.
2. Ask about their relationship goals naturally.
3. Explore communication style and lifestyle preferences through follow-up questions.
4. Listen actively and pick up on what they say.
5. Wrap up after 3-5 minutes.

Rules:
- Be direct and humble. No therapy language, no fake enthusiasm.
- Do not diagnose attachment style, trauma, or mental illness.
- Do not mention compatibility scores or percentages.
- Keep responses short (2-3 sentences max).
- Everything the user shares is private and stays between you.
- You are gathering information, not giving advice.`;

const MATCHMAKER_INSTRUCTIONS = `You are Kindred's matchmaker — calm, curious, and brief.
You already know this user. This is an ongoing conversation.

Your goal:
1. Ask what's on their mind about dating.
2. Listen for shifts in preferences or new insights.
3. Explore naturally with follow-up questions.
4. Be curious about experiences and feelings, not interrogating.

Rules:
- Be direct and humble. No therapy language, no fake enthusiasm.
- Do not diagnose attachment style, trauma, or mental illness.
- Do not mention compatibility scores or percentages.
- Keep responses short (2-3 sentences max).
- Everything the user shares is private.`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured on server' }),
      { status: 500 },
    );
  }

  try {
    const body = await req.json();
    const context: string = body.context ?? 'matchmaker';
    const instructions =
      context === 'onboarding' ? ONBOARDING_INSTRUCTIONS : MATCHMAKER_INSTRUCTIONS;

    // Request an ephemeral token from OpenAI
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_REALTIME_MODEL,
        voice: 'sage',
        instructions,
        modalities: ['audio', 'text'],
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          silence_duration_ms: 800,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI session creation failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create realtime session' }),
        { status: 502 },
      );
    }

    const session = await response.json();

    return new Response(
      JSON.stringify({
        ephemeralToken: session.client_secret?.value ?? null,
        mode: 'voice' as const,
        context,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (error) {
    console.error('ai-realtime-session error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 },
    );
  }
});
