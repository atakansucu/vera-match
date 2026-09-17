// POST { facts } -> { alignment, friction, unknowns }.
// On failure returns 502 so the caller uses its deterministic fallback explanation
// (an eligible introduction is never blocked by AI).
import { corsHeaders, getUser, json, logUsage } from '../_shared/http.ts';
import { loadAiConfig, OpenAIProvider } from '../_shared/openai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const config = loadAiConfig();
  const provider = new OpenAIProvider(config);
  const { facts } = await req.json().catch(() => ({}));
  const started = Date.now();

  try {
    const result = await provider.generateIntroductionExplanation(facts ?? []);
    await logUsage({
      userId: user.id,
      taskType: 'generate_explanation',
      model: config.reasoningModel,
      latencyMs: Date.now() - started,
      success: true,
      errorCode: null,
    });
    return json(result);
  } catch (_error) {
    await logUsage({
      userId: user.id,
      taskType: 'generate_explanation',
      model: config.reasoningModel,
      latencyMs: Date.now() - started,
      success: false,
      errorCode: 'ai_error',
    });
    return json({ error: 'ai_error' }, 502);
  }
});
