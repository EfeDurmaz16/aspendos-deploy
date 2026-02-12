/**
 * YULA Mobile - Council Modal Screen
 *
 * Full-screen council query interface (modal presentation).
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Send,
  BookOpen,
  Lightbulb,
  BarChart3,
  Sparkles,
  Check,
  Copy,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

interface Persona {
  id: string;
  name: string;
  model: string;
  icon: React.ComponentType<any>;
  color: string;
}

interface Response {
  personaId: string;
  content: string;
  isStreaming: boolean;
  latencyMs?: number;
}

const personas: Persona[] = [
  { id: 'scholar', name: 'Scholar', model: 'Claude', icon: BookOpen, color: '#F97316' },
  { id: 'creator', name: 'Creator', model: 'GPT-4', icon: Lightbulb, color: '#10B981' },
  { id: 'analyst', name: 'Analyst', model: 'Gemini', icon: BarChart3, color: '#0EA5E9' },
  { id: 'sage', name: 'Sage', model: 'Llama', icon: Sparkles, color: '#8B5CF6' },
];

export default function CouncilModal() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<Response[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

  const bgColor = isDark ? 'bg-gray-950' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-gray-100';

  const handleSubmit = async () => {
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setSelectedPersona(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Initialize streaming
    setResponses(
      personas.map((p) => ({
        personaId: p.id,
        content: '',
        isStreaming: true,
      }))
    );

    // Simulate parallel streaming
    for (const persona of personas) {
      const delay = Math.random() * 2000 + 1000;
      setTimeout(() => {
        const sampleResponse = `As the ${persona.name}, I would approach "${query}" with ${
          persona.id === 'scholar'
            ? 'rigorous analysis and academic perspective...'
            : persona.id === 'creator'
            ? 'creative thinking and innovative solutions...'
            : persona.id === 'analyst'
            ? 'data-driven insights and practical recommendations...'
            : 'wisdom gathered from diverse perspectives...'
        }`;

        setResponses((prev) =>
          prev.map((r) =>
            r.personaId === persona.id
              ? {
                  ...r,
                  content: sampleResponse,
                  isStreaming: false,
                  latencyMs: delay,
                }
              : r
          )
        );
      }, delay);
    }

    setTimeout(() => setIsLoading(false), 3500);
  };

  const handleCopy = async (content: string) => {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleUseResponse = (personaId: string) => {
    setSelectedPersona(personaId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // In real implementation, this would continue the conversation with this response
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 ${bgColor}`}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <X size={24} color={isDark ? '#FFFFFF' : '#171717'} />
            </TouchableOpacity>
          ),
          headerTitle: 'Council',
        }}
      />

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        {responses.length === 0 && (
          <View className="items-center py-8">
            <View className="flex-row mb-4">
              {personas.map((p) => (
                <View
                  key={p.id}
                  className="w-10 h-10 rounded-full items-center justify-center mx-1"
                  style={{ backgroundColor: `${p.color}20` }}
                >
                  <p.icon size={20} color={p.color} />
                </View>
              ))}
            </View>
            <Text className={`text-lg font-semibold ${textColor} text-center mb-2`}>
              Ask the Council
            </Text>
            <Text className={`${subtextColor} text-center px-8`}>
              Get diverse perspectives from 4 AI models at once.
              Compare responses and choose the best answer.
            </Text>
          </View>
        )}

        {/* Responses Grid */}
        {responses.length > 0 && (
          <View className="flex-row flex-wrap justify-between">
            {personas.map((persona) => {
              const response = responses.find((r) => r.personaId === persona.id);
              const isSelected = selectedPersona === persona.id;
              const Icon = persona.icon;

              return (
                <View
                  key={persona.id}
                  className={`w-[48%] mb-4 p-3 rounded-xl border ${
                    isSelected ? 'border-2' : borderColor
                  } ${cardBg}`}
                  style={isSelected ? { borderColor: persona.color } : undefined}
                >
                  {/* Header */}
                  <View className="flex-row items-center mb-2">
                    <View
                      className="w-7 h-7 rounded-lg items-center justify-center"
                      style={{ backgroundColor: `${persona.color}20` }}
                    >
                      <Icon size={14} color={persona.color} />
                    </View>
                    <View className="ml-2 flex-1">
                      <Text className={`font-semibold text-sm ${textColor}`}>
                        {persona.name}
                      </Text>
                      <Text className={`text-xs ${subtextColor}`}>
                        {persona.model}
                      </Text>
                    </View>
                  </View>

                  {/* Content */}
                  <View className="min-h-[100px]">
                    {response?.isStreaming ? (
                      <View className="flex-row items-center">
                        <ActivityIndicator size="small" color={persona.color} />
                        <Text className={`${subtextColor} text-sm ml-2`}>
                          Thinking...
                        </Text>
                      </View>
                    ) : response?.content ? (
                      <Text
                        className={`text-sm ${textColor} leading-5`}
                        numberOfLines={5}
                      >
                        {response.content}
                      </Text>
                    ) : null}
                  </View>

                  {/* Actions */}
                  {response?.content && !response.isStreaming && (
                    <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <TouchableOpacity
                        onPress={() => handleCopy(response.content)}
                        className="p-1"
                      >
                        <Copy size={14} color={isDark ? '#737373' : '#A3A3A3'} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleUseResponse(persona.id)}
                        className={`px-2 py-1 rounded-md ${
                          isSelected ? '' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                        style={isSelected ? { backgroundColor: persona.color } : undefined}
                      >
                        {isSelected ? (
                          <View className="flex-row items-center">
                            <Check size={12} color="#FFFFFF" strokeWidth={3} />
                            <Text className="text-white text-xs font-medium ml-1">
                              Selected
                            </Text>
                          </View>
                        ) : (
                          <Text className={`text-xs font-medium ${textColor}`}>
                            Use
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Latency */}
                  {response?.latencyMs && (
                    <Text className={`text-xs ${subtextColor} mt-1`}>
                      {(response.latencyMs / 1000).toFixed(1)}s
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View className={`px-4 py-3 border-t ${borderColor}`}>
        <View className={`flex-row items-end ${inputBg} rounded-xl p-2`}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ask the Council..."
            placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
            multiline
            className={`flex-1 text-base ${textColor} max-h-24 px-2`}
            editable={!isLoading}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!query.trim() || isLoading}
            className={`w-10 h-10 rounded-lg items-center justify-center ${
              query.trim() && !isLoading
                ? 'bg-violet-500'
                : isDark
                ? 'bg-gray-700'
                : 'bg-gray-300'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send
                size={18}
                color={query.trim() ? '#FFFFFF' : isDark ? '#737373' : '#A3A3A3'}
                strokeWidth={2}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
