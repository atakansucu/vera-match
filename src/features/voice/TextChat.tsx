import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, View, type ListRenderItemInfo, type ViewStyle } from 'react-native';

import { Text, useTheme } from '@/design';
import { Field } from '@/design/primitives/Field';
import { Icon } from '@/design/primitives/Icon';
import { spacing, radii, minTouchTarget } from '@/design/tokens';

import type { VoiceMessage } from './realtimeProtocol';

interface TextChatProps {
  messages: VoiceMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
}

/**
 * Text-based fallback chat used in dev mode when no OpenAI key is available.
 * Provides the same conversational UX as the voice mode but with typed input.
 */
export function TextChat({ messages, onSend, disabled = false }: TextChatProps) {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<VoiceMessage>>(null);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  }, [input, onSend]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<VoiceMessage>) => {
      const isUser = item.role === 'user';
      const bubbleStyle: ViewStyle = {
        backgroundColor: isUser ? theme.colors.accent : theme.colors.surfaceElevated,
        borderRadius: radii.lg,
        padding: spacing.md,
        maxWidth: '80%',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        marginBottom: spacing.sm,
      };
      return (
        <View style={bubbleStyle}>
          <Text
            variant="body"
            color={isUser ? 'onAccent' : 'primary'}
          >
            {item.text}
          </Text>
        </View>
      );
    },
    [theme],
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          padding: spacing.lg,
          flexGrow: 1,
          justifyContent: 'flex-end',
        }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          padding: spacing.md,
          gap: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View style={{ flex: 1 }}>
          <Field
            accessibilityLabel="Type a message"
            placeholder="Type a message..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            editable={!disabled}
            returnKeyType="send"
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={disabled || !input.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={{
            width: minTouchTarget,
            height: minTouchTarget,
            borderRadius: radii.pill,
            backgroundColor: theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled || !input.trim() ? 0.4 : 1,
          }}
        >
          <Icon name="send" size={20} color={theme.colors.onAccent} />
        </Pressable>
      </View>
    </View>
  );
}
