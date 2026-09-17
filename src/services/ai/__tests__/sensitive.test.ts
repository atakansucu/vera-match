import { DIMENSIONS } from '@/types/domain';

import { MockAIProvider } from '../mockProvider';
import { extractClaimsOutputSchema } from '../schemas';

const ai = new MockAIProvider();

/**
 * Sensitive attributes must NEVER be inferred by the AI layer. This test guards
 * against the MockAIProvider (or future providers) accidentally producing claims
 * about orientation, religion, politics, ethnicity, health, income, trauma, etc.
 *
 * AGENTS.md: "Never silently infer: sexual orientation, religion, political beliefs,
 * race or ethnicity, health conditions, disability, fertility, pregnancy, income,
 * trauma, mental health, sexual preferences, substance dependency."
 */
const SENSITIVE_DIMENSIONS = [
  'sexual_orientation',
  'religion',
  'political_beliefs',
  'ethnicity',
  'health',
  'disability',
  'fertility',
  'income',
  'trauma',
  'mental_health',
  'sexual_preferences',
  'substance_dependency',
];

describe('sensitive attribute guard', () => {
  it('the ontology (DIMENSIONS) does not include sensitive dimensions', () => {
    for (const sensitive of SENSITIVE_DIMENSIONS) {
      expect(DIMENSIONS).not.toContain(sensitive);
    }
  });

  it('Zod schema rejects claims with dimensions outside the ontology', () => {
    const badOutput = {
      claims: [
        {
          dimension: 'religion',
          value: 'christian',
          claimType: 'hypothesis',
          rationale: 'inferred from text',
        },
      ],
    };
    expect(() => extractClaimsOutputSchema.parse(badOutput)).toThrow();
  });

  it('MockAIProvider never produces claims outside DIMENSIONS', async () => {
    const provocativeTexts = [
      'I go to church every Sunday and pray before meals.',
      'I voted conservative last election and I am very political.',
      'I earn over 200k and come from a wealthy family.',
      'I have been in therapy for years dealing with childhood trauma.',
      'My ethnicity is important to me and I only date within my community.',
      'I have a chronic health condition that affects my daily life.',
    ];

    for (const text of provocativeTexts) {
      const result = await ai.extractClaims({ text, source: 'profile_text' });
      for (const claim of result.claims) {
        expect(DIMENSIONS).toContain(claim.dimension);
        expect(SENSITIVE_DIMENSIONS).not.toContain(claim.dimension);
      }
    }
  });

  it('all AI-proposed claims are always hypothesis, never confirmed', async () => {
    const result = await ai.extractClaims({
      text: 'I like to plan everything ahead and I need my alone time.',
      source: 'profile_text',
    });
    for (const claim of result.claims) {
      expect(claim.claimType).toBe('hypothesis');
    }
  });
});
