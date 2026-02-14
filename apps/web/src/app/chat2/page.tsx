'use client';

import {
    ArrowLeft,
    Brain,
    CircleNotch,
    List,
    PaperPlaneTilt,
    Plus,
    SidebarSimple,
    Sparkle,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import rehypeKatex from 'rehype-katex';
// Streamdown plugins for markdown rendering
import remarkMath from 'remark-math';
// AI Elements - ONLY Vercel AI Elements for chat UI
import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
    Message,
    MessageAttachment,
    MessageAttachments,
    MessageContent,
    MessageResponse,
} from '@/components/ai-elements/message';
import {
    ModelSelector,
    ModelSelectorContent,
    ModelSelectorEmpty,
    ModelSelectorGroup,
    ModelSelectorInput,
    ModelSelectorItem,
    ModelSelectorList,
    ModelSelectorLogo,
    ModelSelectorLogoGroup,
    ModelSelectorName,
    ModelSelectorShortcut,
    ModelSelectorTrigger,
} from '@/components/ai-elements/model-selector';
import {
    PromptInput,
    PromptInputActionAddAttachments,
    PromptInputActionMenu,
    PromptInputActionMenuContent,
    PromptInputActionMenuTrigger,
    PromptInputAttachment,
    PromptInputAttachments,
    PromptInputBody,
    PromptInputButton,
    PromptInputFooter,
    PromptInputHeader,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';

// Demo message type
interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// Demo chat type
interface Chat {
    id: string;
    title: string;
    messages: ChatMessage[];
    model: string;
    createdAt: Date;
}

// Available models for the cinematic theme - grouped by provider
const MODEL_GROUPS = {
    openai: {
        label: 'OpenAI',
        providerId: 'openai' as const,
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
        ],
    },
    anthropic: {
        label: 'Anthropic',
        providerId: 'anthropic' as const,
        models: [
            {
                id: 'claude-sonnet-4-5',
                name: 'Claude Sonnet 4.5',
                description: 'Balanced performance',
            },
            { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', description: 'Fast responses' },
        ],
    },
    google: {
        label: 'Google',
        providerId: 'google' as const,
        models: [{ id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Ultra-fast' }],
    },
    meta: {
        label: 'Meta',
        providerId: 'llama' as const,
        models: [
            { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', description: 'Open source, powerful' },
            { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', description: 'Lightweight' },
        ],
    },
    deepseek: {
        label: 'DeepSeek',
        providerId: 'deepseek' as const,
        models: [
            { id: 'deepseek-r1', name: 'DeepSeek R1', description: 'Chain of thought' },
            { id: 'deepseek-v3', name: 'DeepSeek V3', description: 'Latest model' },
        ],
    },
};

// Flatten models for quick lookup
const ALL_MODELS = Object.values(MODEL_GROUPS).flatMap((group) =>
    group.models.map((model) => ({ ...model, provider: group.label, providerId: group.providerId }))
);

// Suggested prompts for empty state
const SUGGESTED_PROMPTS = [
    { label: 'Explain quantum computing', icon: Brain },
    { label: 'Write a haiku about code', icon: Sparkle },
    { label: 'Debug my React component', icon: List },
    { label: 'Plan a weekend trip', icon: PaperPlaneTilt },
];

// Cinematic chat sidebar
function ChatSidebar({
    chats,
    currentChatId,
    onNewChat,
    onSelectChat,
    isOpen,
}: {
    chats: Chat[];
    currentChatId: string | null;
    onNewChat: () => void;
    onSelectChat: (id: string) => void;
    isOpen: boolean;
}) {
    return (
        <motion.aside
            initial={false}
            animate={{ width: isOpen ? 280 : 0, opacity: isOpen ? 1 : 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-zinc-950/80 border-r border-zinc-800 overflow-hidden flex-shrink-0"
        >
            <div className="h-full flex flex-col p-4 w-[280px]">
                {/* Sidebar Header */}
                <div className="mb-6">
                    <Link href="/v2" className="font-serif text-2xl text-white tracking-tight">
                        Yula
                    </Link>
                </div>

                {/* New Chat Button */}
                <button
                    onClick={onNewChat}
                    className="w-full mb-6 py-3 px-4 border border-zinc-800 text-zinc-300 hover:border-cyan-500/50 hover:text-white transition-all duration-300 flex items-center gap-3 group"
                >
                    <Plus className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono text-sm tracking-wide">New Chat</span>
                </button>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto space-y-1">
                    <div className="font-mono text-xs text-zinc-600 tracking-widest uppercase mb-3">
                        Recent
                    </div>
                    {chats.map((chat) => (
                        <button
                            key={chat.id}
                            onClick={() => onSelectChat(chat.id)}
                            className={cn(
                                'w-full py-2 px-3 text-left text-sm truncate transition-all duration-200',
                                currentChatId === chat.id
                                    ? 'text-white bg-zinc-800/50 border-l-2 border-cyan-500'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                            )}
                        >
                            {chat.title}
                        </button>
                    ))}
                </div>

                {/* Sidebar Footer */}
                <div className="pt-4 border-t border-zinc-800">
                    <Link
                        href="/pricing2"
                        className="text-xs text-zinc-600 hover:text-cyan-400 transition-colors font-mono tracking-wide"
                    >
                        Upgrade to Pro
                    </Link>
                </div>
            </div>
        </motion.aside>
    );
}

// Cinematic empty state with suggestions
function CinematicEmptyState({
    onSuggestionClick,
}: {
    onSuggestionClick: (prompt: string) => void;
}) {
    return (
        <ConversationEmptyState className="h-full flex flex-col items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="text-center max-w-2xl px-6"
            >
                {/* Logo/Icon */}
                <div className="w-16 h-16 mx-auto mb-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-cyan-400" weight="thin" />
                </div>

                {/* Headline */}
                <h1 className="text-4xl md:text-5xl font-serif text-white mb-4 leading-tight">
                    What would you like to know?
                </h1>
                <p className="text-zinc-500 text-lg mb-12 font-light">
                    Ask anything. I&apos;ll remember our conversation.
                </p>

                {/* Suggestion Grid */}
                <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                    {SUGGESTED_PROMPTS.map((prompt, index) => (
                        <motion.button
                            key={prompt.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                            onClick={() => onSuggestionClick(prompt.label)}
                            className="p-4 border border-zinc-800 bg-zinc-950/50 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all duration-300 text-left group"
                        >
                            <prompt.icon className="w-5 h-5 text-cyan-400 mb-2" weight="thin" />
                            <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
                                {prompt.label}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </ConversationEmptyState>
    );
}

export default function Chat2Page() {
    // State
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [selectedModel, setSelectedModel] = useState('gpt-4o');
    const [currentChatId, setCurrentChatId] = useState<string | null>('demo-1');
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

    // Demo chats for sidebar
    const [chats] = useState<Chat[]>([
        {
            id: 'demo-1',
            title: 'Current conversation',
            messages: [],
            model: 'gpt-4o',
            createdAt: new Date(),
        },
        {
            id: 'demo-2',
            title: 'Code review session',
            messages: [],
            model: 'claude-opus',
            createdAt: new Date(Date.now() - 86400000),
        },
        {
            id: 'demo-3',
            title: 'Research notes',
            messages: [],
            model: 'gemini-pro',
            createdAt: new Date(Date.now() - 172800000),
        },
    ]);

    // Ref for auto-scroll
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Simulate streaming response
    const simulateResponse = useCallback(async (userMessage: string) => {
        setIsStreaming(true);

        // Simulated response based on query type
        const responses: Record<string, string> = {
            quantum: `Quantum computing harnesses the principles of quantum mechanics to process information in fundamentally different ways than classical computers.

**Key Concepts:**
1. **Qubits** - Unlike classical bits (0 or 1), qubits can exist in superposition, representing both states simultaneously
2. **Entanglement** - Qubits can be correlated in ways that have no classical equivalent
3. **Interference** - Quantum algorithms manipulate probability amplitudes to increase correct answers

**Applications:**
- Cryptography and security
- Drug discovery and molecular simulation
- Optimization problems
- Machine learning acceleration

The field is still evolving, with companies like IBM, Google, and startups racing to achieve "quantum advantage" for practical problems.`,
            haiku: `Here's a haiku about coding:

*Semicolon lost*
*Hours searching line by line*
*Found it. Peace returns.*

---

The beauty of code lies in its precision and poetry. Each line tells a story, each function a verse in the larger narrative of software.`,
            debug: `I'd be happy to help debug your React component! Please share the code and I'll analyze it for:

1. **Common React pitfalls**
   - Missing dependency arrays in useEffect
   - Stale closure issues
   - Incorrect state updates

2. **Performance issues**
   - Unnecessary re-renders
   - Missing memoization
   - Heavy computations in render

3. **Logic errors**
   - Incorrect conditional rendering
   - State management issues
   - Event handler problems

Paste your component code and any error messages you're seeing.`,
            trip: `Let me help you plan an amazing weekend trip! Here's a framework:

**1. Destination Selection**
Consider: budget, travel time, interests (nature, culture, food)

**2. Accommodation**
- Hotels for convenience
- Airbnb for local experience
- Boutique stays for something special

**3. Itinerary Planning**
- Day 1: Arrival + exploration
- Day 2: Main activities
- Day 3: Relaxation + departure

**4. Packing Essentials**
- Weather-appropriate clothing
- Chargers and adapters
- Travel documents

What's your ideal vibe? Adventure, relaxation, or cultural immersion?`,
            default: `I understand you're asking about: "${userMessage}"

This is a demo interface showcasing the cinematic dark theme with Vercel AI Elements. In a production environment, this would connect to the Yula API and stream real AI responses.

**Features demonstrated:**
- Cinematic dark aesthetic with cyan accents
- Vercel AI Elements components
- Streaming message simulation
- Model selection
- Persistent memory concept

Try asking about quantum computing, writing a haiku, debugging code, or planning a trip!`,
        };

        // Determine which response to use
        let response = responses['default'];
        if (userMessage.toLowerCase().includes('quantum')) response = responses['quantum'];
        else if (userMessage.toLowerCase().includes('haiku')) response = responses['haiku'];
        else if (
            userMessage.toLowerCase().includes('debug') ||
            userMessage.toLowerCase().includes('react')
        )
            response = responses['debug'];
        else if (
            userMessage.toLowerCase().includes('trip') ||
            userMessage.toLowerCase().includes('weekend')
        )
            response = responses['trip'];

        // Add assistant message with streaming simulation
        const assistantMessage: ChatMessage = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Simulate character-by-character streaming
        for (let i = 0; i <= response.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, 10));
            setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.role === 'assistant') {
                    updated[lastIdx] = { ...updated[lastIdx], content: response.slice(0, i) };
                }
                return updated;
            });
        }

        setIsStreaming(false);
    }, []);

    // Handle form submission
    const handleSubmit = async (message: { text: string; files: any[] }) => {
        if (!message.text.trim() || isStreaming) return;

        // Add user message
        const userMessage: ChatMessage = {
            id: `msg-${Date.now()}-user`,
            role: 'user',
            content: message.text,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);

        // Simulate response
        await simulateResponse(message.text);
    };

    // Handle suggestion click
    const handleSuggestionClick = (prompt: string) => {
        handleSubmit({ text: prompt, files: [] });
    };

    // Handle new chat
    const handleNewChat = () => {
        setMessages([]);
        setCurrentChatId(`chat-${Date.now()}`);
    };

    // Handle chat selection
    const handleSelectChat = (chatId: string) => {
        setCurrentChatId(chatId);
        // In production, this would load the chat's messages
        if (chatId !== 'demo-1') {
            setMessages([]);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey && e.key === 'b') {
                e.preventDefault();
                setSidebarOpen((prev) => !prev);
            }
            if (e.metaKey && e.key === 'n') {
                e.preventDefault();
                handleNewChat();
            }
            if (e.metaKey && e.key === 'k') {
                e.preventDefault();
                setModelSelectorOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="h-screen bg-black text-white overflow-hidden flex">
            {/* Noise texture overlay */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Subtle gradient orbs */}
            <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[128px] pointer-events-none" />
            <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/3 rounded-full blur-[96px] pointer-events-none" />

            {/* Sidebar */}
            <ChatSidebar
                chats={chats}
                currentChatId={currentChatId}
                onNewChat={handleNewChat}
                onSelectChat={handleSelectChat}
                isOpen={sidebarOpen}
            />

            {/* Main Chat Area */}
            <div className="flex-1 h-full flex flex-col relative z-10 min-w-0">
                {/* Header */}
                <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-black/50 backdrop-blur-sm flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 text-zinc-500 hover:text-white transition-colors"
                        >
                            <SidebarSimple className="w-5 h-5" />
                        </button>

                        {/* Model Selector - Using AI Elements ModelSelector */}
                        <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
                            <ModelSelectorTrigger asChild>
                                <button className="flex items-center gap-2 px-3 py-2 border border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all duration-200 group">
                                    {(() => {
                                        const currentModel = ALL_MODELS.find(
                                            (m) => m.id === selectedModel
                                        );
                                        return (
                                            <>
                                                <ModelSelectorLogo
                                                    provider={currentModel?.providerId || 'openai'}
                                                    className="size-4 opacity-70 group-hover:opacity-100 transition-opacity invert"
                                                />
                                                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                                                    {currentModel?.name || 'Select model'}
                                                </span>
                                                <span className="text-xs text-zinc-600 font-mono">
                                                    ⌘K
                                                </span>
                                            </>
                                        );
                                    })()}
                                </button>
                            </ModelSelectorTrigger>
                            <ModelSelectorContent
                                title="Select AI Model"
                                className="bg-zinc-950 border border-zinc-800 shadow-2xl shadow-cyan-500/5"
                            >
                                <ModelSelectorInput
                                    placeholder="Search models..."
                                    className="bg-transparent text-zinc-100 placeholder:text-zinc-600 border-b border-zinc-800"
                                />
                                <ModelSelectorList className="max-h-[400px]">
                                    <ModelSelectorEmpty className="text-zinc-500 py-6 text-center">
                                        No models found.
                                    </ModelSelectorEmpty>

                                    {Object.entries(MODEL_GROUPS).map(([key, group]) => (
                                        <ModelSelectorGroup
                                            key={key}
                                            heading={
                                                <div className="flex items-center gap-2 px-2 py-1.5">
                                                    <ModelSelectorLogo
                                                        provider={group.providerId}
                                                        className="size-3 invert"
                                                    />
                                                    <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
                                                        {group.label}
                                                    </span>
                                                </div>
                                            }
                                            className="[&_[cmdk-group-heading]]:text-zinc-600"
                                        >
                                            {group.models.map((model) => (
                                                <ModelSelectorItem
                                                    key={model.id}
                                                    value={model.id}
                                                    onSelect={() => {
                                                        setSelectedModel(model.id);
                                                        setModelSelectorOpen(false);
                                                    }}
                                                    className={cn(
                                                        'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                                                        'hover:bg-zinc-800/50 data-[selected=true]:bg-cyan-500/10',
                                                        'aria-selected:bg-cyan-500/10',
                                                        selectedModel === model.id &&
                                                            'bg-cyan-500/10 border-l-2 border-cyan-500'
                                                    )}
                                                >
                                                    <ModelSelectorLogoGroup>
                                                        <ModelSelectorLogo
                                                            provider={group.providerId}
                                                            className="size-5 invert"
                                                        />
                                                    </ModelSelectorLogoGroup>
                                                    <div className="flex-1 min-w-0">
                                                        <ModelSelectorName className="text-zinc-200 font-medium">
                                                            {model.name}
                                                        </ModelSelectorName>
                                                        <p className="text-xs text-zinc-500 truncate">
                                                            {model.description}
                                                        </p>
                                                    </div>
                                                    {selectedModel === model.id && (
                                                        <span className="text-cyan-400 text-xs">
                                                            ✓
                                                        </span>
                                                    )}
                                                </ModelSelectorItem>
                                            ))}
                                        </ModelSelectorGroup>
                                    ))}
                                </ModelSelectorList>
                            </ModelSelectorContent>
                        </ModelSelector>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-600 font-mono">
                            {isStreaming && (
                                <span className="flex items-center gap-2">
                                    <CircleNotch className="w-3 h-3 animate-spin text-cyan-400" />
                                    Thinking...
                                </span>
                            )}
                        </span>
                    </div>
                </header>

                {/* Conversation - Using AI Elements */}
                <Conversation className="flex-1 min-h-0">
                    <ConversationContent className="max-w-3xl mx-auto py-8 px-4">
                        {messages.length === 0 ? (
                            <CinematicEmptyState onSuggestionClick={handleSuggestionClick} />
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {messages.map((msg, index) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        <Message from={msg.role}>
                                            <MessageContent
                                                className={cn(
                                                    msg.role === 'user'
                                                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-100'
                                                        : 'text-zinc-300'
                                                )}
                                            >
                                                {msg.role === 'assistant' ? (
                                                    <MessageResponse
                                                        plugins={[remarkMath] as any}
                                                        rehypePlugins={[rehypeKatex] as any}
                                                        className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-strong:text-cyan-400 prose-code:text-cyan-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded"
                                                    >
                                                        {msg.content}
                                                    </MessageResponse>
                                                ) : (
                                                    <span>{msg.content}</span>
                                                )}
                                            </MessageContent>

                                            {/* Timestamp */}
                                            <div
                                                className={cn(
                                                    'text-xs text-zinc-600 mt-1',
                                                    msg.role === 'user' ? 'text-right' : 'text-left'
                                                )}
                                            >
                                                {msg.timestamp.toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </Message>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}

                        {/* Streaming indicator */}
                        {isStreaming && messages[messages.length - 1]?.role === 'assistant' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2 text-cyan-400 text-sm mt-2"
                            >
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            </motion.div>
                        )}
                    </ConversationContent>

                    <ConversationScrollButton className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800" />
                </Conversation>

                {/* Input Area - Using AI Elements */}
                <div className="p-4 border-t border-zinc-800 bg-black/50 backdrop-blur-sm flex-shrink-0">
                    <div className="max-w-3xl mx-auto">
                        <PromptInput
                            onSubmit={handleSubmit}
                            className="border border-zinc-800 bg-zinc-950/80 rounded-none focus-within:border-cyan-500/50 transition-colors"
                        >
                            <PromptInputHeader>
                                <PromptInputAttachments>
                                    {(attachment) => (
                                        <PromptInputAttachment
                                            data={attachment}
                                            className="border-zinc-700 bg-zinc-900"
                                        />
                                    )}
                                </PromptInputAttachments>
                            </PromptInputHeader>

                            <PromptInputBody>
                                <PromptInputTextarea
                                    placeholder="Ask anything..."
                                    className="bg-transparent text-zinc-100 placeholder:text-zinc-600 resize-none border-0 focus:ring-0"
                                />
                            </PromptInputBody>

                            <PromptInputFooter className="border-t border-zinc-800/50 bg-zinc-950/50">
                                <PromptInputTools>
                                    <PromptInputActionMenu>
                                        <PromptInputActionMenuTrigger className="text-zinc-500 hover:text-white hover:bg-zinc-800" />
                                        <PromptInputActionMenuContent className="bg-zinc-950 border-zinc-800">
                                            <PromptInputActionAddAttachments className="text-zinc-300 hover:bg-zinc-800" />
                                        </PromptInputActionMenuContent>
                                    </PromptInputActionMenu>
                                </PromptInputTools>

                                <PromptInputSubmit
                                    status={isStreaming ? 'streaming' : undefined}
                                    disabled={isStreaming}
                                    className={cn(
                                        'transition-all duration-300',
                                        isStreaming
                                            ? 'bg-zinc-800 text-zinc-500'
                                            : 'bg-cyan-500 text-black hover:bg-cyan-400'
                                    )}
                                />
                            </PromptInputFooter>
                        </PromptInput>

                        <div className="text-center mt-3 text-xs text-zinc-600 font-mono flex items-center justify-center gap-4 flex-wrap">
                            <span>
                                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500">
                                    ⌘
                                </kbd>
                                <span className="mx-1">+</span>
                                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500">
                                    K
                                </kbd>
                                <span className="ml-2 text-zinc-700">Model picker</span>
                            </span>
                            <span className="text-zinc-800">|</span>
                            <span>
                                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500">
                                    ⌘
                                </kbd>
                                <span className="mx-1">+</span>
                                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500">
                                    B
                                </kbd>
                                <span className="ml-2 text-zinc-700">Sidebar</span>
                            </span>
                            <span className="text-zinc-800">|</span>
                            <span>
                                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500">
                                    ⌘
                                </kbd>
                                <span className="mx-1">+</span>
                                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500">
                                    N
                                </kbd>
                                <span className="ml-2 text-zinc-700">New chat</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
