#!/usr/bin/env node
/**
 * Minimal local dev server that proxies OpenAI APIs for the voice matchmaker.
 * Reads OPENAI_API_KEY from ../.env so the secret never reaches the Expo app
 * bundle (AGENTS.md trust boundary).
 *
 * Usage:  node scripts/dev-realtime-server.mjs
 *
 * Endpoints:
 *   POST /chat        — streaming chat completion (SSE)
 *   POST /transcribe  — Whisper speech-to-text (multipart audio)
 *   POST /tts         — OpenAI TTS text-to-speech (returns audio/mpeg)
 *   GET  /health      — health check
 */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

function loadEnv() {
  try {
    const content = readFileSync(envPath, 'utf-8');
    const vars = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      vars[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim();
    }
    return vars;
  } catch {
    console.error('Could not read .env file at', envPath);
    process.exit(1);
  }
}

const env = loadEnv();
const OPENAI_API_KEY = env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY not found in .env');
  process.exit(1);
}

const MODEL = env.OPENAI_FAST_MODEL ?? 'gpt-4o-mini';
const TTS_MODEL = 'tts-1';
const TTS_VOICE = 'sage';
const PORT = 3001;

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const ONBOARDING_SYSTEM = `You are Kindred's matchmaker — calm, curious, and brief.
You are having your first conversation with a new user during onboarding.

Your goal:
1. Introduce yourself warmly but briefly (1-2 sentences).
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
- You are gathering information, not giving advice.
- Speak in the same language the user speaks to you.`;

const MATCHMAKER_SYSTEM = `You are Kindred's matchmaker — calm, curious, and brief.
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
- Everything the user shares is private.
- Speak in the same language the user speaks to you.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return globalThis.Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// POST /chat — streaming chat completion
// ---------------------------------------------------------------------------

async function handleChat(req, res) {
  const body = JSON.parse((await readBody(req)).toString() || '{}');
  const context = body.context ?? 'matchmaker';
  const history = body.messages ?? [];
  const systemPrompt = context === 'onboarding' ? ONBOARDING_SYSTEM : MATCHMAKER_SYSTEM;

  const messages = [{ role: 'system', content: systemPrompt }, ...history];
  console.log(`[chat/${context}] ${history.length} messages → ${MODEL}`);

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    console.error('OpenAI chat error:', openaiRes.status, errText);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `OpenAI returned ${openaiRes.status}` }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const reader = openaiRes.body.getReader();
  const decoder = new TextDecoder();
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
      if (data === '[DONE]') {
        res.write('data: [DONE]\n\n');
        continue;
      }
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      } catch { /* skip */ }
    }
  }
  res.end();
  console.log(`[chat/${context}] Done.`);
}

// ---------------------------------------------------------------------------
// POST /transcribe — Whisper speech-to-text
// ---------------------------------------------------------------------------

async function handleTranscribe(req, res) {
  const rawBody = await readBody(req);

  // Parse multipart boundary from content-type
  const contentType = req.headers['content-type'] ?? '';
  const boundaryMatch = contentType.match(/boundary=(.+)/);
  if (!boundaryMatch) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing multipart boundary' }));
    return;
  }

  console.log(`[transcribe] Received ${rawBody.length} bytes`);

  // Forward the raw multipart body to OpenAI Whisper
  const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': contentType,
    },
    body: rawBody,
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    console.error('Whisper error:', openaiRes.status, errText);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Whisper returned ${openaiRes.status}`, detail: errText }));
    return;
  }

  const result = await openaiRes.json();
  console.log(`[transcribe] "${result.text?.slice(0, 80)}..."`);
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ text: result.text }));
}

// ---------------------------------------------------------------------------
// POST /tts — OpenAI text-to-speech
// ---------------------------------------------------------------------------

async function handleTTS(req, res) {
  const body = JSON.parse((await readBody(req)).toString() || '{}');
  const text = body.text ?? '';

  if (!text) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing text' }));
    return;
  }

  console.log(`[tts] "${text.slice(0, 60)}..." → ${TTS_VOICE}`);

  const openaiRes = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: text,
      voice: TTS_VOICE,
      response_format: 'mp3',
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    console.error('TTS error:', openaiRes.status, errText);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `TTS returned ${openaiRes.status}` }));
    return;
  }

  const audioBuffer = await openaiRes.arrayBuffer();
  console.log(`[tts] Generated ${audioBuffer.byteLength} bytes of audio.`);

  res.writeHead(200, {
    'Content-Type': 'audio/mpeg',
    'Content-Length': audioBuffer.byteLength,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(globalThis.Buffer.from(audioBuffer));
}

// ---------------------------------------------------------------------------
// POST /analyze — deep conversation analysis for profile building
// ---------------------------------------------------------------------------

const ANALYZE_SYSTEM = `You are a careful profile analyst for a private dating matchmaker called Kindred.

You receive a transcript of a voice conversation between a user and their matchmaker.
Your job is to extract structured personality/preference insights from the conversation.

DIMENSIONS (you MUST use these exact keys):
- exclusivity_expectation: scale [open, flexible, exclusive]
- long_term_orientation: scale [casual, open, serious]
- activity_level: scale [low, moderate, high]
- social_frequency: scale [quiet, balanced, social]
- travel_tendency: scale [homebody, occasional, frequent]
- planning_style: scale [spontaneous, flexible, planner]
- alcohol: scale [none, social, regular]
- texting_frequency: scale [rarely, sometimes, daily]
- communication_directness: scale [indirect, balanced, direct]
- emotional_openness: scale [reserved, moderate, open]
- need_for_alone_time: scale [low, moderate, high]
- independence: scale [togetherness, balanced, independent]
- work_life_balance: scale [work_focused, balanced, life_focused]
- conflict_style: scale [avoidant, balanced, addresses_directly]
- ambition: scale [relaxed, balanced, driven]

RULES:
- Only extract insights that the conversation actually supports. Do not invent.
- Use the exact dimension keys and scale values above.
- The "value" must be one of the scale values for that dimension.
- Set claimType to "stated" if the user said it directly, "hypothesis" if inferred.
- Set signal to "strong" if clearly stated, "weak" if indirectly implied.
- Include an "evidence" field with a quote or close paraphrase from the transcript.
- Write a brief "rationale" explaining your reasoning in plain language.
- Do NOT diagnose attachment style, trauma, disorders, or mental illness.
- Do NOT invent dimensions outside the list above.
- Return at most 10 insights. Quality over quantity.
- Write the summary in the same language the user spoke in the conversation.

Respond with valid JSON matching this schema:
{
  "insights": [
    {
      "dimension": "<dimension_key>",
      "value": "<scale_value>",
      "claimType": "stated" | "hypothesis",
      "rationale": "<explanation>",
      "signal": "strong" | "weak",
      "evidence": "<quote from transcript>"
    }
  ],
  "summary": "<1-2 sentence matchmaker-style summary of what was learned>"
}`;

async function handleAnalyze(req, res) {
  const body = JSON.parse((await readBody(req)).toString() || '{}');
  const transcript = body.transcript ?? '';
  const modelSummary = body.modelSummary ?? [];

  if (!transcript) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing transcript' }));
    return;
  }

  const existingContext = modelSummary.length > 0
    ? `\n\nThe user's current confirmed profile:\n${modelSummary.map(s => `- ${s.dimension}: ${s.value} (${s.confidence})`).join('\n')}`
    : '';

  console.log(`[analyze] Analyzing transcript (${transcript.length} chars)...`);

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: ANALYZE_SYSTEM },
        {
          role: 'user',
          content: `Analyze this conversation transcript:${existingContext}\n\n---\n${transcript}\n---`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    console.error('Analyze error:', openaiRes.status, errText);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `OpenAI returned ${openaiRes.status}` }));
    return;
  }

  const result = await openaiRes.json();
  const content = result.choices?.[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(content);
    const insights = parsed.insights ?? [];
    const summary = parsed.summary ?? '';
    console.log(`[analyze] Extracted ${insights.length} insights.`);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ insights, summary }));
  } catch {
    console.error('[analyze] Failed to parse AI output:', content.slice(0, 200));
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid AI output' }));
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const server = createServer(async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === 'POST' && req.url === '/chat') return await handleChat(req, res);
    if (req.method === 'POST' && req.url === '/transcribe') return await handleTranscribe(req, res);
    if (req.method === 'POST' && req.url === '/tts') return await handleTTS(req, res);
    if (req.method === 'POST' && req.url === '/analyze') return await handleAnalyze(req, res);
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, model: MODEL }));
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  } catch (err) {
    console.error('Unhandled error:', err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }
});

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log(`║  Kindred Dev AI Server  (model: ${MODEL.padEnd(20)})   ║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  POST /chat        — streaming chat completion           ║`);
  console.log(`║  POST /transcribe  — Whisper speech-to-text              ║`);
  console.log(`║  POST /tts         — text-to-speech (mp3)                ║`);
  console.log(`║  POST /analyze     — deep conversation analysis          ║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  LAN:  http://${ip}:${PORT}                      ║`);
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
});
