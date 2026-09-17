import type { ExplanationPoint } from '@/types/domain';

import { DIMENSION_SPECS } from './dimensions';
import type { CompatibilityResult } from './types';

export interface FallbackExplanation {
  alignment: ExplanationPoint[];
  friction: ExplanationPoint[];
  unknowns: ExplanationPoint[];
}

const MAX_ALIGNMENT = 3;
const MAX_FRICTION = 2;
const MAX_UNKNOWNS = 2;

/**
 * Deterministic explanation grounded entirely in structured compatibility data.
 * Used when AI generation is unavailable/fails, and as the ground truth the AI
 * explainer must not contradict. Every sentence traces back to a dimension.
 */
export function buildFallbackExplanation(compatibility: CompatibilityResult): FallbackExplanation {
  const alignment = compatibility.alignment.slice(0, MAX_ALIGNMENT).map((c): ExplanationPoint => {
    const spec = DIMENSION_SPECS[c.dimension];
    const sharedLabel = spec.valueLabels[c.viewerValue] ?? c.viewerValue;
    return { text: spec.alignmentPhrase(sharedLabel), dimension: c.dimension };
  });

  const friction = compatibility.friction.slice(0, MAX_FRICTION).map((c): ExplanationPoint => {
    const spec = DIMENSION_SPECS[c.dimension];
    const viewerLabel = spec.valueLabels[c.viewerValue] ?? c.viewerValue;
    const otherLabel = spec.valueLabels[c.otherValue] ?? c.otherValue;
    return { text: spec.frictionPhrase(viewerLabel, otherLabel), dimension: c.dimension };
  });

  const unknowns = compatibility.unknowns
    .slice(0, MAX_UNKNOWNS)
    .map((dimension): ExplanationPoint => {
      const spec = DIMENSION_SPECS[dimension];
      return { text: spec.unknownPhrase, dimension };
    });

  return { alignment, friction, unknowns };
}
