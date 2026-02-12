/**
 * YULA Mobile - Import Screen
 *
 * Import conversations from ChatGPT and Claude.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  X,
  Upload,
  FileJson,
  Check,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react-native';

type ImportSource = 'chatgpt' | 'claude';

interface ImportStep {
  id: string;
  title: string;
  description: string;
}

const chatgptSteps: ImportStep[] = [
  {
    id: '1',
    title: 'Go to ChatGPT Settings',
    description: 'Open ChatGPT → Settings → Data controls',
  },
  {
    id: '2',
    title: 'Export your data',
    description: 'Click "Export data" and wait for the email',
  },
  {
    id: '3',
    title: 'Download the ZIP file',
    description: 'Download and extract conversations.json',
  },
  {
    id: '4',
    title: 'Upload to YULA',
    description: 'Select the conversations.json file below',
  },
];

const claudeSteps: ImportStep[] = [
  {
    id: '1',
    title: 'Go to Claude Settings',
    description: 'Open Claude → Settings → Export',
  },
  {
    id: '2',
    title: 'Request export',
    description: 'Click "Export conversations"',
  },
  {
    id: '3',
    title: 'Download the file',
    description: 'Save the export file to your device',
  },
  {
    id: '4',
    title: 'Upload to YULA',
    description: 'Select the export file below',
  },
];

export default function ImportScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedSource, setSelectedSource] = useState<ImportSource>('chatgpt');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const bgColor = isDark ? 'bg-gray-950' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';

  const steps = selectedSource === 'chatgpt' ? chatgptSteps : claudeSteps;

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setSelectedFile(file);
    } catch (error) {
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setUploadProgress(i);
      }

      Alert.alert(
        'Import Started',
        'Your conversations are being imported. This may take a few minutes.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Upload Failed', 'Please try again later.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View className={`flex-1 ${bgColor}`}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <X size={24} color={isDark ? '#FFFFFF' : '#171717'} />
            </TouchableOpacity>
          ),
          headerTitle: 'Import',
        }}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Source Selector */}
        <View className="px-4 py-4">
          <Text className={`text-sm font-medium ${subtextColor} mb-3`}>
            SELECT SOURCE
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setSelectedSource('chatgpt')}
              className={`flex-1 p-4 rounded-xl border ${
                selectedSource === 'chatgpt'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : borderColor
              } ${cardBg}`}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-green-100 items-center justify-center">
                  <Text className="text-lg">🤖</Text>
                </View>
                <View className="ml-3">
                  <Text className={`font-semibold ${textColor}`}>ChatGPT</Text>
                  <Text className={`text-sm ${subtextColor}`}>OpenAI</Text>
                </View>
                {selectedSource === 'chatgpt' && (
                  <View className="ml-auto">
                    <Check size={20} color="#3B82F6" strokeWidth={3} />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedSource('claude')}
              className={`flex-1 p-4 rounded-xl border ${
                selectedSource === 'claude'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : borderColor
              } ${cardBg}`}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-orange-100 items-center justify-center">
                  <Text className="text-lg">🧡</Text>
                </View>
                <View className="ml-3">
                  <Text className={`font-semibold ${textColor}`}>Claude</Text>
                  <Text className={`text-sm ${subtextColor}`}>Anthropic</Text>
                </View>
                {selectedSource === 'claude' && (
                  <View className="ml-auto">
                    <Check size={20} color="#3B82F6" strokeWidth={3} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Instructions */}
        <View className="px-4 py-4">
          <Text className={`text-sm font-medium ${subtextColor} mb-3`}>
            HOW TO EXPORT
          </Text>
          <View className={`${cardBg} rounded-xl overflow-hidden`}>
            {steps.map((step, index) => (
              <View
                key={step.id}
                className={`flex-row p-4 ${
                  index < steps.length - 1 ? `border-b ${borderColor}` : ''
                }`}
              >
                <View className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center mr-3">
                  <Text className="text-blue-600 dark:text-blue-400 text-sm font-semibold">
                    {step.id}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className={`font-medium ${textColor}`}>{step.title}</Text>
                  <Text className={`text-sm ${subtextColor} mt-0.5`}>
                    {step.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Help link */}
          <TouchableOpacity className="flex-row items-center mt-3">
            <ExternalLink size={14} color="#3B82F6" />
            <Text className="text-blue-500 text-sm ml-1">
              View detailed guide
            </Text>
          </TouchableOpacity>
        </View>

        {/* File Upload */}
        <View className="px-4 py-4">
          <Text className={`text-sm font-medium ${subtextColor} mb-3`}>
            UPLOAD FILE
          </Text>

          <TouchableOpacity
            onPress={handlePickFile}
            className={`p-6 rounded-xl border-2 border-dashed ${borderColor} items-center`}
          >
            {selectedFile ? (
              <>
                <View className="w-12 h-12 rounded-lg bg-green-100 items-center justify-center mb-3">
                  <FileJson size={24} color="#10B981" />
                </View>
                <Text className={`font-medium ${textColor}`}>
                  {selectedFile.name}
                </Text>
                <Text className={`text-sm ${subtextColor} mt-1`}>
                  {((selectedFile.size || 0) / 1024 / 1024).toFixed(2)} MB
                </Text>
                <Text className="text-blue-500 text-sm mt-2">
                  Tap to change file
                </Text>
              </>
            ) : (
              <>
                <View className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 items-center justify-center mb-3">
                  <Upload size={24} color={isDark ? '#A3A3A3' : '#525252'} />
                </View>
                <Text className={`font-medium ${textColor}`}>
                  Select JSON file
                </Text>
                <Text className={`text-sm ${subtextColor} mt-1`}>
                  Tap to browse files
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Upload Progress */}
          {isUploading && (
            <View className="mt-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className={`text-sm ${textColor}`}>Uploading...</Text>
                <Text className={`text-sm ${subtextColor}`}>{uploadProgress}%</Text>
              </View>
              <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <View
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </View>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View className={`mx-4 mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20`}>
          <View className="flex-row items-start">
            <AlertCircle size={20} color="#3B82F6" />
            <View className="ml-3 flex-1">
              <Text className="text-blue-700 dark:text-blue-300 font-medium">
                Your data is safe
              </Text>
              <Text className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                Imported conversations are stored securely and never shared.
                You can delete them anytime from settings.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className={`px-4 py-4 border-t ${borderColor}`}>
        <TouchableOpacity
          onPress={handleUpload}
          disabled={!selectedFile || isUploading}
          className={`py-4 rounded-xl items-center ${
            selectedFile && !isUploading
              ? 'bg-blue-500'
              : isDark
              ? 'bg-gray-800'
              : 'bg-gray-200'
          }`}
        >
          <Text
            className={`font-semibold ${
              selectedFile && !isUploading
                ? 'text-white'
                : subtextColor
            }`}
          >
            {isUploading ? 'Uploading...' : 'Start Import'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
