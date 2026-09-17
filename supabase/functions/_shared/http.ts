// Shared HTTP helpers for Kindred Edge Functions (Deno): CORS, auth, usage logging.
import { createClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Resolves the authenticated user from the request JWT, or null. */
export async function getUser(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id };
}

function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

export interface UsageRecord {
  userId: string | null;
  taskType: string;
  model: string;
  latencyMs: number;
  success: boolean;
  errorCode: string | null;
}

/**
 * Best-effort AI usage logging. NEVER logs raw prompts — only task metadata for
 * cost/latency accounting.
 */
export async function logUsage(record: UsageRecord): Promise<void> {
  try {
    const client = serviceClient();
    await client.from('ai_usage_log').insert({
      user_id: record.userId,
      task_type: record.taskType,
      model: record.model,
      latency_ms: record.latencyMs,
      success: record.success,
      error_code: record.errorCode,
    });
  } catch (_error) {
    // Logging must never break the request.
  }
}
