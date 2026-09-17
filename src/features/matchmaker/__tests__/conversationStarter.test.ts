import type { ExplanationPoint } from '@/types/domain';

import { buildConversationStarter } from '../conversationStarter';

describe('buildConversationStarter', () => {
  it('returns null when no explanation points exist', () => {
    expect(buildConversationStarter([], [])).toBeNull();
  });

  it('prefers friction for a conversation starter', () => {
    const alignment: ExplanationPoint[] = [
      { text: 'You both value independence.', dimension: 'independence' },
    ];
    const friction: ExplanationPoint[] = [
      { text: 'You plan ahead; they are spontaneous.', dimension: 'planning_style' },
    ];
    const result = buildConversationStarter(alignment, friction);
    expect(result).not.toBeNull();
    expect(result!.dimension).toBe('planning_style');
    expect(result!.text).toContain('spontaneous');
  });

  it('falls back to alignment when no friction exists', () => {
    const alignment: ExplanationPoint[] = [
      { text: 'You both value independence.', dimension: 'independence' },
      { text: 'You both plan ahead.', dimension: 'planning_style' },
    ];
    const result = buildConversationStarter(alignment, []);
    expect(result).not.toBeNull();
    expect(result!.dimension).toBe('independence');
  });

  it('never uses private reflection data — only explanation-safe traits', () => {
    const alignment: ExplanationPoint[] = [
      { text: 'You both place strong importance on trust.', dimension: 'independence' },
    ];
    const result = buildConversationStarter(alignment, []);
    if (result) {
      expect(result.text).not.toContain('cheated');
      expect(result.text).not.toContain('trauma');
      expect(result.text).not.toContain('therapy');
    }
  });

  it('returns null when alignment has only one point and no friction', () => {
    const alignment: ExplanationPoint[] = [
      { text: 'Something.', dimension: 'independence' },
    ];
    expect(buildConversationStarter(alignment, [])).toBeNull();
  });
});
