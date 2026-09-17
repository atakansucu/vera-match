import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { FullScreenLoader, Photo, ScreenHeader } from '@/components';
import {
  Badge,
  Button,
  Card,
  Divider,
  HStack,
  Icon,
  Screen,
  Text,
  useTheme,
  VStack,
} from '@/design';
import { useAuthActions } from '@/features/auth/useAuth';
import { ageFromDob } from '@/lib/date';
import { logDev } from '@/lib/log';
import { registerForPushNotifications } from '@/lib/notifications';
import { useBackend, useUserId } from '@/hooks/app';
import type { IconName } from '@/design';

export default function MeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const backend = useBackend();
  const userId = useUserId();
  const auth = useAuthActions();

  const profile = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => backend.getProfile(userId),
  });
  const photos = useQuery({
    queryKey: ['photos', userId],
    queryFn: () => backend.listPhotos(userId),
  });
  const verification = useQuery({
    queryKey: ['verification', userId],
    queryFn: () => backend.getVerification(userId),
  });

  if (profile.isPending) return <FullScreenLoader />;
  const me = profile.data;
  const primaryPhoto = photos.data?.[0]?.storagePath ?? null;

  const onVerify = async () => {
    await backend.submitSelfie(userId, 'dev://selfie');
    void verification.refetch();
  };

  const onNotifications = async () => {
    const token = await registerForPushNotifications();
    Alert.alert(
      token ? 'Notifications on' : 'Notifications unavailable',
      token
        ? 'You will get a quiet ping for a new introduction, a mutual match, or a new message. Lock-screen text stays generic.'
        : 'Push notifications need a physical device. Nothing sensitive is ever shown on the lock screen.',
    );
  };

  const onExport = async () => {
    const data = await backend.exportData(userId);
    logDev('data_export', data);
    Alert.alert('Your data is ready', 'A full copy of your data has been prepared for export.');
  };

  const onDelete = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your profile, photos, private reflections and everything your matchmaker has learned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await backend.deleteAccount(userId);
            await auth.signOut();
          },
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Me" />

      <Card>
        <HStack gap="lg">
          <Photo url={primaryPhoto} name={me?.displayName ?? 'You'} size={64} rounded />
          <VStack gap="xxs" style={{ flex: 1 }}>
            <Text variant="title">
              {me?.displayName}
              {me ? `, ${ageFromDob(me.dateOfBirth)}` : ''}
            </Text>
            {me ? (
              <Text variant="callout" color="secondary">
                {me.area}, {me.city}
              </Text>
            ) : null}
            {me?.verificationStatus === 'selfie_verified' ? (
              <Badge label="Verified" tone="positive" />
            ) : null}
          </VStack>
        </HStack>
      </Card>

      <VStack gap="md" style={{ marginTop: theme.spacing.xl }}>
        <Text variant="label" color="secondary">
          YOUR MODEL
        </Text>
        <Card padding="none">
          <RowLink
            icon="compass"
            label="What my matchmaker knows"
            onPress={() => router.push('/model')}
          />
        </Card>

        <Text variant="label" color="secondary" style={{ marginTop: theme.spacing.md }}>
          IDENTITY
        </Text>
        <Card>
          <VStack gap="md">
            <HStack justify="space-between">
              <Text variant="body">Verification</Text>
              <Text variant="callout" color="secondary">
                {formatVerification(me?.verificationStatus)}
              </Text>
            </HStack>
            {me?.verificationStatus !== 'selfie_verified' ? (
              <Button label="Verify with a selfie" variant="secondary" onPress={onVerify} />
            ) : null}
            {verification.data?.usingStub ? (
              <Text variant="footnote" color="caution">
                Development verification only — not a production liveness check.
              </Text>
            ) : null}
          </VStack>
        </Card>

        <Text variant="label" color="secondary" style={{ marginTop: theme.spacing.md }}>
          PRIVACY & DATA
        </Text>
        <Card padding="none">
          <RowLink icon="bell" label="Notifications" onPress={onNotifications} />
          <Divider spacingToken="none" />
          <RowLink icon="download" label="Export my data" onPress={onExport} />
          <Divider spacingToken="none" />
          <RowLink icon="trash-2" label="Delete my account" destructive onPress={onDelete} />
        </Card>

        <View style={{ marginTop: theme.spacing.xl }}>
          <Button label="Sign out" variant="ghost" onPress={() => auth.signOut()} />
        </View>
      </VStack>
    </Screen>
  );
}

function formatVerification(status?: string): string {
  switch (status) {
    case 'selfie_verified':
      return 'Verified';
    case 'selfie_pending':
      return 'In review';
    case 'email_verified':
      return 'Email verified';
    case 'rejected':
      return 'Needs attention';
    default:
      return 'Not verified';
  }
}

function RowLink({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ padding: theme.spacing.lg }}>
      <HStack justify="space-between">
        <HStack gap="md">
          <Icon
            name={icon}
            size={18}
            color={destructive ? theme.colors.destructive : theme.colors.textSecondary}
          />
          <Text variant="body" color={destructive ? 'destructive' : 'primary'}>
            {label}
          </Text>
        </HStack>
        <Icon name="chevron-right" size={18} color={theme.colors.textTertiary} />
      </HStack>
    </Pressable>
  );
}
