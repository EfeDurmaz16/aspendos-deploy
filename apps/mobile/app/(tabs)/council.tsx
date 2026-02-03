/**
 * YULA Mobile - Council Tab Screen
 *
 * Multi-model AI query interface with 4 personas.
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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Send,
  BookOpen,
  Lightbulb,
  BarChart3,
  Sparkles,
  Check,
} from 'lucide-react-native';

// Persona types
interface Persona {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  model: string;
}

interface CouncilResponse {
  personaId: string;
  content: string;
  isStreaming: boolean;
  latencyMs?: number;
}

const personas: Persona[] = [
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'Academic rigor',
    icon: BookOpen,
    color: '#F97316', // Coral
    model: 'claude-3-5-sonnet',
  },
  {
    id: 'creator',
    name: 'Creator',
    description: 'Innovation',
    icon: Lightbulb,
    color: '#10B981', // Sage Green
    model: 'gpt-4o',
  },
  {
    id: 'analyst',
    name: 'Analyst',
    description: 'Data-driven',
    icon: BarChart3,
    color: '#0EA5E9', // Sky Blue
    model: 'gemini-1.5-pro',
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Wisdom',
    icon: Sparkles,
    color: '#8B5CF6', // Violet
    model: 'llama-3.3-70b',
  },
];

export default function CouncilScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<CouncilResponse[]>([]);
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
    setResponses([]);
    setSelectedPersona(null);

    // Initialize empty responses for all personas
    setResponses(
      personas.map((p) => ({
        personaId: p.id,
        content: '',
        isStreaming: true,
      }))
    );

    // Simulate streaming responses (replace with actual API)
    for (const persona of personas) {
      setTimeout(() => {
        setResponses((prev) =>
          prev.map((r) =>
            r.personaId === persona.id
              ? {
                  ...r,
                  content: `[${persona.name}] This is a sample response to: "${query}"\n\nIn a real implementation, this would be streaming from ${persona.model}...`,
                  isStreaming: false,
                  latencyMs: Math.floor(Math.random() * 2000) + 500,
                }
              : r
          )
        );
      }, Math.random() * 2000 + 1000);
    }

    setTimeout(() => setIsLoading(false), 3500);
  };

  const PersonaCard = ({ persona, response }: { persona: Persona; response?: CouncilResponse }) => {
    const IconComponent = persona.icon;
    const isSelected = selectedPersona === persona.id;

    return (
      <TouchableOpacity
        onPress={() => response?.content && setSelectedPersona(persona.id)}
        className={`flex-1 min-w-[48%] p-3 rounded-xl border ${
          isSelected ? 'border-2' : borderColor
        } ${cardBg} mb-3`}
        style={isSelected ? { borderColor: persona.color } : undefined}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View className="flex-row items-center mb-2">
          <View
            className="w-8 h-8 rounded-lg items-center justify-center mr-2"
            style={{ backgroundColor: `${persona.color}20` }}
          >
            <IconComponent size={16} color={persona.color} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className={`font-semibold text-sm ${textColor}`}>
              {persona.name}
            </Text>
            <Text className={`text-xs ${subtextColor}`}>
              {persona.description}
            </Text>
          </View>
          {isSelected && (
            <View
              className="w-5 h-5 rounded-full items-center justify-center"
              style={{ backgroundColor: persona.color }}
            >
              <Check size={12} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
        </View>

        {/* Response */}
        <View className="min-h-[80px]">
          {response?.isStreaming ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color={persona.color} />
              <Text className={`${subtextColor} text-sm ml-2`}>Thinking...</Text>
            </View>
          ) : response?.content ? (
            <>
              <Text
                className={`text-sm ${textColor} leading-5`}
                numberOfLines={4}
              >
                {response.content}
              </Text>
              {response.latencyMs && (
                <Text className={`text-xs ${subtextColor} mt-2`}>
                  {(response.latencyMs / 1000).toFixed(1)}s
                </Text>
              )}
            </>
          ) : (
            <Text className={`text-sm ${subtextColor}`}>
              Waiting for query...
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 py-3">
          <Text className={`text-2xl font-bold ${textColor}`}>Council</Text>
          <Text className={`${subtextColor} mt-1`}>
            Ask 4 AI models at once, compare responses
          </Text>
        </View>

        {/* Persona Grid */}
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap justify-between">
            {personas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                response={responses.find((r) => r.personaId === persona.id)}
              />
            ))}
          </View>

          {/* Selected Response Detail */}
          {selectedPersona && (
            <View className={`p-4 rounded-xl ${cardBg} border ${borderColor} mb-4`}>
              <Text className={`font-semibold ${textColor} mb-2`}>
                {personas.find((p) => p.id === selectedPersona)?.name}'s Full Response
              </Text>
              <Text className={`${textColor} leading-6`}>
                {responses.find((r) => r.personaId === selectedPersona)?.content}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View className={`px-4 py-3 border-t ${borderColor}`}>
          <View className={`flex-row items-end ${inputBg} rounded-xl p-2`}>
            <TextInput
              placeholder="Ask the Council..."
              placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
              value={query}
              onChangeText={setQuery}
              multiline
              className={`flex-1 text-base ${textColor} max-h-24 px-2`}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!query.trim() || isLoading}
              className={`w-10 h-10 rounded-lg items-center justify-center ml-2 ${
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
    </SafeAreaView>
  );
}
