import { useRouter } from 'expo-router';

import { Button, Screen, Text, VStack } from '@/design';
import { Callout } from '@/components';
import { useAuthActions } from '@/features/auth/useAuth';

export default function OnboardingWelcome() {
  const router = useRouter();
  const auth = useAuthActions();

  return (
    <Screen scroll contentStyle={{ justifyContent: 'center' }}>
      <VStack gap="xxl">
        <VStack gap="sm">
          <Text variant="display">Let&apos;s begin</Text>
          <Text variant="body" color="secondary">
            This takes about five minutes. I only ask for what I need to make a first, thoughtful
            introduction. I&apos;ll learn the rest when it becomes useful.
          </Text>
        </VStack>

        <Callout>
          You are always the final authority on your own model. Anything I infer, I&apos;ll show you
          and ask before it changes who I suggest.
        </Callout>

        <VStack gap="md">
          <Button label="Start setup" onPress={() => router.push('/onboarding/steps')} />
          <Button label="Use a different account" variant="ghost" onPress={() => auth.signOut()} />
        </VStack>
      </VStack>
    </Screen>
  );
}
