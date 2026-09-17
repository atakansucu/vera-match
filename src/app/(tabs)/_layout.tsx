import { Redirect, Tabs } from 'expo-router';

import { Icon, useTheme } from '@/design';
import { useSessionStore } from '@/state/session';

export default function TabsLayout() {
  const theme = useTheme();
  const session = useSessionStore((s) => s.session);
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="matchmaker"
        options={{
          title: 'Matchmaker',
          tabBarAccessibilityLabel: 'Matchmaker',
          tabBarIcon: ({ color }) => <Icon name="compass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarAccessibilityLabel: 'Chats',
          tabBarIcon: ({ color }) => <Icon name="message-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarAccessibilityLabel: 'Me',
          tabBarIcon: ({ color }) => <Icon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
