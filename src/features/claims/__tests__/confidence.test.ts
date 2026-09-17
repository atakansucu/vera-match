import { deriveConfidence, confidenceLanguage, sourceLanguage } from '../confidence';

describe('deriveConfidence', () => {
  it('returns unknown for rejected claims', () => {
    expect(
      deriveConfidence({ status: 'rejected', claimType: 'stated', sourceType: 'onboarding_answer' }),
    ).toBe('unknown');
  });

  it('returns unknown for superseded claims', () => {
    expect(
      deriveConfidence({ status: 'superseded', claimType: 'observed', sourceType: 'reflection' }),
    ).toBe('unknown');
  });

  it('returns weak_low for unconfirmed claims regardless of source', () => {
    expect(
      deriveConfidence({ status: 'unconfirmed', claimType: 'stated', sourceType: 'onboarding_answer' }),
    ).toBe('weak_low');
    expect(
      deriveConfidence({ status: 'unconfirmed', claimType: 'hypothesis', sourceType: 'reflection' }),
    ).toBe('weak_low');
  });

  it('returns explicit_high for confirmed + stated', () => {
    expect(
      deriveConfidence({ status: 'confirmed', claimType: 'stated', sourceType: 'reflection' }),
    ).toBe('explicit_high');
  });

  it('returns explicit_high for confirmed + direct source (onboarding_answer)', () => {
    expect(
      deriveConfidence({ status: 'confirmed', claimType: 'observed', sourceType: 'onboarding_answer' }),
    ).toBe('explicit_high');
  });

  it('returns explicit_high for confirmed + direct source (micro_question_answer)', () => {
    expect(
      deriveConfidence({ status: 'confirmed', claimType: 'hypothesis', sourceType: 'micro_question_answer' }),
    ).toBe('explicit_high');
  });

  it('returns explicit_high for confirmed + direct source (direct_edit)', () => {
    expect(
      deriveConfidence({ status: 'confirmed', claimType: 'observed', sourceType: 'direct_edit' }),
    ).toBe('explicit_high');
  });

  it('returns confirmed_medium_high for confirmed inference from non-direct source', () => {
    expect(
      deriveConfidence({ status: 'confirmed', claimType: 'observed', sourceType: 'reflection' }),
    ).toBe('confirmed_medium_high');
    expect(
      deriveConfidence({ status: 'confirmed', claimType: 'hypothesis', sourceType: 'decision_behavior' }),
    ).toBe('confirmed_medium_high');
    expect(
      deriveConfidence({ status: 'confirmed', claimType: 'observed', sourceType: 'profile_text' }),
    ).toBe('confirmed_medium_high');
  });
});

describe('confidenceLanguage', () => {
  it('returns human-readable language for each tier', () => {
    expect(confidenceLanguage('explicit_high')).toBe("You've told me this directly.");
    expect(confidenceLanguage('confirmed_medium_high')).toBe("I'm fairly confident about this.");
    expect(confidenceLanguage('weak_low')).toBe("I'm still learning this.");
    expect(confidenceLanguage('unknown')).toBe("I'm not sure yet.");
  });
});

describe('sourceLanguage', () => {
  it('describes onboarding_answer', () => {
    expect(sourceLanguage({ sourceType: 'onboarding_answer', status: 'confirmed' })).toBe(
      'You told me during setup.',
    );
  });

  it('describes micro_question_answer', () => {
    expect(sourceLanguage({ sourceType: 'micro_question_answer', status: 'confirmed' })).toBe(
      'You answered a quick question.',
    );
  });

  it('describes direct_edit', () => {
    expect(sourceLanguage({ sourceType: 'direct_edit', status: 'confirmed' })).toBe(
      'You edited this yourself.',
    );
  });

  it('describes confirmed reflection', () => {
    expect(sourceLanguage({ sourceType: 'reflection', status: 'confirmed' })).toBe(
      'Learned from your reflections and confirmed by you.',
    );
  });

  it('describes unconfirmed reflection', () => {
    expect(sourceLanguage({ sourceType: 'reflection', status: 'unconfirmed' })).toBe(
      'A hypothesis from your reflection, awaiting your confirmation.',
    );
  });

  it('describes decision_behavior', () => {
    expect(sourceLanguage({ sourceType: 'decision_behavior', status: 'confirmed' })).toBe(
      'Noticed from your choices.',
    );
  });

  it('describes profile_text', () => {
    expect(sourceLanguage({ sourceType: 'profile_text', status: 'confirmed' })).toBe(
      'From your profile.',
    );
  });
});
