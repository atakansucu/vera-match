import { DIMENSIONS } from '@/types/domain';

import { DIMENSION_SPECS, ordinalIndex } from '../dimensions';

describe('DIMENSION_SPECS', () => {
  it('has a spec for every dimension in the ontology', () => {
    for (const dim of DIMENSIONS) {
      expect(DIMENSION_SPECS[dim]).toBeDefined();
      expect(DIMENSION_SPECS[dim].key).toBe(dim);
    }
  });

  it('every spec has a non-empty scale', () => {
    for (const dim of DIMENSIONS) {
      expect(DIMENSION_SPECS[dim].scale.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every spec has valueLabels matching the scale', () => {
    for (const dim of DIMENSIONS) {
      const spec = DIMENSION_SPECS[dim];
      for (const value of spec.scale) {
        expect(spec.valueLabels[value]).toBeTruthy();
      }
    }
  });

  it('every spec has a group', () => {
    const validGroups = new Set(['intentions', 'lifestyle', 'communication', 'dynamics']);
    for (const dim of DIMENSIONS) {
      expect(validGroups.has(DIMENSION_SPECS[dim].group)).toBe(true);
    }
  });

  it('every spec has phrase generators that return non-empty strings', () => {
    for (const dim of DIMENSIONS) {
      const spec = DIMENSION_SPECS[dim];
      expect(spec.alignmentPhrase('test')).toBeTruthy();
      expect(spec.frictionPhrase('a', 'b')).toBeTruthy();
      expect(spec.unknownPhrase).toBeTruthy();
    }
  });

  it('defaultImportance is within 1..5 range', () => {
    for (const dim of DIMENSIONS) {
      const imp = DIMENSION_SPECS[dim].defaultImportance;
      expect(imp).toBeGreaterThanOrEqual(1);
      expect(imp).toBeLessThanOrEqual(5);
    }
  });
});

describe('ordinalIndex', () => {
  it('returns 0 for the first value in a scale', () => {
    expect(ordinalIndex('planning_style', 'spontaneous')).toBe(0);
    expect(ordinalIndex('independence', 'togetherness')).toBe(0);
  });

  it('returns the last index for the last value', () => {
    expect(ordinalIndex('planning_style', 'planner')).toBe(2);
    expect(ordinalIndex('independence', 'independent')).toBe(2);
  });

  it('returns middle index for middle values', () => {
    expect(ordinalIndex('planning_style', 'flexible')).toBe(1);
    expect(ordinalIndex('independence', 'balanced')).toBe(1);
  });

  it('returns -1 for unknown values', () => {
    expect(ordinalIndex('planning_style', 'nonexistent')).toBe(-1);
  });
});
