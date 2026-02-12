/**
 * YULA Mobile - Profile Screen
 *
 * User profile, settings, and account management.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Settings,
  CreditCard,
  Bell,
  Moon,
  Globe,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Sparkles,
  Flame,
  Trophy,
} from 'lucide-react-native';

// Mock user data
const mockUser = {
  name: 'Efe Durmaz',
  email: 'efebarandurmaz05@gmail.com',
  avatar: null,
  tier: 'pro',
  xp: 2450,
  level: 5,
  streak: 12,
  achievements: 8,
};

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);

  const bgColor = isDark ? 'bg-gray-950' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => console.log('Logout') },
    ]);
  };

  const MenuSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View className="mb-6">
      <Text className={`text-xs font-medium ${subtextColor} mb-2 px-4`}>
        {title}
      </Text>
      <View className={`${cardBg} rounded-xl overflow-hidden mx-4`}>
        {children}
      </View>
    </View>
  );

  const MenuItem = ({
    icon: Icon,
    iconColor,
    label,
    value,
    onPress,
    showChevron = true,
    isLast = false,
  }: {
    icon: React.ComponentType<any>;
    iconColor?: string;
    label: string;
    value?: string;
    onPress?: () => void;
    showChevron?: boolean;
    isLast?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center px-4 py-3.5 ${
        !isLast ? `border-b ${borderColor}` : ''
      }`}
      activeOpacity={0.7}
    >
      <View
        className="w-8 h-8 rounded-lg items-center justify-center mr-3"
        style={{ backgroundColor: `${iconColor || '#737373'}15` }}
      >
        <Icon size={18} color={iconColor || (isDark ? '#A3A3A3' : '#525252')} />
      </View>
      <Text className={`flex-1 ${textColor}`}>{label}</Text>
      {value && <Text className={`${subtextColor} mr-2`}>{value}</Text>}
      {showChevron && (
        <ChevronRight size={18} color={isDark ? '#525252' : '#A3A3A3'} />
      )}
    </TouchableOpacity>
  );

  // Calculate level progress
  const currentLevelXP = Math.pow(mockUser.level - 1, 2) * 100;
  const nextLevelXP = Math.pow(mockUser.level, 2) * 100;
  const levelProgress = (mockUser.xp - currentLevelXP) / (nextLevelXP - currentLevelXP);

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-4 py-3">
          <Text className={`text-2xl font-bold ${textColor}`}>Profile</Text>
        </View>

        {/* User Card */}
        <View className={`mx-4 mb-6 p-4 rounded-xl ${cardBg} border ${borderColor}`}>
          <View className="flex-row items-center">
            {/* Avatar */}
            <View className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center mr-4">
              {mockUser.avatar ? (
                <Image
                  source={{ uri: mockUser.avatar }}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <User size={28} color={isDark ? '#A3A3A3' : '#525252'} />
              )}
            </View>

            {/* Info */}
            <View className="flex-1">
              <Text className={`text-lg font-semibold ${textColor}`}>
                {mockUser.name}
              </Text>
              <Text className={`${subtextColor} text-sm`}>{mockUser.email}</Text>
              <View className="flex-row items-center mt-1">
                <View className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900 rounded">
                  <Text className="text-violet-600 dark:text-violet-400 text-xs font-medium">
                    {mockUser.tier.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View className="flex-row mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <View className="flex-1 items-center">
              <View className="flex-row items-center">
                <Sparkles size={16} color="#8B5CF6" />
                <Text className={`font-bold ${textColor} ml-1`}>
                  {mockUser.xp.toLocaleString()}
                </Text>
              </View>
              <Text className={`text-xs ${subtextColor}`}>XP</Text>
            </View>
            <View className="flex-1 items-center border-x border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center">
                <Flame size={16} color="#F59E0B" />
                <Text className={`font-bold ${textColor} ml-1`}>
                  {mockUser.streak}
                </Text>
              </View>
              <Text className={`text-xs ${subtextColor}`}>Day Streak</Text>
            </View>
            <View className="flex-1 items-center">
              <View className="flex-row items-center">
                <Trophy size={16} color="#10B981" />
                <Text className={`font-bold ${textColor} ml-1`}>
                  {mockUser.achievements}
                </Text>
              </View>
              <Text className={`text-xs ${subtextColor}`}>Achievements</Text>
            </View>
          </View>

          {/* Level Progress */}
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-1">
              <Text className={`text-sm ${subtextColor}`}>
                Level {mockUser.level}
              </Text>
              <Text className={`text-sm ${subtextColor}`}>
                {mockUser.xp - currentLevelXP} / {nextLevelXP - currentLevelXP} XP
              </Text>
            </View>
            <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <View
                className="h-full bg-violet-500 rounded-full"
                style={{ width: `${levelProgress * 100}%` }}
              />
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <MenuSection title="ACCOUNT">
          <MenuItem
            icon={User}
            iconColor="#3B82F6"
            label="Edit Profile"
            onPress={() => router.push('/settings')}
          />
          <MenuItem
            icon={CreditCard}
            iconColor="#10B981"
            label="Subscription"
            value={mockUser.tier.charAt(0).toUpperCase() + mockUser.tier.slice(1)}
            onPress={() => {}}
          />
          <MenuItem
            icon={Shield}
            iconColor="#F59E0B"
            label="Privacy & Security"
            onPress={() => {}}
            isLast
          />
        </MenuSection>

        <MenuSection title="PREFERENCES">
          <MenuItem
            icon={Bell}
            iconColor="#8B5CF6"
            label="Notifications"
            onPress={() => {}}
          />
          <MenuItem
            icon={Moon}
            iconColor="#6366F1"
            label="Appearance"
            value={isDark ? 'Dark' : 'Light'}
            onPress={() => {}}
          />
          <MenuItem
            icon={Globe}
            iconColor="#0EA5E9"
            label="Language"
            value="English"
            onPress={() => {}}
            isLast
          />
        </MenuSection>

        <MenuSection title="SUPPORT">
          <MenuItem
            icon={HelpCircle}
            iconColor="#737373"
            label="Help & Support"
            onPress={() => {}}
          />
          <MenuItem
            icon={Settings}
            iconColor="#737373"
            label="Advanced Settings"
            onPress={() => router.push('/settings')}
            isLast
          />
        </MenuSection>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleLogout}
          className={`mx-4 mb-8 p-4 rounded-xl ${cardBg} flex-row items-center justify-center`}
        >
          <LogOut size={18} color="#EF4444" />
          <Text className="text-red-500 font-medium ml-2">Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text className={`text-center ${subtextColor} text-xs mb-8`}>
          YULA v0.1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
