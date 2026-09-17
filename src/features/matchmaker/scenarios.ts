import type { Dimension, MicroScenario } from '@/types/domain';

export interface ScenarioTemplate {
  id: string;
  targetDimension: Dimension;
  scenarioType: string;
  prompt: string;
  options: { label: string; value: string }[];
}

/**
 * Predefined scenario templates. Each maps to a dimension and produces a claim
 * value. These are NOT random quizzes — they are surfaced only when the answer
 * has genuine matching value.
 */
export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'saturday-spontaneous',
    targetDimension: 'planning_style',
    scenarioType: 'partner_text',
    prompt: 'It\'s Saturday morning. Your partner texts:\n\n"Pack a bag. Let\'s drive somewhere for the weekend."',
    options: [
      { label: "I'm in.", value: 'spontaneous' },
      { label: 'Depends where.', value: 'flexible' },
      { label: "I'd rather plan first.", value: 'planner' },
    ],
  },
  {
    id: 'terrible-day',
    targetDimension: 'need_for_alone_time',
    scenarioType: 'emotional_need',
    prompt: "You've had a terrible day. What usually feels best?",
    options: [
      { label: 'Give me some space.', value: 'high' },
      { label: 'Check in with me.', value: 'moderate' },
      { label: 'Come see me.', value: 'low' },
    ],
  },
  {
    id: 'energy-attraction',
    targetDimension: 'planning_style',
    scenarioType: 'preference',
    prompt: 'Which energy usually attracts you more?',
    options: [
      { label: 'Has a plan for everything.', value: 'planner' },
      { label: "We'll figure it out.", value: 'spontaneous' },
    ],
  },
  {
    id: 'weekend-social',
    targetDimension: 'social_frequency',
    scenarioType: 'lifestyle',
    prompt: "Your ideal Saturday night — honestly?",
    options: [
      { label: 'Home, quiet, recharging.', value: 'quiet' },
      { label: 'Dinner with a few friends.', value: 'balanced' },
      { label: 'Full social calendar.', value: 'social' },
    ],
  },
  {
    id: 'texting-rhythm',
    targetDimension: 'texting_frequency',
    scenarioType: 'communication',
    prompt: "You've been seeing someone for a few weeks. A day goes by without a text. How do you feel?",
    options: [
      { label: 'Totally fine — I prefer space.', value: 'rarely' },
      { label: 'I notice but it doesn\'t bother me.', value: 'sometimes' },
      { label: "I'd wonder if something's wrong.", value: 'daily' },
    ],
  },
  {
    id: 'conflict-approach',
    targetDimension: 'conflict_style',
    scenarioType: 'relationship',
    prompt: "Something your partner said bothered you. It's been a few hours. What do you usually do?",
    options: [
      { label: 'Let it go unless it keeps happening.', value: 'avoidant' },
      { label: 'Bring it up when the timing feels right.', value: 'balanced' },
      { label: 'Address it directly — the sooner the better.', value: 'addresses_directly' },
    ],
  },
  {
    id: 'independence-weekend',
    targetDimension: 'independence',
    scenarioType: 'lifestyle',
    prompt: "You've been dating someone for a month. They suggest spending the entire weekend together — Friday through Sunday.",
    options: [
      { label: "That sounds perfect.", value: 'togetherness' },
      { label: 'One full day together, then some solo time.', value: 'balanced' },
      { label: "I'd need at least one day to myself.", value: 'independent' },
    ],
  },
  {
    id: 'ambition-dinner',
    targetDimension: 'ambition',
    scenarioType: 'preference',
    prompt: "At dinner, someone talks passionately about their big career goals for 20 minutes. How does that land?",
    options: [
      { label: 'Inspiring — I love that energy.', value: 'driven' },
      { label: "Interesting, but I'd want to hear about other things too.", value: 'balanced' },
      { label: "It's a lot. I'd prefer someone more laid-back.", value: 'relaxed' },
    ],
  },
];

const MAX_SCENARIOS_PER_WEEK = 3;

/**
 * Selects a relevant micro-scenario for the user, or null if none is appropriate.
 * Only picks a scenario when:
 * 1. The target dimension is unknown or low-confidence for this user
 * 2. The weekly frequency limit is not exceeded
 * 3. The specific scenario hasn't been asked recently
 */
export function selectScenario(
  confirmedDimensions: Set<Dimension>,
  recentScenarioCount: number,
  answeredScenarioIds: Set<string>,
): ScenarioTemplate | null {
  if (recentScenarioCount >= MAX_SCENARIOS_PER_WEEK) return null;

  for (const template of SCENARIO_TEMPLATES) {
    if (confirmedDimensions.has(template.targetDimension)) continue;
    if (answeredScenarioIds.has(template.id)) continue;
    return template;
  }

  return null;
}

export function scenarioToMicroScenario(
  userId: string,
  template: ScenarioTemplate,
): MicroScenario {
  return {
    id: `scenario-${userId}-${template.id}`,
    userId,
    targetDimension: template.targetDimension,
    scenarioType: template.scenarioType,
    prompt: template.prompt,
    options: template.options,
    reason: `This could help me understand your ${template.targetDimension.replace(/_/g, ' ')}.`,
    candidateId: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    answeredAt: null,
  };
}
