/**
 * YULA Mobile - PAC (Proactive Agentic Callbacks) Screen
 *
 * Reminders and proactive notification management.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  Clock,
  Check,
  X,
  AlarmClock,
  Sparkles,
  Calendar,
  ChevronRight,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

// Types
interface Reminder {
  id: string;
  type: 'explicit' | 'implicit';
  content: string;
  context?: string;
  triggerAt: string;
  status: 'pending' | 'sent' | 'dismissed' | 'snoozed';
  conversationId?: string;
}

// Mock data
const mockReminders: Reminder[] = [
  {
    id: '1',
    type: 'explicit',
    content: 'Review the quarterly report',
    context: 'You asked to be reminded about this during your project discussion',
    triggerAt: '2026-01-25T09:00:00Z',
    status: 'pending',
    conversationId: '123',
  },
  {
    id: '2',
    type: 'implicit',
    content: 'Follow up on the client proposal',
    context: 'You mentioned you would "get back to them by end of week"',
    triggerAt: '2026-01-26T14:00:00Z',
    status: 'pending',
    conversationId: '124',
  },
  {
    id: '3',
    type: 'explicit',
    content: 'Schedule team meeting',
    triggerAt: '2026-01-24T15:00:00Z',
    status: 'sent',
  },
];

export default function PACScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [pacEnabled, setPacEnabled] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const bgColor = isDark ? 'bg-gray-950' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';

  // Fetch reminders
  const { data: reminders, isLoading, refetch } = useQuery({
    queryKey: ['pac-reminders', filter],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (filter === 'pending') {
        return mockReminders.filter((r) => r.status === 'pending');
      }
      if (filter === 'completed') {
        return mockReminders.filter((r) => r.status !== 'pending');
      }
      return mockReminders;
    },
  });

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDismiss = (id: string) => {
    // TODO: API call to dismiss reminder
    console.log('Dismiss reminder:', id);
  };

  const handleSnooze = (id: string) => {
    // TODO: Show snooze options
    console.log('Snooze reminder:', id);
  };

  const ReminderCard = useCallback(
    ({ item }: { item: Reminder }) => (
      <View className={`p-4 rounded-xl ${cardBg} border ${borderColor} mb-3`}>
        <View className="flex-row items-start">
          {/* Type Icon */}
          <View
            className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
              item.type === 'explicit' ? 'bg-amber-100' : 'bg-blue-100'
            }`}
          >
            {item.type === 'explicit' ? (
              <AlarmClock size={18} color="#F59E0B" strokeWidth={2} />
            ) : (
              <Sparkles size={18} color="#3B82F6" strokeWidth={2} />
            )}
          </View>

          {/* Content */}
          <View className="flex-1">
            <Text className={`font-semibold ${textColor}`}>{item.content}</Text>
            {item.context && (
              <Text className={`text-sm ${subtextColor} mt-1`} numberOfLines={2}>
                {item.context}
              </Text>
            )}
            <View className="flex-row items-center mt-2">
              <Clock size={14} color={isDark ? '#737373' : '#A3A3A3'} />
              <Text className={`text-sm ${subtextColor} ml-1`}>
                {formatDate(item.triggerAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        {item.status === 'pending' && (
          <View className="flex-row items-center justify-end mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <TouchableOpacity
              onPress={() => handleDismiss(item.id)}
              className="flex-row items-center px-3 py-1.5 mr-2"
            >
              <X size={16} color={isDark ? '#737373' : '#A3A3A3'} />
              <Text className={`${subtextColor} ml-1 text-sm`}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSnooze(item.id)}
              className="flex-row items-center px-3 py-1.5 bg-amber-100 rounded-lg"
            >
              <Clock size={16} color="#F59E0B" />
              <Text className="text-amber-600 ml-1 text-sm font-medium">Snooze</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'sent' && (
          <View className="flex-row items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Check size={16} color="#10B981" />
            <Text className="text-green-600 ml-1 text-sm">Sent</Text>
          </View>
        )}
      </View>
    ),
    [isDark, cardBg, borderColor, textColor, subtextColor]
  );

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className={`text-2xl font-bold ${textColor}`}>PAC</Text>
            <Text className={`${subtextColor}`}>Proactive Callbacks</Text>
          </View>
          <View className="flex-row items-center">
            <Text className={`${subtextColor} mr-2 text-sm`}>
              {pacEnabled ? 'Active' : 'Paused'}
            </Text>
            <Switch
              value={pacEnabled}
              onValueChange={setPacEnabled}
              trackColor={{ false: '#D4D4D4', true: '#FCD34D' }}
              thumbColor={pacEnabled ? '#F59E0B' : '#FFFFFF'}
            />
          </View>
        </View>
      </View>

      {/* Settings Quick Access */}
      <TouchableOpacity
        className={`mx-4 mb-4 p-4 rounded-xl ${cardBg} border ${borderColor} flex-row items-center justify-between`}
      >
        <View className="flex-row items-center">
          <Calendar size={20} color="#F59E0B" />
          <Text className={`${textColor} ml-3`}>PAC Settings</Text>
        </View>
        <ChevronRight size={20} color={isDark ? '#737373' : '#A3A3A3'} />
      </TouchableOpacity>

      {/* Filter Tabs */}
      <View className={`flex-row px-4 mb-3`}>
        {(['pending', 'all', 'completed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`mr-3 px-4 py-2 rounded-full ${
              filter === f
                ? 'bg-amber-100 dark:bg-amber-900'
                : cardBg
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                filter === f
                  ? 'text-amber-600 dark:text-amber-400'
                  : subtextColor
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reminders List */}
      <FlatList
        data={reminders}
        renderItem={ReminderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={isDark ? '#FFFFFF' : '#171717'}
          />
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <Bell size={48} color={isDark ? '#525252' : '#A3A3A3'} strokeWidth={1} />
            <Text className={`${subtextColor} text-center mt-4`}>
              {filter === 'pending'
                ? 'No upcoming reminders'
                : filter === 'completed'
                ? 'No completed reminders'
                : 'No reminders yet'}
            </Text>
            <Text className={`${subtextColor} text-center mt-2 text-sm px-8`}>
              YULA will detect your commitments and remind you proactively.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
