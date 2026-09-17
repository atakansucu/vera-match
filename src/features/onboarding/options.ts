import { DIMENSION_SPECS } from '@/features/matching/dimensions';
import type { ChildrenIntent, Dimension, Gender, RelationshipGoal } from '@/types/domain';

export const MUNICH_AREAS = [
  'Maxvorstadt',
  'Schwabing',
  'Glockenbachviertel',
  'Isarvorstadt',
  'Haidhausen',
  'Au',
  'Sendling',
  'Neuhausen',
  'Bogenhausen',
  'Lehel',
  'Ludwigsvorstadt',
  'Giesing',
] as const;

/** Approximate district centres (coarse; exact location is never collected). */
export const AREA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Maxvorstadt: { lat: 48.147, lng: 11.567 },
  Schwabing: { lat: 48.161, lng: 11.586 },
  Glockenbachviertel: { lat: 48.13, lng: 11.573 },
  Isarvorstadt: { lat: 48.128, lng: 11.567 },
  Haidhausen: { lat: 48.13, lng: 11.6 },
  Au: { lat: 48.123, lng: 11.58 },
  Sendling: { lat: 48.121, lng: 11.545 },
  Neuhausen: { lat: 48.155, lng: 11.54 },
  Bogenhausen: { lat: 48.15, lng: 11.62 },
  Lehel: { lat: 48.139, lng: 11.591 },
  Ludwigsvorstadt: { lat: 48.132, lng: 11.55 },
  Giesing: { lat: 48.111, lng: 11.593 },
};

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Non-binary' },
];

export const RELATIONSHIP_GOAL_OPTIONS: { value: RelationshipGoal; label: string }[] = [
  { value: 'life_partner', label: 'A life partner' },
  { value: 'long_term', label: 'A long-term relationship' },
  { value: 'short_term', label: 'Something more casual' },
  { value: 'unsure', label: 'Still figuring it out' },
];

export const CHILDREN_OPTIONS: { value: ChildrenIntent; label: string }[] = [
  { value: 'want', label: 'Want children' },
  { value: 'dont_want', label: "Don't want children" },
  { value: 'open', label: 'Open to it' },
  { value: 'unsure', label: 'Not sure yet' },
];

export const DISTANCE_OPTIONS = [10, 15, 25, 40] as const;

export interface StyleQuestion {
  dimension: Dimension;
  prompt: string;
}

/** A short, optional set of relationship/communication-style questions. */
export const STYLE_QUESTIONS: StyleQuestion[] = [
  { dimension: 'planning_style', prompt: 'How do you like to plan your time?' },
  { dimension: 'independence', prompt: 'What balance of togetherness feels right?' },
  { dimension: 'social_frequency', prompt: 'Your ideal weekend is...' },
  { dimension: 'texting_frequency', prompt: 'Between seeing each other, you like to...' },
];

export function styleOptions(dimension: Dimension): { value: string; label: string }[] {
  const spec = DIMENSION_SPECS[dimension];
  return spec.scale.map((value) => ({
    value,
    label: capitalize(spec.valueLabels[value] ?? value),
  }));
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
}
