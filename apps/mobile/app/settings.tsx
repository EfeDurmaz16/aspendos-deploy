/**
 * YULA Mobile - Settings Screen
 *
 * Application settings and preferences.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Switch,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Bell,
  Moon,
  Globe,
  Cpu,
  Database,
  Trash2,
  Download,
  Shield,
  HelpCircle,
  Mail,
  ChevronRight,
  Wifi,
  WifiOff,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [pacEnabled, setPacEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(isDark);
  const [offlineMode, setOfflineMode] = useState(false);
  const [localAI, setLocalAI] = useState(false);

  const bgColor = isDark ? 'bg-gray-950' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';

  const handleDeleteData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your conversations, memories, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => console.log('Delete all data'),
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'We will prepare your data export. You will receive a notification when it is ready to download.',
      [{ text: 'OK' }]
    );
  };

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View className="mb-6">
      <Text className={`text-xs font-medium ${subtextColor} mb-2 px-4 uppercase`}>
        {title}
      </Text>
      <View className={`${cardBg} mx-4 rounded-xl overflow-hidden`}>
        {children}
      </View>
    </View>
  );

  const SettingRow = ({
    icon: Icon,
    iconColor,
    label,
    description,
    value,
    onToggle,
    onPress,
    showChevron = false,
    isDestructive = false,
    isLast = false,
  }: {
    icon: React.ComponentType<any>;
    iconColor?: string;
    label: string;
    description?: string;
    value?: boolean;
    onToggle?: (value: boolean) => void;
    onPress?: () => void;
    showChevron?: boolean;
    isDestructive?: boolean;
    isLast?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !onToggle}
      className={`flex-row items-center px-4 py-3.5 ${
        !isLast ? `border-b ${borderColor}` : ''
      }`}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View
        className="w-8 h-8 rounded-lg items-center justify-center mr-3"
        style={{ backgroundColor: `${iconColor || '#737373'}15` }}
      >
        <Icon
          size={18}
          color={isDestructive ? '#EF4444' : iconColor || (isDark ? '#A3A3A3' : '#525252')}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`${isDestructive ? 'text-red-500' : textColor}`}
        >
          {label}
        </Text>
        {description && (
          <Text className={`text-sm ${subtextColor} mt-0.5`}>
            {description}
          </Text>
        )}
      </View>
      {onToggle !== undefined && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#D4D4D4', true: '#3B82F6' }}
          thumbColor="#FFFFFF"
        />
      )}
      {showChevron && (
        <ChevronRight size={18} color={isDark ? '#525252' : '#A3A3A3'} />
      )}
    </TouchableOpacity>
  );

  return (
    <View className={`flex-1 ${bgColor}`}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ChevronLeft size={24} color={isDark ? '#FFFFFF' : '#171717'} />
            </TouchableOpacity>
          ),
          headerTitle: 'Settings',
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} className="pt-4">
        {/* Notifications */}
        <Section title="Notifications">
          <SettingRow
            icon={Bell}
            iconColor="#F59E0B"
            label="Push Notifications"
            description="Receive alerts for reminders and updates"
            value={notifications}
            onToggle={setNotifications}
          />
          <SettingRow
            icon={Bell}
            iconColor="#8B5CF6"
            label="PAC Reminders"
            description="Proactive callback notifications"
            value={pacEnabled}
            onToggle={setPacEnabled}
            isLast
          />
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <SettingRow
            icon={Moon}
            iconColor="#6366F1"
            label="Dark Mode"
            description="Use dark theme"
            value={darkMode}
            onToggle={setDarkMode}
          />
          <SettingRow
            icon={Globe}
            iconColor="#0EA5E9"
            label="Language"
            description="English"
            onPress={() => {}}
            showChevron
            isLast
          />
        </Section>

        {/* AI & Offline */}
        <Section title="AI & Offline">
          <SettingRow
            icon={offlineMode ? WifiOff : Wifi}
            iconColor="#10B981"
            label="Offline Mode"
            description="Cache conversations for offline access"
            value={offlineMode}
            onToggle={setOfflineMode}
          />
          <SettingRow
            icon={Cpu}
            iconColor="#F97316"
            label="Local AI"
            description="Run small models on device"
            value={localAI}
            onToggle={setLocalAI}
          />
          <SettingRow
            icon={Database}
            iconColor="#737373"
            label="Manage Storage"
            description="View and clear cached data"
            onPress={() => {}}
            showChevron
            isLast
          />
        </Section>

        {/* Data */}
        <Section title="Data & Privacy">
          <SettingRow
            icon={Download}
            iconColor="#3B82F6"
            label="Export Data"
            description="Download all your conversations"
            onPress={handleExportData}
            showChevron
          />
          <SettingRow
            icon={Shield}
            iconColor="#10B981"
            label="Privacy Settings"
            onPress={() => {}}
            showChevron
          />
          <SettingRow
            icon={Trash2}
            iconColor="#EF4444"
            label="Delete All Data"
            description="Permanently remove all your data"
            onPress={handleDeleteData}
            isDestructive
            isLast
          />
        </Section>

        {/* Support */}
        <Section title="Support">
          <SettingRow
            icon={HelpCircle}
            iconColor="#737373"
            label="Help Center"
            onPress={() => {}}
            showChevron
          />
          <SettingRow
            icon={Mail}
            iconColor="#737373"
            label="Contact Support"
            description="support@yula.ai"
            onPress={() => {}}
            showChevron
            isLast
          />
        </Section>

        {/* Version Info */}
        <View className="items-center py-8">
          <Text className={`${subtextColor} text-sm`}>YULA Mobile</Text>
          <Text className={`${subtextColor} text-xs mt-1`}>Version 0.1.0 (Build 1)</Text>
        </View>
      </ScrollView>
    </View>
  );
}
