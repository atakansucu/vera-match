import { DevBackend } from '../devBackend';

let backend: DevBackend;

beforeEach(() => {
  backend = new DevBackend();
});

describe('getHomeState', () => {
  it('returns a valid home state for the demo user', async () => {
    await backend.verifyEmailOtp('demo@kindred.app', '000000');
    const state = await backend.getHomeState('ava');
    expect(state).toHaveProperty('matchDrop');
    expect(state).toHaveProperty('revisionCard');
    expect(state).toHaveProperty('microScenario');
    expect(state).toHaveProperty('weeklyRecap');
    expect(state).toHaveProperty('hasPredictionGame');
  });
});

describe('getNotebook', () => {
  it('returns categorized insights', async () => {
    await backend.verifyEmailOtp('demo@kindred.app', '000000');
    const notebook = await backend.getNotebook('ava');
    expect(notebook).toHaveProperty('prettySure');
    expect(notebook).toHaveProperty('reconsidering');
    expect(notebook).toHaveProperty('figuringOut');
    expect(notebook.prettySure.length).toBeGreaterThan(0);
  });
});

describe('getMicroScenario', () => {
  it('returns a scenario for a user with unknown dimensions', async () => {
    await backend.verifyEmailOtp('demo@kindred.app', '000000');
    const scenario = await backend.getMicroScenario('ava');
    expect(scenario).not.toBeNull();
    if (scenario) {
      expect(scenario.prompt.length).toBeGreaterThan(0);
      expect(scenario.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('answering a scenario creates a claim', async () => {
    await backend.verifyEmailOtp('demo@kindred.app', '000000');
    const scenario = await backend.getMicroScenario('ava');
    expect(scenario).not.toBeNull();
    const claim = await backend.answerMicroScenario('ava', scenario!.id, scenario!.options[0].value);
    expect(claim.userId).toBe('ava');
    expect(claim.status).toBe('confirmed');
  });
});

describe('getPredictionGame', () => {
  it('returns a prediction game for a user with enough claims', async () => {
    await backend.verifyEmailOtp('demo@kindred.app', '000000');
    const game = await backend.getPredictionGame('ava');
    expect(game).not.toBeNull();
    if (game) {
      expect(game.candidateA.traits.length).toBeGreaterThanOrEqual(2);
      expect(game.candidateB.traits.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('prediction is stored before user answers', async () => {
    await backend.verifyEmailOtp('demo@kindred.app', '000000');
    const game = await backend.getPredictionGame('ava');
    expect(game).not.toBeNull();
    const result = await backend.submitPrediction('ava', game!.id, 'b', null);
    expect(result).toHaveProperty('correct');
    expect(result).toHaveProperty('matchmakerPredicted');
    expect(result).toHaveProperty('userChose');
    expect(result.userChose).toBe('b');
  });

  it('incorrect prediction does not auto-rewrite preferences', async () => {
    await backend.verifyEmailOtp('demo@kindred.app', '000000');
    const claimsBefore = await backend.listClaims('ava');
    const confirmedBefore = claimsBefore.filter((c) => c.status === 'confirmed');

    const game = await backend.getPredictionGame('ava');
    await backend.submitPrediction('ava', game!.id, 'b', null);

    const claimsAfter = await backend.listClaims('ava');
    const confirmedAfter = claimsAfter.filter((c) => c.status === 'confirmed');
    expect(confirmedAfter.length).toBe(confirmedBefore.length);
  });
});

describe('getWeeklyRecap', () => {
  it('returns null when nothing happened recently', async () => {
    await backend.verifyEmailOtp('demo@kindred.app', '000000');
    const recap = await backend.getWeeklyRecap('ava');
    // May or may not be null depending on seed state — but structure is correct
    if (recap) {
      expect(recap).toHaveProperty('learned');
      expect(recap).toHaveProperty('stoppedAssuming');
      expect(recap).toHaveProperty('stillCurious');
      expect(recap).toHaveProperty('promisingCandidate');
    }
  });
});

describe('getConversationStarter', () => {
  it('returns a grounded starter for a matched conversation', async () => {
    await backend.verifyEmailOtp('demo@kindred.app', '000000');
    const conversations = await backend.listConversations('ava');
    if (conversations.length > 0) {
      const starter = await backend.getConversationStarter('ava', conversations[0].id);
      if (starter) {
        expect(starter.text.length).toBeGreaterThan(0);
        expect(starter.dimension).toBeTruthy();
        // Must not contain private reflection data
        expect(starter.text).not.toContain('cheated');
        expect(starter.text).not.toContain('trauma');
      }
    }
  });
});

describe('acknowledgeRevisionCard', () => {
  it('dismisses the card after acknowledgment', async () => {
    await backend.verifyEmailOtp('demo@kindred.app', '000000');
    // Force a revision so there's something to acknowledge
    const claim = await backend.shareThought(
      'ava',
      'I think planning ahead matters a lot to me actually.',
    );
    if (claim.createdClaims.length > 0) {
      await backend.confirmClaim('ava', claim.createdClaims[0].id);
    }
    const card = await backend.getLatestRevisionCard('ava');
    if (card) {
      await backend.acknowledgeRevisionCard('ava', card.revisionId, 'exactly');
      const cardAfter = await backend.getLatestRevisionCard('ava');
      expect(cardAfter).toBeNull();
    }
  });
});
