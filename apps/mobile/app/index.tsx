import React from "react";
import { View, ScrollView, Text, Image, SafeAreaView } from "react-native";
import { Button, Card, Avatar, useThemeColor } from "heroui-native";
import { Stack } from "expo-router";

export default function LandingPage() {
    const [accent, bg, fg, muted] = useThemeColor([
        "accent",
        "background",
        "foreground",
        "muted"
    ]);

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView className="flex-1 px-5 pt-4">
                {/* Header */}
                <View className="flex-row justify-between items-center mb-10">
                    <View className="flex-row items-center gap-2">
                        <View className="w-8 h-8 bg-primary rounded-xl items-center justify-center">
                            <Text className="text-primary-foreground font-bold text-lg">A</Text>
                        </View>
                        <Text className="text-2xl font-bold text-foreground font-sans">Aspendos</Text>
                    </View>
                    <Avatar
                        src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
                        fallback="JD"
                        size="sm"
                    />
                </View>

                {/* Hero Section */}
                <View className="mb-12">
                    <Text className="text-5xl font-bold text-foreground leading-[1.1] mb-4 font-sans">
                        Your second{"\n"}brain.
                    </Text>
                    <Text className="text-xl text-muted-foreground font-sans">
                        Everything you need to know,{"\n"}right at your fingertips.
                    </Text>
                </View>

                {/* Feature Grid (Bento Style) */}
                <View className="gap-4 mb-8">
                    {/* Large Card: Chat */}
                    <Card className="h-64 p-6 justify-between bg-secondary border-0">
                        <View>
                            <View className="bg-background w-12 h-12 rounded-full items-center justify-center mb-4">
                                <Text className="text-xl">💬</Text>
                            </View>
                            <Text className="text-2xl font-bold text-card-foreground">Chat</Text>
                            <Text className="text-muted-foreground mt-1">Talk to your personalized agent.</Text>
                        </View>
                        <Button variant="solid" color="primary" className="self-start">
                            <Button.Label>Open Chat</Button.Label>
                        </Button>
                    </Card>

                    <View className="flex-row gap-4">
                        {/* Small Card: Memory */}
                        <Card className="flex-1 h-48 p-4 justify-between bg-secondary border-0">
                            <View className="bg-background w-10 h-10 rounded-full items-center justify-center">
                                <Text className="text-lg">🧠</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-card-foreground">Memory</Text>
                                <Text className="text-xs text-muted-foreground">Recall anything.</Text>
                            </View>
                        </Card>

                        {/* Small Card: Tasks */}
                        <Card className="flex-1 h-48 p-4 justify-between bg-primary border-0">
                            <View className="bg-white/10 w-10 h-10 rounded-full items-center justify-center">
                                <Text className="text-lg text-white">✅</Text>
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-white">Tasks</Text>
                                <Text className="text-xs text-white/70">Stay on track.</Text>
                            </View>
                        </Card>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
