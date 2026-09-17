import type { Dimension } from '@/types/domain';

export type DimensionGroup = 'intentions' | 'lifestyle' | 'communication' | 'dynamics';

export interface DimensionSpec {
  key: Dimension;
  group: DimensionGroup;
  /** Human-readable name for the "What my matchmaker knows" screen. */
  label: string;
  /** Ordered ordinal scale (index 0 = low end). */
  scale: readonly string[];
  /** Human labels per scale value. */
  valueLabels: Record<string, string>;
  /** Default importance 1..5 if the user has not told us otherwise. */
  defaultImportance: number;
  /** Sentence when both sides align (shared meaning). */
  alignmentPhrase: (sharedLabel: string) => string;
  /** Sentence describing possible friction, phrased for the viewer. */
  frictionPhrase: (viewerLabel: string, otherLabel: string) => string;
  /** Sentence when the trait is still unknown for the pair. */
  unknownPhrase: string;
}

/**
 * The focused MVP ontology. Every value is a similarity-based ordinal scale:
 * closeness implies alignment, distance implies possible friction. We keep this
 * intentionally small and non-clinical.
 */
export const DIMENSION_SPECS: Record<Dimension, DimensionSpec> = {
  exclusivity_expectation: {
    key: 'exclusivity_expectation',
    group: 'intentions',
    label: 'Exclusivity',
    scale: ['open', 'flexible', 'exclusive'],
    valueLabels: { open: 'open', flexible: 'flexible', exclusive: 'exclusive' },
    defaultImportance: 4,
    alignmentPhrase: (l) => `You both lean toward a ${l} relationship structure.`,
    frictionPhrase: (v, o) => `You lean ${v} about exclusivity while they lean ${o}.`,
    unknownPhrase: "I don't yet know how either of you feels about exclusivity.",
  },
  long_term_orientation: {
    key: 'long_term_orientation',
    group: 'intentions',
    label: 'Long-term orientation',
    scale: ['casual', 'open', 'serious'],
    valueLabels: { casual: 'casual', open: 'open-minded', serious: 'serious' },
    defaultImportance: 4,
    alignmentPhrase: (l) => `You're both ${l} about where a relationship could go.`,
    frictionPhrase: (v, o) => `You're more ${v} where they're more ${o} about pace.`,
    unknownPhrase: "I'm still learning how serious each of you wants things to be.",
  },
  activity_level: {
    key: 'activity_level',
    group: 'lifestyle',
    label: 'Activity level',
    scale: ['low', 'moderate', 'high'],
    valueLabels: { low: 'relaxed', moderate: 'moderately active', high: 'very active' },
    defaultImportance: 2,
    alignmentPhrase: (l) => `You share a ${l} pace of life.`,
    frictionPhrase: (v, o) => `Your day-to-day pace is ${v}; theirs is ${o}.`,
    unknownPhrase: "I don't yet know how active a lifestyle either of you prefers.",
  },
  social_frequency: {
    key: 'social_frequency',
    group: 'lifestyle',
    label: 'Social rhythm',
    scale: ['quiet', 'balanced', 'social'],
    valueLabels: { quiet: 'quiet', balanced: 'social but not packed', social: 'very social' },
    defaultImportance: 3,
    alignmentPhrase: (l) => `You both describe your ideal weekends as ${l}.`,
    frictionPhrase: (v, o) => `You prefer ${v} weekends; they prefer ${o} ones.`,
    unknownPhrase: "I'm not sure yet how social each of you likes to be.",
  },
  travel_tendency: {
    key: 'travel_tendency',
    group: 'lifestyle',
    label: 'Travel',
    scale: ['homebody', 'occasional', 'frequent'],
    valueLabels: {
      homebody: 'a homebody',
      occasional: 'an occasional traveller',
      frequent: 'a frequent traveller',
    },
    defaultImportance: 2,
    alignmentPhrase: (l) => `You're both ${l} at heart.`,
    frictionPhrase: (v, o) => `You're ${v} while they're ${o}.`,
    unknownPhrase: "I don't yet know how much travel matters to either of you.",
  },
  planning_style: {
    key: 'planning_style',
    group: 'lifestyle',
    label: 'Planning style',
    scale: ['spontaneous', 'flexible', 'planner'],
    valueLabels: { spontaneous: 'spontaneous', flexible: 'flexible', planner: 'a planner' },
    defaultImportance: 3,
    alignmentPhrase: (l) => `You both tend to be ${l}.`,
    frictionPhrase: (v, o) => `You tend to be ${v}; they're more ${o}.`,
    unknownPhrase: "I'm still learning whether planning styles matter to either of you.",
  },
  alcohol: {
    key: 'alcohol',
    group: 'lifestyle',
    label: 'Drinking',
    scale: ['none', 'social', 'regular'],
    valueLabels: { none: "don't drink", social: 'drink socially', regular: 'drink regularly' },
    defaultImportance: 2,
    alignmentPhrase: (l) => `You both ${l}.`,
    frictionPhrase: (v, o) => `You ${v} while they ${o}.`,
    unknownPhrase: "I don't yet know your drinking preferences.",
  },
  texting_frequency: {
    key: 'texting_frequency',
    group: 'communication',
    label: 'Texting frequency',
    scale: ['rarely', 'sometimes', 'daily'],
    valueLabels: { rarely: 'text rarely', sometimes: 'text sometimes', daily: 'text daily' },
    defaultImportance: 3,
    alignmentPhrase: (l) => `You both like to ${l} between seeing each other.`,
    frictionPhrase: (v, o) => `You'd ${v}; they'd prefer to ${o}.`,
    unknownPhrase: "I don't yet know how important texting frequency is to either of you.",
  },
  communication_directness: {
    key: 'communication_directness',
    group: 'communication',
    label: 'Directness',
    scale: ['indirect', 'balanced', 'direct'],
    valueLabels: { indirect: 'gentle and indirect', balanced: 'balanced', direct: 'direct' },
    defaultImportance: 3,
    alignmentPhrase: (l) => `You both communicate in a ${l} way.`,
    frictionPhrase: (v, o) => `You communicate ${v}; they're more ${o}.`,
    unknownPhrase: "I'm still learning how each of you likes to communicate.",
  },
  emotional_openness: {
    key: 'emotional_openness',
    group: 'communication',
    label: 'Emotional openness',
    scale: ['reserved', 'moderate', 'open'],
    valueLabels: {
      reserved: 'more reserved',
      moderate: 'moderately open',
      open: 'emotionally open',
    },
    defaultImportance: 3,
    alignmentPhrase: (l) => `You're both ${l} early on.`,
    frictionPhrase: (v, o) => `You're ${v}; they're ${o}.`,
    unknownPhrase: "I don't yet know how openly each of you shares feelings.",
  },
  need_for_alone_time: {
    key: 'need_for_alone_time',
    group: 'communication',
    label: 'Need for alone time',
    scale: ['low', 'moderate', 'high'],
    valueLabels: {
      low: 'little alone time',
      moderate: 'some alone time',
      high: 'a lot of alone time',
    },
    defaultImportance: 2,
    alignmentPhrase: (l) => `You both need ${l}.`,
    frictionPhrase: (v, o) => `You need ${v}; they need ${o}.`,
    unknownPhrase: "I'm not sure yet how much personal space each of you needs.",
  },
  independence: {
    key: 'independence',
    group: 'dynamics',
    label: 'Independence',
    scale: ['togetherness', 'balanced', 'independent'],
    valueLabels: {
      togetherness: 'a lot of togetherness',
      balanced: 'a balance of together and apart',
      independent: 'an independent relationship rather than constant contact',
    },
    defaultImportance: 3,
    alignmentPhrase: (l) => `You both value ${l}.`,
    frictionPhrase: (v, o) => `You value ${v}; they value ${o}.`,
    unknownPhrase: "I don't yet know how much independence each of you wants.",
  },
  work_life_balance: {
    key: 'work_life_balance',
    group: 'dynamics',
    label: 'Work-life balance',
    scale: ['work_focused', 'balanced', 'life_focused'],
    valueLabels: {
      work_focused: 'work-focused',
      balanced: 'balanced',
      life_focused: 'life-focused',
    },
    defaultImportance: 3,
    alignmentPhrase: (l) => `You both keep a ${l} approach to work.`,
    frictionPhrase: (v, o) => `You're more ${v}; they're more ${o}.`,
    unknownPhrase: "I'm still learning how each of you balances work and life.",
  },
  conflict_style: {
    key: 'conflict_style',
    group: 'dynamics',
    label: 'Handling disagreement',
    scale: ['avoidant', 'balanced', 'addresses_directly'],
    valueLabels: {
      avoidant: 'take space during conflict',
      balanced: 'a measured approach to conflict',
      addresses_directly: 'address disagreements directly',
    },
    defaultImportance: 3,
    alignmentPhrase: (l) => `You share ${l}.`,
    frictionPhrase: (v, o) => `You ${v}; they ${o}.`,
    unknownPhrase: "I don't yet know how each of you handles disagreement.",
  },
  ambition: {
    key: 'ambition',
    group: 'dynamics',
    label: 'Ambition',
    scale: ['relaxed', 'balanced', 'driven'],
    valueLabels: { relaxed: 'relaxed', balanced: 'balanced', driven: 'driven' },
    defaultImportance: 2,
    alignmentPhrase: (l) => `You're both ${l} about your goals.`,
    frictionPhrase: (v, o) => `You're ${v}; they're ${o} about goals.`,
    unknownPhrase: "I'm not sure yet how driven each of you is.",
  },
};

export function ordinalIndex(dimension: Dimension, value: string): number {
  return DIMENSION_SPECS[dimension].scale.indexOf(value);
}
