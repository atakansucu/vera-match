import type { FeatureFlags } from '@/types/views';

import { env } from './env';

/**
 * Server-controllable experiment flags. In production these are read from the
 * `app_config` table; here we provide sane defaults derived from env so the app
 * is experiment-ready without code changes.
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  weeklyIntroductionLimit: 2,
  microQuestionEnabled: true,
  postDateReflectionEnabled: true,
  frictionVisible: true,
  demoMode: env.backend === 'dev',
  betaAllowedEmailDomains: env.betaAllowedEmailDomains,
  // Engagement v2
  matchDropEnabled: true,
  microScenariosEnabled: true,
  predictionGameEnabled: true,
  weeklyRecapEnabled: true,
  conversationStarterEnabled: true,
};
