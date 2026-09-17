// POST { reflectionText, modelSummary } -> { proposals } (revision hypotheses).
// The reflection itself is already stored by the app before this is called, so a
// failure here never loses user input.
import { corsHeaders, getUser, json, logUsage } from '../_shared/http.ts';
import { loadAiConfig, OpenAIProvider } from '../_shared/openai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const config = loadAiConfig();
  const provider = new OpenAIProvider(config);
  const { reflectionText, modelSummary } = await req.json().catch(() => ({}));
  const started = Date.now();

  try {
    const result = await provider.reconcileReflection(reflectionText ?? '', modelSummary ?? []);
    await logUsage({
      userId: user.id,
      taskType: 'reconcile_reflection',
      model: config.reasoningModel,
      latencyMs: Date.now() - started,
      success: true,
      errorCode: null,
    });
    return json(result);
  } catch (_error) {
    await logUsage({
      userId: user.id,
      taskType: 'reconcile_reflection',
      model: config.reasoningModel,
      latencyMs: Date.now() - started,
      success: false,
      errorCode: 'ai_error',
    });
    // Degrade gracefully: no proposals rather than a hard failure.
    return json({ proposals: [] });
  }
});
