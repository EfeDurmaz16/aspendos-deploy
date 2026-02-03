/**
 * YULA Mobile - Chat Screen
 *
 * Individual chat conversation with AI streaming.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Paperclip, MoreVertical, Copy, RefreshCw } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  model?: string;
  isStreaming?: boolean;
}

// Mock messages
const mockMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Can you help me understand how to implement a binary search tree in TypeScript?',
    createdAt: '2026-01-24T14:30:00Z',
  },
  {
    id: '2',
    role: 'assistant',
    content: `Of course! A binary search tree (BST) is a hierarchical data structure where each node has at most two children. The key property is that for any node:

- All values in its left subtree are smaller
- All values in its right subtree are larger

Here's a TypeScript implementation:

\`\`\`typescript
class TreeNode<T> {
  value: T;
  left: TreeNode<T> | null = null;
  right: TreeNode<T> | null = null;

  constructor(value: T) {
    this.value = value;
  }
}

class BinarySearchTree<T> {
  root: TreeNode<T> | null = null;

  insert(value: T): void {
    const newNode = new TreeNode(value);

    if (!this.root) {
      this.root = newNode;
      return;
    }

    this.insertNode(this.root, newNode);
  }

  private insertNode(node: TreeNode<T>, newNode: TreeNode<T>): void {
    if (newNode.value < node.value) {
      if (!node.left) {
        node.left = newNode;
      } else {
        this.insertNode(node.left, newNode);
      }
    } else {
      if (!node.right) {
        node.right = newNode;
      } else {
        this.insertNode(node.right, newNode);
      }
    }
  }
}
\`\`\`

Would you like me to add search and delete methods as well?`,
    createdAt: '2026-01-24T14:30:30Z',
    model: 'claude-3-5-sonnet',
  },
];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [messages, setMessages] = useState<Message[]>(id === 'new' ? [] : mockMessages);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const bgColor = isDark ? 'bg-gray-950' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-gray-100';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';

  // Update navigation title
  useEffect(() => {
    navigation.setOptions({
      title: id === 'new' ? 'New Chat' : 'Chat',
    });
  }, [id, navigation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Add streaming placeholder
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        isStreaming: true,
      },
    ]);

    // Simulate streaming response
    const response = "I'd be happy to help with that! Let me explain...";
    for (let i = 0; i <= response.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: response.slice(0, i) }
            : m
        )
      );
    }

    // Finish streaming
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, isStreaming: false, model: 'claude-3-5-sonnet' }
          : m
      )
    );
    setIsLoading(false);
  };

  const handleCopy = async (content: string) => {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const MessageBubble = useCallback(
    ({ message }: { message: Message }) => {
      const isUser = message.role === 'user';

      return (
        <View
          className={`mb-4 ${isUser ? 'items-end' : 'items-start'}`}
        >
          <View
            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-gray-900 dark:bg-white rounded-br-md'
                : `${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-bl-md`
            }`}
          >
            <Text
              className={`text-base leading-6 ${
                isUser
                  ? 'text-white dark:text-gray-900'
                  : textColor
              }`}
            >
              {message.content}
              {message.isStreaming && (
                <Text className="text-blue-500"> ▋</Text>
              )}
            </Text>
          </View>

          {/* Message meta and actions */}
          {!isUser && !message.isStreaming && (
            <View className="flex-row items-center mt-1 ml-1">
              {message.model && (
                <Text className={`text-xs ${subtextColor}`}>
                  {message.model}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => handleCopy(message.content)}
                className="ml-2 p-1"
              >
                <Copy size={14} color={isDark ? '#737373' : '#A3A3A3'} />
              </TouchableOpacity>
              <TouchableOpacity className="ml-1 p-1">
                <RefreshCw size={14} color={isDark ? '#737373' : '#A3A3A3'} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    },
    [isDark, textColor, subtextColor]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 ${bgColor}`}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity className="mr-2">
              <MoreVertical size={22} color={isDark ? '#FFFFFF' : '#171717'} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => <MessageBubble message={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 8,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className={`text-lg font-semibold ${textColor} mb-2`}>
              Start a conversation
            </Text>
            <Text className={`${subtextColor} text-center px-8`}>
              Ask anything. YULA is here to help you think, create, and solve.
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View className={`px-4 py-3 border-t ${borderColor}`}>
        <View className={`flex-row items-end ${inputBg} rounded-xl p-2`}>
          <TouchableOpacity className="p-2">
            <Paperclip size={20} color={isDark ? '#737373' : '#A3A3A3'} />
          </TouchableOpacity>

          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message YULA..."
            placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
            multiline
            className={`flex-1 text-base ${textColor} max-h-24 px-2`}
            editable={!isLoading}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            className={`w-10 h-10 rounded-lg items-center justify-center ${
              inputText.trim() && !isLoading
                ? 'bg-gray-900 dark:bg-white'
                : isDark
                ? 'bg-gray-700'
                : 'bg-gray-300'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={isDark ? '#FFFFFF' : '#171717'}
              />
            ) : (
              <Send
                size={18}
                color={
                  inputText.trim()
                    ? isDark
                      ? '#171717'
                      : '#FFFFFF'
                    : isDark
                    ? '#737373'
                    : '#A3A3A3'
                }
                strokeWidth={2}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
