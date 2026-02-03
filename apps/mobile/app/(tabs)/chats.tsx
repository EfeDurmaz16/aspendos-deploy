/**
 * YULA Mobile - Chats List Screen
 *
 * List of all conversations with search and filters.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, MessageSquare, Clock, Archive } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

// Types
interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
  messageCount: number;
  archived: boolean;
}

// Mock data (replace with API call)
const mockChats: Chat[] = [
  {
    id: '1',
    title: 'Project Planning Discussion',
    lastMessage: 'Let me help you break down those tasks...',
    updatedAt: '2026-01-24T15:30:00Z',
    messageCount: 24,
    archived: false,
  },
  {
    id: '2',
    title: 'Code Review Help',
    lastMessage: 'The refactoring looks good. Here are a few suggestions...',
    updatedAt: '2026-01-24T10:15:00Z',
    messageCount: 18,
    archived: false,
  },
  {
    id: '3',
    title: 'Writing Assistant',
    lastMessage: 'Here is a revised version of your email...',
    updatedAt: '2026-01-23T20:45:00Z',
    messageCount: 12,
    archived: false,
  },
];

export default function ChatsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const bgColor = isDark ? 'bg-gray-950' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-gray-100';

  // Fetch chats
  const { data: chats, isLoading, refetch } = useQuery({
    queryKey: ['chats', showArchived],
    queryFn: async () => {
      // Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockChats.filter((c) => c.archived === showArchived);
    },
  });

  // Filter chats by search query
  const filteredChats = chats?.filter(
    (chat) =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderChat = useCallback(
    ({ item }: { item: Chat }) => (
      <TouchableOpacity
        onPress={() => router.push(`/chat/${item.id}`)}
        className={`p-4 border-b ${borderColor}`}
        activeOpacity={0.7}
      >
        <View className="flex-row items-start">
          <View
            className={`w-10 h-10 rounded-full ${cardBg} items-center justify-center mr-3`}
          >
            <MessageSquare
              size={20}
              color={isDark ? '#A3A3A3' : '#525252'}
              strokeWidth={1.5}
            />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text
                className={`font-semibold ${textColor} flex-1 mr-2`}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text className={`text-xs ${subtextColor}`}>
                {formatRelativeTime(item.updatedAt)}
              </Text>
            </View>
            <Text className={`${subtextColor} text-sm`} numberOfLines={2}>
              {item.lastMessage}
            </Text>
            <View className="flex-row items-center mt-2">
              <Clock size={12} color={isDark ? '#737373' : '#A3A3A3'} />
              <Text className={`text-xs ${subtextColor} ml-1`}>
                {item.messageCount} messages
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [isDark, borderColor, cardBg, textColor, subtextColor, router]
  );

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between">
        <Text className={`text-2xl font-bold ${textColor}`}>Chats</Text>
        <TouchableOpacity
          onPress={() => router.push('/chat/new')}
          className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full items-center justify-center"
        >
          <Plus size={20} color={isDark ? '#171717' : '#FFFFFF'} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="px-4 mb-2">
        <View className={`flex-row items-center ${inputBg} rounded-xl px-3 py-2`}>
          <Search size={18} color={isDark ? '#737373' : '#A3A3A3'} />
          <TextInput
            placeholder="Search chats..."
            placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className={`flex-1 ml-2 text-base ${textColor}`}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View className={`flex-row px-4 py-2 border-b ${borderColor}`}>
        <TouchableOpacity
          onPress={() => setShowArchived(false)}
          className={`mr-4 pb-2 ${!showArchived ? 'border-b-2 border-gray-900 dark:border-white' : ''}`}
        >
          <Text
            className={`font-medium ${
              !showArchived ? textColor : subtextColor
            }`}
          >
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowArchived(true)}
          className={`pb-2 ${showArchived ? 'border-b-2 border-gray-900 dark:border-white' : ''}`}
        >
          <View className="flex-row items-center">
            <Archive size={14} color={showArchived ? (isDark ? '#FFFFFF' : '#171717') : (isDark ? '#737373' : '#A3A3A3')} />
            <Text
              className={`font-medium ml-1 ${
                showArchived ? textColor : subtextColor
              }`}
            >
              Archived
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        renderItem={renderChat}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={isDark ? '#FFFFFF' : '#171717'}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <MessageSquare
              size={48}
              color={isDark ? '#525252' : '#A3A3A3'}
              strokeWidth={1}
            />
            <Text className={`${subtextColor} text-center mt-4`}>
              {searchQuery
                ? 'No chats found'
                : showArchived
                ? 'No archived chats'
                : 'No chats yet. Start a new conversation!'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
