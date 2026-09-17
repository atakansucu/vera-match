// POST { text, source } -> { claims } (unconfirmed hypotheses).
import { corsHeaders, getUser, json, logUsage } from '../_shared/http.ts';
import { loadAiConfig, OpenAIProvider } from '../_shared/openai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const config = loadAiConfig();
  const provider = new OpenAIProvider(config);
  const { text } = await req.json().catch(() => ({}));
  const started = Date.now();

  try {
    const result = await provider.extractClaims(text ?? '');
    await logUsage({
      userId: user.id,
      taskType: 'extract_claims',
      model: config.fastModel,
      latencyMs: Date.now() - started,
      success: true,
      errorCode: null,
    });
    return json(result);
  } catch (_error) {
    await logUsage({
      userId: user.id,
      taskType: 'extract_claims',
      model: config.fastModel,
      latencyMs: Date.now() - started,
      success: false,
      errorCode: 'ai_error',
    });
    return json({ claims: [] });
  }
});
