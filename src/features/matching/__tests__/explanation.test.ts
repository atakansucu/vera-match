import { buildFallbackExplanation } from '../explanation';
import type { CompatibilityResult, DimensionComparison } from '../types';

function comparison(
  dimension: string,
  viewerValue: string,
  otherValue: string,
  distance: number,
  importance = 3,
): DimensionComparison {
  return {
    dimension: dimension as DimensionComparison['dimension'],
    viewerValue,
    otherValue,
    distance,
    importance,
  };
}

function result(
  overrides: Partial<CompatibilityResult> = {},
): CompatibilityResult {
  return {
    alignment: [],
    friction: [],
    unknowns: [],
    alignmentScore: 0,
    frictionPenalty: 0,
    ...overrides,
  };
}

describe('buildFallbackExplanation', () => {
  it('returns empty arrays when there is nothing to explain', () => {
    const explanation = buildFallbackExplanation(result());
    expect(explanation.alignment).toHaveLength(0);
    expect(explanation.friction).toHaveLength(0);
    expect(explanation.unknowns).toHaveLength(0);
  });

  it('generates alignment phrases from dimension specs', () => {
    const explanation = buildFallbackExplanation(
      result({
        alignment: [comparison('independence', 'independent', 'independent', 0)],
      }),
    );
    expect(explanation.alignment).toHaveLength(1);
    expect(explanation.alignment[0].dimension).toBe('independence');
    expect(explanation.alignment[0].text).toContain('independent relationship');
  });

  it('generates friction phrases referencing both viewer and other values', () => {
    const explanation = buildFallbackExplanation(
      result({
        friction: [comparison('planning_style', 'planner', 'spontaneous', 2)],
      }),
    );
    expect(explanation.friction).toHaveLength(1);
    expect(explanation.friction[0].dimension).toBe('planning_style');
    expect(explanation.friction[0].text).toContain('planner');
    expect(explanation.friction[0].text).toContain('spontaneous');
  });

  it('generates unknown phrases', () => {
    const explanation = buildFallbackExplanation(
      result({ unknowns: ['texting_frequency'] }),
    );
    expect(explanation.unknowns).toHaveLength(1);
    expect(explanation.unknowns[0].dimension).toBe('texting_frequency');
    expect(explanation.unknowns[0].text).toContain('texting frequency');
  });

  it('caps alignment at 3, friction at 2, unknowns at 2', () => {
    const explanation = buildFallbackExplanation(
      result({
        alignment: [
          comparison('independence', 'independent', 'independent', 0),
          comparison('social_frequency', 'balanced', 'balanced', 0),
          comparison('planning_style', 'planner', 'planner', 0),
          comparison('emotional_openness', 'open', 'open', 0),
        ],
        friction: [
          comparison('work_life_balance', 'balanced', 'work_focused', 1),
          comparison('activity_level', 'high', 'low', 2),
          comparison('conflict_style', 'avoidant', 'addresses_directly', 2),
        ],
        unknowns: [
          'texting_frequency',
          'travel_tendency',
          'alcohol',
        ],
      }),
    );
    expect(explanation.alignment).toHaveLength(3);
    expect(explanation.friction).toHaveLength(2);
    expect(explanation.unknowns).toHaveLength(2);
  });

  it('every explanation point traces back to a dimension', () => {
    const explanation = buildFallbackExplanation(
      result({
        alignment: [comparison('social_frequency', 'balanced', 'balanced', 0)],
        friction: [comparison('planning_style', 'planner', 'spontaneous', 2)],
        unknowns: ['emotional_openness'],
      }),
    );
    for (const point of [...explanation.alignment, ...explanation.friction, ...explanation.unknowns]) {
      expect(point.dimension).toBeTruthy();
      expect(point.text).toBeTruthy();
    }
  });
});
