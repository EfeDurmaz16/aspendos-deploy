"use client";

import { useRef } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatInput } from "@/components/chat/chat-input";
import { MemoryPanel } from "@/components/chat/memory-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarSimple, List } from "@phosphor-icons/react";
import { ImperativePanelHandle } from "@/components/ui/resizable";

export default function ChatPage() {
    const sidebarRef = useRef<ImperativePanelHandle>(null);
    const memoryRef = useRef<ImperativePanelHandle>(null);

    const toggleSidebar = () => {
        const panel = sidebarRef.current;
        console.log("Toggle Sidebar Clicked. Panel Ref:", panel);
        if (panel) {
            const collapsed = panel.isCollapsed();
            console.log("Is Collapsed:", collapsed);
            if (collapsed) {
                panel.resize(20);
            } else {
                panel.collapse();
            }
        }
    };

    const toggleMemory = () => {
        const panel = memoryRef.current;
        console.log("Toggle Memory Clicked. Panel Ref:", panel);
        if (panel) {
            const collapsed = panel.isCollapsed();
            console.log("Is Memory Collapsed:", collapsed);
            if (collapsed) {
                panel.resize(25);
            } else {
                panel.collapse();
            }
        }
    };

    return (
        <div className="h-screen bg-background overflow-hidden font-sans">
            <ResizablePanelGroup direction="horizontal">

                {/* Sidebar */}
                <ResizablePanel
                    ref={sidebarRef}
                    defaultSize={18}
                    minSize={15}
                    maxSize={25}
                    collapsible={true}
                    collapsedSize={0}
                    className="bg-zinc-50 dark:bg-black"
                >
                    <ChatSidebar />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Main Chat */}
                <ResizablePanel defaultSize={57}>
                    <div className="h-full flex flex-col relative bg-background dark:bg-zinc-950 dark:text-zinc-100">
                        {/* Header with Toggles */}
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-900 bg-background/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
                            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50" title="Toggle Sidebar">
                                <SidebarSimple weight="duotone" className="w-5 h-5" />
                            </Button>
                            <span className="text-xs font-medium text-zinc-400">GPT-4o</span>
                            <Button variant="ghost" size="icon" onClick={toggleMemory} className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50" title="Toggle Memory">
                                <List weight="duotone" className="w-5 h-5" />
                            </Button>
                        </div>

                        <ScrollArea className="flex-1 p-6 pt-20">
                            <div className="max-w-3xl mx-auto space-y-8 pb-32">
                                <Message
                                    role="assistant"
                                    content="Welcome back, Efe. I've loaded your context regarding the **Aspendos Launch**. We last discussed the landing page aesthetics. Ready to continue?"
                                    memoryRef="Aspendos Launch"
                                />
                                <Message
                                    role="user"
                                    content="Yes, let's focus on the typography. Can we mix Instrument Serif with Inter?"
                                />
                                <Message
                                    role="assistant"
                                    content="Absolutely. That's a classic **high-contrast** pairing. 

The strategy:
1. Use **Instrument Serif** for headlines to convey 'Human' warmth and prestige.
2. Use **Inter** for UI and body text for maximum legibility and 'Machine' precision.

This mirrors the Linear Method's approach to density but adds a editorial layer."
                                />
                            </div>
                        </ScrollArea>

                        <ChatInput />
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Memory Panel */}
                <ResizablePanel
                    ref={memoryRef}
                    defaultSize={25}
                    minSize={20}
                    maxSize={35}
                    collapsible={true}
                    collapsedSize={0}
                >
                    <MemoryPanel />
                </ResizablePanel>

            </ResizablePanelGroup>
        </div>
    );
}

function Message({ role, content, memoryRef }: { role: "user" | "assistant", content: string, memoryRef?: string }) {
    const isUser = role === "user";
    return (
        <div className={`flex gap-4 ${isUser ? "flex-row-reverse" : ""}`}>
            <Avatar className="w-8 h-8 mt-1 border border-zinc-200 dark:border-zinc-800">
                <AvatarFallback className={isUser ? "bg-zinc-200 text-zinc-700" : "bg-zinc-900 text-zinc-50 font-serif"}>
                    {isUser ? "EB" : "As"}
                </AvatarFallback>
            </Avatar>

            <div className={`flex flex-col max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-50">{isUser ? "You" : "Aspendos"}</span>
                    <span className="text-[11px] text-zinc-400">10:42 AM</span>
                </div>

                <div className={`text-[15px] leading-relaxed whitespace-pre-wrap ${isUser ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-600 dark:text-zinc-400"}`}>
                    {content}
                </div>

                {memoryRef && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] text-zinc-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Memory: {memoryRef}
                    </div>
                )}
            </div>
        </div>
    )
}
