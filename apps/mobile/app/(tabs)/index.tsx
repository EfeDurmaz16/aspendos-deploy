/**
 * YULA Mobile - Home Screen
 *
 * Main dashboard with quick actions and recent activity.
 */

import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, MessageSquare, Users, Upload, Sparkles } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? 'bg-gray-950' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';

  const quickActions = [
    {
      id: 'new-chat',
      title: 'New Chat',
      description: 'Start a conversation',
      icon: Plus,
      color: '#171717',
      onPress: () => router.push('/chat/new'),
    },
    {
      id: 'council',
      title: 'Council',
      description: 'Ask 4 AIs at once',
      icon: Users,
      color: '#8B5CF6', // electric-violet
      onPress: () => router.push('/council'),
    },
    {
      id: 'import',
      title: 'Import',
      description: 'Bring your history',
      icon: Upload,
      color: '#3B82F6', // electric-blue
      onPress: () => router.push('/import'),
    },
  ];

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={['top']}>
      <ScrollView className="flex-1 px-4">
        {/* Header */}
        <View className="py-6">
          <Text className={`text-3xl font-bold ${textColor}`}>YULA</Text>
          <Text className={`text-base ${subtextColor} mt-1`}>
            Your AI Companion
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className={`text-sm font-medium ${subtextColor} mb-3`}>
            QUICK ACTIONS
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                onPress={action.onPress}
                className={`flex-1 min-w-[150px] p-4 rounded-xl ${cardBg} border ${borderColor}`}
                activeOpacity={0.7}
              >
                <View
                  className="w-10 h-10 rounded-lg items-center justify-center mb-3"
                  style={{ backgroundColor: `${action.color}15` }}
                >
                  <action.icon size={20} color={action.color} strokeWidth={2} />
                </View>
                <Text className={`font-semibold ${textColor}`}>
                  {action.title}
                </Text>
                <Text className={`text-sm ${subtextColor} mt-0.5`}>
                  {action.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Feature Highlight */}
        <View className={`p-5 rounded-xl mb-6 ${cardBg} border ${borderColor}`}>
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 rounded-lg bg-amber-100 items-center justify-center mr-3">
              <Sparkles size={18} color="#F59E0B" strokeWidth={2} />
            </View>
            <Text className={`font-semibold ${textColor}`}>
              PAC - Proactive Callbacks
            </Text>
          </View>
          <Text className={`${subtextColor} text-sm leading-5`}>
            YULA can message you first! Set reminders naturally or let YULA
            detect your commitments and follow up automatically.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/pac')}
            className="mt-4"
          >
            <Text className="text-amber-500 font-medium">Learn more →</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Chats */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-sm font-medium ${subtextColor}`}>
              RECENT CHATS
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/chats')}>
              <Text className="text-blue-500 text-sm">See all</Text>
            </TouchableOpacity>
          </View>

          {/* Placeholder for recent chats */}
          <View className={`p-6 rounded-xl ${cardBg} border ${borderColor} items-center`}>
            <MessageSquare size={32} color={isDark ? '#525252' : '#A3A3A3'} strokeWidth={1.5} />
            <Text className={`${subtextColor} text-center mt-3`}>
              No recent chats yet.{'\n'}Start a new conversation!
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/chat/new')}
              className="mt-4 bg-gray-900 dark:bg-white px-5 py-2.5 rounded-lg"
            >
              <Text className="text-white dark:text-gray-900 font-medium">
                New Chat
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
