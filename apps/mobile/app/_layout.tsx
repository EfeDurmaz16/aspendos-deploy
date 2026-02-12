/**
 * YULA Mobile - Root Layout
 *
 * Main application layout with providers and navigation setup.
 */

// Must be imported before any component that uses Reanimated
import 'react-native-reanimated';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';

import '../global.css';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 2,
    },
  },
});

// Custom theme based on YULA design system
const YulaLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#171717', // gray-900
    background: '#FFFFFF',
    card: '#FAFAFA', // gray-50
    text: '#171717',
    border: '#E5E5E5', // gray-200
    notification: '#F59E0B', // electric-amber
  },
};

const YulaDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#FFFFFF',
    background: '#0A0A0A', // gray-950
    card: '#171717', // gray-900
    text: '#FAFAFA',
    border: '#262626', // gray-800
    notification: '#F59E0B', // electric-amber
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide splash screen after app is ready
    const prepare = async () => {
      try {
        // Any async initialization can go here
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } finally {
        SplashScreen.hideAsync();
      }
    };

    prepare();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === 'dark' ? YulaDarkTheme : YulaLightTheme}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen
                name="chat/[id]"
                options={{
                  headerShown: true,
                  headerTitle: 'Chat',
                  headerBackTitle: 'Back',
                }}
              />
              <Stack.Screen
                name="council"
                options={{
                  headerShown: true,
                  headerTitle: 'Council',
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="import"
                options={{
                  headerShown: true,
                  headerTitle: 'Import',
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  headerShown: true,
                  headerTitle: 'Settings',
                }}
              />
            </Stack>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
