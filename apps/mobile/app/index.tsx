import React from "react";
import { View, ScrollView, Text, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";

// Simple Avatar component
function Avatar({ src, fallback, size = "md" }: { src?: string; fallback: string; size?: "sm" | "md" | "lg" }) {
    const sizeMap = { sm: 32, md: 40, lg: 48 };
    const s = sizeMap[size];

    return (
        <View
            className="rounded-full bg-muted items-center justify-center overflow-hidden"
            style={{ width: s, height: s }}
        >
            {src ? (
                <Image source={{ uri: src }} style={{ width: s, height: s }} />
            ) : (
                <Text className="text-muted-foreground font-semibold">{fallback}</Text>
            )}
        </View>
    );
}

// Simple Card component
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <View className={`rounded-2xl ${className}`}>
            {children}
        </View>
    );
}

// Simple Button component
function Button({
    children,
    onPress,
    variant = "solid",
    className = ""
}: {
    children: React.ReactNode;
    onPress?: () => void;
    variant?: "solid" | "outline";
    className?: string;
}) {
    const baseClass = "px-4 py-3 rounded-xl items-center justify-center";
    const variantClass = variant === "solid"
        ? "bg-primary"
        : "bg-transparent border border-border";
    const textClass = variant === "solid" ? "text-primary-foreground" : "text-foreground";

    return (
        <Pressable
            onPress={onPress}
            className={`${baseClass} ${variantClass} ${className}`}
        >
            <Text className={`font-semibold ${textClass}`}>{children}</Text>
        </Pressable>
    );
}

export default function LandingPage() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView className="flex-1 px-5 pt-4">
                {/* Header */}
                <View className="flex-row justify-between items-center mb-10">
                    <View className="flex-row items-center gap-2">
                        <View className="w-8 h-8 bg-primary rounded-xl items-center justify-center">
                            <Text className="text-primary-foreground font-bold text-lg">Y</Text>
                        </View>
                        <Text className="text-2xl font-bold text-foreground">YULA</Text>
                    </View>
                    <Avatar
                        src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
                        fallback="JD"
                        size="sm"
                    />
                </View>

                {/* Hero Section */}
                <View className="mb-12">
                    <Text className="text-5xl font-bold text-foreground leading-tight mb-4">
                        Your second{"\n"}brain.
                    </Text>
                    <Text className="text-xl text-muted-foreground">
                        Everything you need to know,{"\n"}right at your fingertips.
                    </Text>
                </View>

                {/* Feature Grid (Bento Style) */}
                <View className="gap-4 mb-8">
                    {/* Large Card: Chat */}
                    <Card className="h-64 p-6 justify-between bg-secondary">
                        <View>
                            <View className="bg-background w-12 h-12 rounded-full items-center justify-center mb-4">
                                <Text className="text-xl">💬</Text>
                            </View>
                            <Text className="text-2xl font-bold text-foreground">Chat</Text>
                            <Text className="text-muted-foreground mt-1">Talk to your personalized agent.</Text>
                        </View>
                        <Button onPress={() => router.push("/(tabs)/chats")} className="self-start">
                            Open Chat
                        </Button>
                    </Card>

                    <View className="flex-row gap-4">
                        {/* Small Card: Memory */}
                        <Card className="flex-1 h-48 p-4 justify-between bg-secondary">
                            <View className="bg-background w-10 h-10 rounded-full items-center justify-center">
                                <Text className="text-lg">🧠</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-foreground">Memory</Text>
                                <Text className="text-xs text-muted-foreground">Recall anything.</Text>
                            </View>
                        </Card>

                        {/* Small Card: Tasks */}
                        <Card className="flex-1 h-48 p-4 justify-between bg-primary">
                            <View className="bg-white/10 w-10 h-10 rounded-full items-center justify-center">
                                <Text className="text-lg">✅</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-primary-foreground">Tasks</Text>
                                <Text className="text-xs text-primary-foreground/70">Stay on track.</Text>
                            </View>
                        </Card>
                    </View>

                    {/* Council Card */}
                    <Pressable onPress={() => router.push("/council")}>
                        <Card className="h-32 p-4 flex-row items-center bg-violet-600">
                            <View className="bg-white/20 w-12 h-12 rounded-full items-center justify-center mr-4">
                                <Text className="text-2xl">👥</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-xl font-bold text-white">Council</Text>
                                <Text className="text-white/70">Ask 4 AI models at once</Text>
                            </View>
                        </Card>
                    </Pressable>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
