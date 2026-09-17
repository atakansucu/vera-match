# Edge Functions — the AI trust boundary

These Deno functions are the **only** place OpenAI is called. Secrets
(`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) live here, never in the app.

| Function | Input | Output | Model |
| --- | --- | --- | --- |
| `ai-extract-claims` | `{ text, source }` | `{ claims }` | fast (`gpt-5.6-luna`) |
| `ai-reconcile-reflection` | `{ reflectionText, modelSummary }` | `{ proposals }` | reasoning (`gpt-5.6-terra`) |
| `ai-generate-explanation` | `{ facts }` | `{ alignment, friction, unknowns }` | reasoning |
| `ai-propose-micro-question` | `{ dimension }` | `{ question, options }` | fast |

## Guarantees

- **Auth:** every function resolves the caller from the request JWT and rejects anonymous calls.
- **Structured Outputs:** the OpenAI Responses API is called with a strict JSON Schema
  (`_shared/prompts.ts`), so the model must return well-formed, bounded output.
- **Prompt-injection defence:** user text is wrapped as `<user_content>` DATA and the system
  prompt instructs the model to ignore any instructions inside it (`_shared/prompts.ts`,
  `wrapUserContent`, `SYSTEM_GUARD`). Mirrors `src/services/ai/prompt.ts` (unit-tested).
- **Graceful failure:** extraction/reconciliation return empty results on error (user input is
  already stored, so nothing is lost); explanation returns 502 so the caller uses its deterministic
  fallback. An eligible introduction is never blocked by AI.
- **Cost instrumentation:** every call records task/model/latency/success to `ai_usage_log`.
  **Raw prompts are never logged.**

## Model routing

Config-driven via env: `OPENAI_FAST_MODEL` (default `gpt-5.6-luna`) for high-volume/cheap tasks,
`OPENAI_REASONING_MODEL` (default `gpt-5.6-terra`) for nuanced tasks. Never hard-coded in logic.

## Local development

```bash
supabase functions serve
supabase secrets set OPENAI_API_KEY=... \
  OPENAI_FAST_MODEL=gpt-5.6-luna OPENAI_REASONING_MODEL=gpt-5.6-terra
```

The mobile app never invokes these directly — the Supabase `Backend` implementation calls them via
`supabase.functions.invoke(...)`, re-validates the output against the Zod schemas in
`src/services/ai/schemas.ts`, and applies deterministic fallbacks. In local dev/preview the app
uses `DevBackend` + `MockAIProvider`, so no functions or keys are required.
