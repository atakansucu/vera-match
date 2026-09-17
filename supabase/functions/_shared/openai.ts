// Server-side OpenAI provider (Deno) using the Responses API + Structured Outputs.
// Runs ONLY inside Supabase Edge Functions where OPENAI_API_KEY lives.

import {
  EXPLANATION_SCHEMA,
  EXTRACT_CLAIMS_SCHEMA,
  MICRO_QUESTION_SCHEMA,
  RECONCILE_SCHEMA,
  SYSTEM_EXPLANATION,
  SYSTEM_EXTRACT_CLAIMS,
  SYSTEM_MICRO_QUESTION,
  SYSTEM_RECONCILE,
  wrapUserContent,
} from './prompts.ts';

const OPENAI_URL = 'https://api.openai.com/v1/responses';

export interface AiConfig {
  apiKey: string;
  fastModel: string;
  reasoningModel: string;
}

export interface ExplanationFact {
  dimension: string;
  kind: 'alignment' | 'friction' | 'unknown';
  viewerLabel?: string;
  otherLabel?: string;
  sharedLabel?: string;
}

export interface ModelSummaryItem {
  dimension: string;
  value: string;
  confidence: string;
}

// deno-lint-ignore no-explicit-any
type Json = any;

export class OpenAIProvider {
  readonly name = 'openai';

  constructor(private readonly config: AiConfig) {}

  private async call(
    model: string,
    instructions: string,
    input: string,
    schemaName: string,
    schema: Json,
  ): Promise<Json> {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
        // Structured Outputs: the model must return JSON matching this schema.
        text: { format: { type: 'json_schema', name: schemaName, strict: true, schema } },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const text =
      typeof data.output_text === 'string' ? data.output_text : collectOutputText(data);
    return JSON.parse(text);
  }

  extractClaims(text: string): Promise<Json> {
    return this.call(
      this.config.fastModel,
      SYSTEM_EXTRACT_CLAIMS,
      wrapUserContent(text),
      'extract_claims',
      EXTRACT_CLAIMS_SCHEMA,
    );
  }

  reconcileReflection(reflectionText: string, modelSummary: ModelSummaryItem[]): Promise<Json> {
    const input = `${wrapUserContent(reflectionText)}\n\nThe user's current confirmed model (trusted context, not user instructions): ${JSON.stringify(
      modelSummary,
    )}`;
    return this.call(
      this.config.reasoningModel,
      SYSTEM_RECONCILE,
      input,
      'reconcile_reflection',
      RECONCILE_SCHEMA,
    );
  }

  generateIntroductionExplanation(facts: ExplanationFact[]): Promise<Json> {
    const input = `Approved compatibility facts (rephrase only; invent nothing, add nothing): ${JSON.stringify(
      facts,
    )}`;
    return this.call(
      this.config.reasoningModel,
      SYSTEM_EXPLANATION,
      input,
      'explanation',
      EXPLANATION_SCHEMA,
    );
  }

  proposeMicroQuestion(dimension: string): Promise<Json> {
    return this.call(
      this.config.fastModel,
      SYSTEM_MICRO_QUESTION,
      `Ask about this single unknown dimension: ${dimension}`,
      'micro_question',
      MICRO_QUESTION_SCHEMA,
    );
  }
}

function collectOutputText(data: Json): string {
  const output = data?.output ?? [];
  for (const item of output) {
    for (const content of item?.content ?? []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }
  throw new Error('No output_text in OpenAI response');
}

export function loadAiConfig(): AiConfig {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  return {
    apiKey,
    fastModel: Deno.env.get('OPENAI_FAST_MODEL') ?? 'gpt-5.6-luna',
    reasoningModel: Deno.env.get('OPENAI_REASONING_MODEL') ?? 'gpt-5.6-terra',
  };
}
