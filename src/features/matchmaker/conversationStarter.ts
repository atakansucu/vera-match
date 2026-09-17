import { DIMENSION_SPECS } from '@/features/matching/dimensions';
import type { ExplanationPoint } from '@/types/domain';
import type { ConversationStarterView } from '@/types/views';

/**
 * Derives one grounded conversation starter from the introduction explanation.
 * Uses only explanation-safe traits — never private memory.
 *
 * Prefers a shared friction point (interesting to talk about) over pure alignment.
 */
export function buildConversationStarter(
  alignment: ExplanationPoint[],
  friction: ExplanationPoint[],
): ConversationStarterView | null {
  if (friction.length > 0 && friction[0].dimension) {
    const dim = friction[0].dimension;
    const spec = DIMENSION_SPECS[dim];
    if (spec) {
      return {
        text: `You might actually enjoy talking about this: ${friction[0].text}`,
        dimension: dim,
      };
    }
  }

  if (alignment.length >= 2 && alignment[0].dimension) {
    const dim = alignment[0].dimension;
    const spec = DIMENSION_SPECS[dim];
    if (spec) {
      return {
        text: `Something you have in common: ${alignment[0].text}`,
        dimension: dim,
      };
    }
  }

  return null;
}
