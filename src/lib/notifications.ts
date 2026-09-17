/**
 * Expo Notifications architecture. Copy is intentionally generic — never put
 * sensitive compatibility information in lock-screen text.
 *
 * Good:  "You have a new introduction."
 * Bad:   "We found someone who matches your views on marriage and children."
 *
 * This module is a scaffolding: registering a push token requires a physical
 * device. In the web preview / simulator we no-op cleanly.
 */

export const NOTIFICATION_COPY = {
  newIntroduction: 'You have a new introduction.',
  mutualInterest: "It's mutual — you can start chatting.",
  newMessage: 'You have a new message.',
  reflectionReminder: 'If you met, how did it feel?',
} as const;

export type NotificationKind = keyof typeof NOTIFICATION_COPY;

export function notificationBody(kind: NotificationKind): string {
  return NOTIFICATION_COPY[kind];
}

/** Registers for push notifications. Returns the token, or null on web/simulator. */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const Notifications = await import('expo-notifications');
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== 'granted') return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}
