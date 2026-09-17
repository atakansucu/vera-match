import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/design';
import { VoiceChat } from '@/features/voice/VoiceChat';

/**
 * Standalone voice conversation screen.
 * Opened from the matchmaker tab with `router.push('/voice?context=matchmaker')`.
 */
export default function VoiceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ context?: string }>();
  const context = params.context === 'onboarding' ? 'onboarding' : 'matchmaker';

  const handleComplete = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <VoiceChat context={context} onComplete={handleComplete} onDismiss={handleComplete} />
    </SafeAreaView>
  );
}
