/**
 * YULA Mobile - Tab Layout
 *
 * Bottom tab navigation with 5 main sections.
 */

import { Tabs } from 'expo-router';
import { useColorScheme, Platform } from 'react-native';
import { Home, MessageSquare, Users, Bell, User } from 'lucide-react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const activeColor = isDark ? '#FFFFFF' : '#171717';
  const inactiveColor = isDark ? '#737373' : '#A3A3A3';
  const backgroundColor = isDark ? '#0A0A0A' : '#FFFFFF';
  const borderColor = isDark ? '#262626' : '#E5E5E5';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor,
          borderTopColor: borderColor,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home
              size={24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <MessageSquare
              size={24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="council"
        options={{
          title: 'Council',
          tabBarIcon: ({ color, focused }) => (
            <Users
              size={24}
              color={focused ? '#8B5CF6' : color} // electric-violet when active
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="pac"
        options={{
          title: 'PAC',
          tabBarIcon: ({ color, focused }) => (
            <Bell
              size={24}
              color={focused ? '#F59E0B' : color} // electric-amber when active
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
          tabBarBadge: undefined, // Will be set dynamically for notifications
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User
              size={24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}
