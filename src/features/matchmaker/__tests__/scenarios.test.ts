import { DIMENSIONS } from '@/types/domain';

import { SCENARIO_TEMPLATES, selectScenario } from '../scenarios';

const SENSITIVE_DIMENSIONS = [
  'sexual_orientation', 'religion', 'political_beliefs', 'ethnicity',
  'health', 'disability', 'fertility', 'income', 'trauma',
];

describe('SCENARIO_TEMPLATES', () => {
  it('all target dimensions are valid DIMENSIONS', () => {
    for (const template of SCENARIO_TEMPLATES) {
      expect(DIMENSIONS).toContain(template.targetDimension);
    }
  });

  it('no scenario targets a sensitive dimension', () => {
    for (const template of SCENARIO_TEMPLATES) {
      expect(SENSITIVE_DIMENSIONS).not.toContain(template.targetDimension);
    }
  });

  it('every scenario has at least 2 options', () => {
    for (const template of SCENARIO_TEMPLATES) {
      expect(template.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every scenario has a non-empty prompt', () => {
    for (const template of SCENARIO_TEMPLATES) {
      expect(template.prompt.length).toBeGreaterThan(0);
    }
  });
});

describe('selectScenario', () => {
  it('returns a scenario when dimension is unknown', () => {
    const confirmed = new Set<(typeof DIMENSIONS)[number]>();
    const result = selectScenario(confirmed, 0, new Set());
    expect(result).not.toBeNull();
    expect(DIMENSIONS).toContain(result!.targetDimension);
  });

  it('returns null when all dimensions are confirmed', () => {
    const confirmed = new Set(DIMENSIONS);
    const result = selectScenario(confirmed, 0, new Set());
    expect(result).toBeNull();
  });

  it('returns null when weekly frequency limit is reached', () => {
    const confirmed = new Set<(typeof DIMENSIONS)[number]>();
    const result = selectScenario(confirmed, 3, new Set());
    expect(result).toBeNull();
  });

  it('skips already-answered scenario types', () => {
    const confirmed = new Set<(typeof DIMENSIONS)[number]>();
    const answered = new Set(SCENARIO_TEMPLATES.slice(0, 2).map((t) => t.id));
    const result = selectScenario(confirmed, 0, answered);
    if (result) {
      expect(answered.has(result.id)).toBe(false);
    }
  });

  it('does not return a scenario for a confirmed dimension', () => {
    const firstTemplate = SCENARIO_TEMPLATES[0];
    const confirmed = new Set([firstTemplate.targetDimension]);
    const result = selectScenario(confirmed, 0, new Set());
    if (result) {
      expect(result.targetDimension).not.toBe(firstTemplate.targetDimension);
    }
  });
});
