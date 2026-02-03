/**
 * YULA Mobile - Sign Up Screen
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
  ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User, Eye, EyeOff, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function SignUpScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const bgColor = isDark ? 'bg-gray-950' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-gray-100';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-300';

  // Password strength
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the terms and conditions');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (passwordStrength < 3) {
      setError('Please use a stronger password');
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
      setError('Failed to create account. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 py-8">
            {/* Logo/Title */}
            <View className="items-center mb-10">
              <Text className={`text-4xl font-bold ${textColor}`}>YULA</Text>
              <Text className={`${subtextColor} mt-2`}>Create your account</Text>
              <View className="flex-row items-center mt-2 bg-violet-100 dark:bg-violet-900/30 px-3 py-1 rounded-full">
                <Text className="text-violet-600 dark:text-violet-400 text-sm">
                  7-day Pro trial included
                </Text>
              </View>
            </View>

            {/* Error */}
            {error && (
              <View className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg mb-4">
                <Text className="text-red-600 dark:text-red-400 text-center">
                  {error}
                </Text>
              </View>
            )}

            {/* Name Input */}
            <View className={`flex-row items-center ${inputBg} rounded-xl px-4 mb-4`}>
              <User size={20} color={isDark ? '#737373' : '#A3A3A3'} />
              <TextInput
                placeholder="Full name"
                placeholderTextColor={isDark ? '#737373' : '#A3A3A3'}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                className={`flex-1 py-4 px-3 text-base ${textColor}`}
              />
            </View>

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
            <View className={`flex-row items-center ${inputBg} rounded-xl px-4 mb-3`}>
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

            {/* Password Strength */}
            {password.length > 0 && (
              <View className="mb-4">
                <View className="flex-row gap-1 mb-2">
                  {[1, 2, 3].map((level) => (
                    <View
                      key={level}
                      className={`flex-1 h-1 rounded-full ${
                        passwordStrength >= level
                          ? passwordStrength === 1
                            ? 'bg-red-500'
                            : passwordStrength === 2
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  ))}
                </View>
                <View className="gap-1">
                  <PasswordCheck label="At least 8 characters" passed={passwordChecks.length} isDark={isDark} />
                  <PasswordCheck label="One uppercase letter" passed={passwordChecks.uppercase} isDark={isDark} />
                  <PasswordCheck label="One number" passed={passwordChecks.number} isDark={isDark} />
                </View>
              </View>
            )}

            {/* Terms Checkbox */}
            <TouchableOpacity
              onPress={() => setAcceptTerms(!acceptTerms)}
              className="flex-row items-start mb-6"
            >
              <View
                className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                  acceptTerms
                    ? 'bg-blue-500 border-blue-500'
                    : `${borderColor} border`
                }`}
              >
                {acceptTerms && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text className={`flex-1 ${subtextColor} text-sm`}>
                I agree to the{' '}
                <Text className="text-blue-500">Terms of Service</Text> and{' '}
                <Text className="text-blue-500">Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Sign Up Button */}
            <TouchableOpacity
              onPress={handleSignUp}
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
                  Create Account
                </Text>
              )}
            </TouchableOpacity>

            {/* Sign In Link */}
            <View className="flex-row justify-center">
              <Text className={subtextColor}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-blue-500 font-medium">Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordCheck({
  label,
  passed,
  isDark,
}: {
  label: string;
  passed: boolean;
  isDark: boolean;
}) {
  return (
    <View className="flex-row items-center">
      <View
        className={`w-4 h-4 rounded-full items-center justify-center mr-2 ${
          passed ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        {passed && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
      </View>
      <Text
        className={`text-sm ${
          passed
            ? 'text-green-600 dark:text-green-400'
            : isDark
            ? 'text-gray-500'
            : 'text-gray-400'
        }`}
      >
        {label}
      </Text>
    </View>
  );
}
