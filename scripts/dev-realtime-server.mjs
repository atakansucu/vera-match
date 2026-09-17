#!/usr/bin/env node
/**
 * Minimal local dev server that proxies OpenAI chat completions for the
 * voice matchmaker. Reads OPENAI_API_KEY from ../.env so the secret never
 * reaches the Expo app bundle (AGENTS.md trust boundary).
 *
 * Usage:  node scripts/dev-realtime-server.mjs
 *
 * Endpoints:
 *   POST /chat  — streaming chat completion (SSE)
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
const PORT = 3001;

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

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
}

async function handleChat(req, res) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw || '{}');

  const context = body.context ?? 'matchmaker';
  const history = body.messages ?? [];
  const systemPrompt = context === 'onboarding' ? ONBOARDING_SYSTEM : MATCHMAKER_SYSTEM;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];

  console.log(`[${context}] ${history.length} messages, calling ${MODEL}...`);

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
    console.error('OpenAI error:', openaiRes.status, errText);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `OpenAI returned ${openaiRes.status}` }));
    return;
  }

  // Stream SSE to the client
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
        if (delta) {
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  res.end();
  console.log(`[${context}] Response complete.`);
}

const server = createServer(async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/chat') {
    try {
      await handleChat(req, res);
    } catch (err) {
      console.error('Error:', err.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, model: MODEL }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
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
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║  Kindred Dev AI Server  (model: ${MODEL.padEnd(20)})  ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Local:  http://localhost:${PORT}                          ║`);
  console.log(`║  LAN:    http://${ip}:${PORT}                     ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  .env:   EXPO_PUBLIC_DEV_REALTIME_URL=http://${ip}:${PORT}  ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});
