/**
 * YULA Mobile - Login Screen
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const bgColor = isDark ? 'bg-gray-950' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-gray-100';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-300';

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement actual auth
      await new Promise((resolve) => setTimeout(resolve, 1500));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err) {
      setError('Invalid email or password');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Implement OAuth
    console.log('OAuth with:', provider);
  };

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          {/* Logo/Title */}
          <View className="items-center mb-12">
            <Text className={`text-4xl font-bold ${textColor}`}>YULA</Text>
            <Text className={`${subtextColor} mt-2`}>Welcome back</Text>
          </View>

          {/* Error */}
          {error && (
            <View className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg mb-4">
              <Text className="text-red-600 dark:text-red-400 text-center">
                {error}
              </Text>
            </View>
          )}

          {/* Email Input */}
          <View className={`flex-row items-center ${inputBg} rounded-xl px-4 mb-4`}>
            <Mail size={20} color={isDark ? '#737373' : '#A3A3A3'} />
            <TextInput
              placeholder="Email"
              placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className={`flex-1 py-4 px-3 text-base ${textColor}`}
            />
          </View>

          {/* Password Input */}
          <View className={`flex-row items-center ${inputBg} rounded-xl px-4 mb-4`}>
            <Lock size={20} color={isDark ? '#737373' : '#A3A3A3'} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              className={`flex-1 py-4 px-3 text-base ${textColor}`}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color={isDark ? '#737373' : '#A3A3A3'} />
              ) : (
                <Eye size={20} color={isDark ? '#737373' : '#A3A3A3'} />
              )}
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity className="self-end mb-6">
            <Text className="text-blue-500">Forgot password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            className={`py-4 rounded-xl items-center mb-6 ${
              isLoading
                ? 'bg-gray-400 dark:bg-gray-600'
                : 'bg-gray-900 dark:bg-white'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color={isDark ? '#171717' : '#FFFFFF'} />
            ) : (
              <Text className="text-white dark:text-gray-900 font-semibold text-base">
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className={`flex-1 h-px bg-gray-200 dark:bg-gray-700`} />
            <Text className={`mx-4 ${subtextColor}`}>or</Text>
            <View className={`flex-1 h-px bg-gray-200 dark:bg-gray-700`} />
          </View>

          {/* OAuth Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => handleOAuth('google')}
              className={`flex-row items-center justify-center py-3.5 rounded-xl border ${borderColor}`}
            >
              <Text className="text-xl mr-2">G</Text>
              <Text className={textColor}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleOAuth('apple')}
              className={`flex-row items-center justify-center py-3.5 rounded-xl border ${borderColor}`}
            >
              <Text className="text-xl mr-2"></Text>
              <Text className={textColor}>Continue with Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View className="flex-row justify-center mt-8">
            <Text className={subtextColor}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text className="text-blue-500 font-medium">Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
