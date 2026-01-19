import { HeroUINativeProvider } from "heroui-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import "../global.css";

// Minimal shim for global.css if Uniwind/NativeWind requires it, 
// though tailwind.config.js + babel usually handles standard usage. 
// If `import "../global.css"` fails, we'll remove it.

export default function RootLayout() {
    return (
        <HeroUINativeProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
            </Stack>
            <StatusBar style="auto" />
        </HeroUINativeProvider>
    );
}
