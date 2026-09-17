import { DIMENSION_SPECS } from '@/features/matching/dimensions';
import type { Dimension } from '@/types/domain';

import {
  analyzeConversationOutputSchema,
  explanationOutputSchema,
  extractClaimsOutputSchema,
  microQuestionOutputSchema,
  reconcileReflectionOutputSchema,
  summarizeOutputSchema,
  type AnalyzeConversationOutput,
  type ConversationInsight,
  type ExplanationOutput,
  type ExtractClaimsOutput,
  type MicroQuestionOutput,
  type ProposedClaim,
  type ReconcileReflectionOutput,
  type RevisionProposal,
  type SummarizeOutput,
} from './schemas';
import type {
  AIProvider,
  AnalyzeConversationInput,
  ExplanationInput,
  ExtractClaimsInput,
  MicroQuestionInput,
  ReconcileReflectionInput,
  SummarizeInput,
} from './types';

interface KeywordRule {
  pattern: RegExp;
  dimension: Dimension;
  value: string;
  rationale: string;
  question: string;
}

/**
 * Deterministic keyword rules. This is intentionally simple: the mock exists so
 * the app and tests run without a live model. It never fabricates precise
 * confidence numbers and always yields hypotheses (never confirmed truth).
 */
const RULES: KeywordRule[] = [
  {
    pattern: /\b(plan|planning|spontane|last-?minute|schedule)\w*/i,
    dimension: 'planning_style',
    value: 'planner',
    rationale: 'You mentioned differing attitudes toward planning.',
    question:
      'It sounds like similar planning styles may matter more to you than I thought. Is that accurate?',
  },
  {
    pattern: /\b(work|job|career|ambitio|driven|hustle)\w*/i,
    dimension: 'work_life_balance',
    value: 'balanced',
    rationale: 'You noticed the conversation centred heavily on work.',
    question:
      'You may value ambition but prefer people whose identity is not dominated by work. Does that sound right?',
  },
  {
    pattern: /\b(text|texting|messag|reply|contact)\w*/i,
    dimension: 'texting_frequency',
    value: 'sometimes',
    rationale: 'You brought up how much day-to-day contact felt right.',
    question: 'It seems like texting rhythm matters to you. Should I weigh that more?',
  },
  {
    pattern: /\b(space|alone|independen|smother|clingy)\w*/i,
    dimension: 'independence',
    value: 'independent',
    rationale: 'You referred to needing space or independence.',
    question: 'It sounds like an independent dynamic matters to you. Is that fair?',
  },
  {
    pattern: /\b(open|guarded|vulnerab|reserved|emotion)\w*/i,
    dimension: 'emotional_openness',
    value: 'open',
    rationale: 'You reflected on emotional openness.',
    question: 'Emotional openness seemed to stand out for you. Should I keep that in mind?',
  },
];

function matchRules(text: string, limit: number): KeywordRule[] {
  const seen = new Set<Dimension>();
  const matched: KeywordRule[] = [];
  for (const rule of RULES) {
    if (matched.length >= limit) break;
    if (rule.pattern.test(text) && !seen.has(rule.dimension)) {
      seen.add(rule.dimension);
      matched.push(rule);
    }
  }
  return matched;
}

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  async extractClaims(input: ExtractClaimsInput): Promise<ExtractClaimsOutput> {
    const claims: ProposedClaim[] = matchRules(input.text, 3).map((rule) => ({
      dimension: rule.dimension,
      value: rule.value,
      claimType: 'hypothesis',
      rationale: rule.rationale,
    }));
    return extractClaimsOutputSchema.parse({ claims });
  }

  async reconcileReflection(input: ReconcileReflectionInput): Promise<ReconcileReflectionOutput> {
    const proposals: RevisionProposal[] = matchRules(input.reflectionText, 2).map((rule) => {
      const existing = input.modelSummary.find((m) => m.dimension === rule.dimension);
      return {
        dimension: rule.dimension,
        value: rule.value,
        previousValue: existing?.value ?? null,
        rationale: rule.rationale,
        question: rule.question,
      };
    });
    return reconcileReflectionOutputSchema.parse({ proposals });
  }

  async generateIntroductionExplanation(input: ExplanationInput): Promise<ExplanationOutput> {
    const alignment: string[] = [];
    const friction: string[] = [];
    const unknowns: string[] = [];

    for (const fact of input.facts) {
      const spec = DIMENSION_SPECS[fact.dimension];
      if (fact.kind === 'alignment' && alignment.length < 3) {
        alignment.push(spec.alignmentPhrase(fact.sharedLabel ?? fact.viewerLabel ?? ''));
      } else if (fact.kind === 'friction' && friction.length < 2) {
        friction.push(spec.frictionPhrase(fact.viewerLabel ?? '', fact.otherLabel ?? ''));
      } else if (fact.kind === 'unknown' && unknowns.length < 2) {
        unknowns.push(spec.unknownPhrase);
      }
    }

    return explanationOutputSchema.parse({ alignment, friction, unknowns });
  }

  async proposeMicroQuestion(input: MicroQuestionInput): Promise<MicroQuestionOutput> {
    const spec = DIMENSION_SPECS[input.dimension];
    const options = spec.scale.map((value) => ({
      label: capitalize(spec.valueLabels[value] ?? value),
      value,
    }));
    return microQuestionOutputSchema.parse({
      question: `When it comes to ${spec.label.toLowerCase()}, what fits you best?`,
      options,
    });
  }

  async summarizeRelationshipModel(input: SummarizeInput): Promise<SummarizeOutput> {
    if (input.items.length === 0) {
      return summarizeOutputSchema.parse({
        summary: "I'm still getting to know you. I'll learn the rest only when it becomes useful.",
      });
    }
    const parts = input.items
      .slice(0, 4)
      .map((item) => DIMENSION_SPECS[item.dimension].label.toLowerCase());
    return summarizeOutputSchema.parse({
      summary: `So far I have a sense of your ${parts.join(', ')}. I'll keep refining this as we go.`,
    });
  }

  async analyzeConversation(input: AnalyzeConversationInput): Promise<AnalyzeConversationOutput> {
    const insights: ConversationInsight[] = matchRules(input.transcript, 5).map((rule) => ({
      dimension: rule.dimension,
      value: rule.value,
      claimType: 'hypothesis' as const,
      rationale: rule.rationale,
      signal: 'weak' as const,
      evidence: `Keyword detected in conversation transcript.`,
    }));

    const summary =
      insights.length > 0
        ? `From our conversation, I picked up on ${insights.length} thing${insights.length > 1 ? 's' : ''} worth checking with you.`
        : 'We had a nice chat, but I want to learn more before drawing conclusions.';

    return analyzeConversationOutputSchema.parse({ insights, summary });
  }
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
}
