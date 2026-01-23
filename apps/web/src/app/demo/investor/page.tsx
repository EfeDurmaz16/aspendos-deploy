'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    Wallet,
    HardDrives,
    CheckCircle,
    Bell,
    Spinner,
    Lightning,
    ArrowRight,
    X,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// DEMO TYPES
// ============================================

interface DemoMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
    metadata?: {
        action?: string;
        status?: 'pending' | 'success' | 'error';
        icon?: 'wallet' | 'harddrive' | 'brain' | 'check';
    };
}

interface PACNotification {
    id: string;
    title: string;
    message: string;
    timestamp: Date;
    actions: { label: string; variant: 'primary' | 'secondary' }[];
}

// ============================================
// DEMO SCENARIO SCRIPT
// ============================================

const DEMO_SCENARIO = {
    userPrompt: 'Book a server for deployment.',
    steps: [
        {
            delay: 500,
            type: 'thinking',
            content: 'Analyzing request...',
        },
        {
            delay: 1000,
            type: 'action',
            content: 'Checking wallet balance',
            metadata: { action: 'wallet_check', status: 'pending', icon: 'wallet' as const },
        },
        {
            delay: 1200,
            type: 'action',
            content: 'Wallet verified: $247.50 available',
            metadata: { action: 'wallet_check', status: 'success', icon: 'wallet' as const },
        },
        {
            delay: 800,
            type: 'action',
            content: 'Connecting to Sardis Cloud...',
            metadata: { action: 'sardis_connect', status: 'pending', icon: 'harddrive' as const },
        },
        {
            delay: 1500,
            type: 'action',
            content: 'Server provisioned: sardis-prod-7a3f',
            metadata: { action: 'sardis_connect', status: 'success', icon: 'harddrive' as const },
        },
        {
            delay: 600,
            type: 'response',
            content: `I've booked a deployment server for you.

**Server Details:**
- **ID:** sardis-prod-7a3f
- **Region:** EU-West-1
- **Type:** Standard (2 vCPU, 4GB RAM)
- **Cost:** $0.12/hour
- **Status:** Running

The server is now active and ready for deployment. You can access it via SSH or deploy directly from your CI/CD pipeline.

Would you like me to configure automatic scaling or set up monitoring?`,
        },
    ],
    pacTrigger: {
        delay: 3000,
        notification: {
            title: 'Resource Optimization',
            message: 'Unused server detected: sardis-prod-7a3f has been idle for 15 minutes. Shut down to save $0.12/hour?',
            actions: [
                { label: 'Keep Running', variant: 'secondary' as const },
                { label: 'Shut Down', variant: 'primary' as const },
            ],
        },
    },
};

// ============================================
// DEMO COMPONENTS
// ============================================

function ThinkingIndicator() {
    return (
        <div className="flex items-center gap-2 text-muted-foreground">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
                <Brain className="w-5 h-5 text-blue-500" weight="duotone" />
            </motion.div>
            <span className="text-sm">Thinking...</span>
        </div>
    );
}

function ActionStep({
    content,
    metadata,
}: {
    content: string;
    metadata?: DemoMessage['metadata'];
}) {
    const IconComponent = {
        wallet: Wallet,
        harddrive: HardDrives,
        brain: Brain,
        check: CheckCircle,
    }[metadata?.icon || 'brain'];

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 py-2"
        >
            <div
                className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    metadata?.status === 'pending' && 'bg-amber-500/10',
                    metadata?.status === 'success' && 'bg-emerald-500/10'
                )}
            >
                {metadata?.status === 'pending' ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                        <Spinner
                            className={cn(
                                'w-4 h-4',
                                metadata?.icon === 'wallet' && 'text-amber-500',
                                metadata?.icon === 'harddrive' && 'text-blue-500'
                            )}
                            weight="bold"
                        />
                    </motion.div>
                ) : (
                    <IconComponent
                        className={cn(
                            'w-4 h-4',
                            metadata?.icon === 'wallet' && 'text-amber-500',
                            metadata?.icon === 'harddrive' && 'text-emerald-500'
                        )}
                        weight="duotone"
                    />
                )}
            </div>
            <span
                className={cn(
                    'text-sm',
                    metadata?.status === 'pending' && 'text-muted-foreground',
                    metadata?.status === 'success' && 'text-foreground'
                )}
            >
                {content}
            </span>
            {metadata?.status === 'success' && (
                <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
            )}
        </motion.div>
    );
}

function StreamingText({ text }: { text: string }) {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(text.slice(0, currentIndex + 1));
                setCurrentIndex(currentIndex + 1);
            }, 15);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, text]);

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap">{displayedText}</div>
            {currentIndex < text.length && (
                <motion.span
                    animate={{ opacity: [0, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="inline-block w-2 h-4 bg-blue-500 ml-0.5"
                />
            )}
        </div>
    );
}

function PACNotificationCard({
    notification,
    onAction,
    onDismiss,
}: {
    notification: PACNotification;
    onAction: (action: string) => void;
    onDismiss: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-96 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
        >
            <div className="p-4 border-b border-border bg-amber-500/5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <Lightning className="w-5 h-5 text-amber-500" weight="duotone" />
                        </div>
                        <div>
                            <div className="font-semibold text-sm">{notification.title}</div>
                            <div className="text-xs text-muted-foreground">PAC Automation</div>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="p-4">
                <p className="text-sm text-muted-foreground mb-4">{notification.message}</p>
                <div className="flex gap-2">
                    {notification.actions.map((action) => (
                        <Button
                            key={action.label}
                            variant={action.variant === 'primary' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onAction(action.label)}
                            className={cn(
                                'flex-1',
                                action.variant === 'primary' && 'bg-amber-500 hover:bg-amber-600'
                            )}
                        >
                            {action.label}
                        </Button>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// MAIN DEMO PAGE
// ============================================

export default function InvestorDemoPage() {
    const [messages, setMessages] = useState<DemoMessage[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1);
    const [showPAC, setShowPAC] = useState(false);
    const [pacNotification, setPacNotification] = useState<PACNotification | null>(null);
    const [demoComplete, setDemoComplete] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const startDemo = async () => {
        setIsRunning(true);
        setMessages([]);
        setCurrentStep(0);
        setShowPAC(false);
        setPacNotification(null);
        setDemoComplete(false);

        // Add user message
        const userMessage: DemoMessage = {
            id: 'user-1',
            role: 'user',
            content: DEMO_SCENARIO.userPrompt,
            timestamp: new Date(),
        };
        setMessages([userMessage]);

        // Run through demo steps
        let totalDelay = 800; // Initial delay after user message

        for (let i = 0; i < DEMO_SCENARIO.steps.length; i++) {
            const step = DEMO_SCENARIO.steps[i];
            totalDelay += step.delay;

            setTimeout(() => {
                setCurrentStep(i);

                if (step.type === 'thinking') {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `thinking-${i}`,
                            role: 'system',
                            content: step.content,
                            timestamp: new Date(),
                            isStreaming: true,
                        },
                    ]);
                } else if (step.type === 'action') {
                    setMessages((prev) => {
                        // Remove thinking message if it exists
                        const filtered = prev.filter((m) => !m.id.startsWith('thinking-'));
                        return [
                            ...filtered,
                            {
                                id: `action-${i}`,
                                role: 'system',
                                content: step.content,
                                timestamp: new Date(),
                                metadata: step.metadata as DemoMessage['metadata'],
                            },
                        ];
                    });
                } else if (step.type === 'response') {
                    setMessages((prev) => {
                        // Keep action messages, add response
                        const actions = prev.filter(
                            (m) => m.role === 'user' || m.id.startsWith('action-')
                        );
                        return [
                            ...actions,
                            {
                                id: 'assistant-response',
                                role: 'assistant',
                                content: step.content,
                                timestamp: new Date(),
                                isStreaming: true,
                            },
                        ];
                    });
                }
            }, totalDelay);
        }

        // Trigger PAC notification
        const pacDelay = totalDelay + DEMO_SCENARIO.pacTrigger.delay;
        setTimeout(() => {
            setPacNotification({
                id: 'pac-1',
                ...DEMO_SCENARIO.pacTrigger.notification,
                timestamp: new Date(),
            });
            setShowPAC(true);
        }, pacDelay);

        // Mark demo complete
        setTimeout(() => {
            setDemoComplete(true);
            setIsRunning(false);
        }, pacDelay + 500);
    };

    const handlePACAction = (action: string) => {
        setShowPAC(false);
        setPacNotification(null);

        if (action === 'Shut Down') {
            setMessages((prev) => [
                ...prev,
                {
                    id: 'pac-action',
                    role: 'system',
                    content: 'Server sardis-prod-7a3f has been shut down. Estimated savings: $2.88/day',
                    timestamp: new Date(),
                    metadata: { action: 'shutdown', status: 'success', icon: 'check' },
                },
            ]);
        }
    };

    const resetDemo = () => {
        setMessages([]);
        setIsRunning(false);
        setCurrentStep(-1);
        setShowPAC(false);
        setPacNotification(null);
        setDemoComplete(false);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
                <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" weight="bold" />
                        </div>
                        <span className="font-semibold">YULA OS</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                            INVESTOR DEMO
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live Demo Mode
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-24 pb-32 px-4">
                <div className="container max-w-3xl mx-auto">
                    {/* Demo Controls */}
                    {!isRunning && messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center space-y-8 py-20"
                        >
                            <div className="space-y-4">
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                                    YULA OS Demo
                                </h1>
                                <p className="text-lg text-zinc-400 max-w-md mx-auto">
                                    Experience the AI operating system that manages your infrastructure with
                                    proactive intelligence.
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 max-w-md mx-auto">
                                <h3 className="font-semibold mb-3">Demo Scenario</h3>
                                <p className="text-sm text-zinc-400 mb-4">
                                    Watch YULA book a deployment server, verify wallet balance, and
                                    proactively suggest cost optimizations.
                                </p>
                                <Button
                                    onClick={startDemo}
                                    size="lg"
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                >
                                    <Lightning className="w-5 h-5 mr-2" weight="bold" />
                                    Start Demo
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Chat Interface */}
                    {messages.length > 0 && (
                        <div className="space-y-6">
                            {messages.map((message) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        'flex gap-4',
                                        message.role === 'user' && 'justify-end'
                                    )}
                                >
                                    {message.role !== 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                            <Brain className="w-4 h-4 text-white" weight="bold" />
                                        </div>
                                    )}

                                    <div
                                        className={cn(
                                            'max-w-[80%] rounded-2xl p-4',
                                            message.role === 'user' &&
                                                'bg-blue-600 text-white ml-auto',
                                            message.role === 'assistant' &&
                                                'bg-zinc-900 border border-zinc-800',
                                            message.role === 'system' &&
                                                message.metadata &&
                                                'bg-zinc-900/50 border border-zinc-800',
                                            message.role === 'system' &&
                                                message.isStreaming &&
                                                !message.metadata &&
                                                'bg-transparent'
                                        )}
                                    >
                                        {message.role === 'user' && (
                                            <p className="text-sm">{message.content}</p>
                                        )}

                                        {message.role === 'system' && message.isStreaming && !message.metadata && (
                                            <ThinkingIndicator />
                                        )}

                                        {message.role === 'system' && message.metadata && (
                                            <ActionStep
                                                content={message.content}
                                                metadata={message.metadata}
                                            />
                                        )}

                                        {message.role === 'assistant' && (
                                            <StreamingText text={message.content} />
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}

                    {/* Demo Complete */}
                    {demoComplete && !showPAC && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-12 text-center"
                        >
                            <Button
                                onClick={resetDemo}
                                variant="outline"
                                className="border-zinc-700 hover:bg-zinc-800"
                            >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Run Demo Again
                            </Button>
                        </motion.div>
                    )}
                </div>
            </main>

            {/* PAC Notification */}
            <AnimatePresence>
                {showPAC && pacNotification && (
                    <PACNotificationCard
                        notification={pacNotification}
                        onAction={handlePACAction}
                        onDismiss={() => setShowPAC(false)}
                    />
                )}
            </AnimatePresence>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-xl py-4">
                <div className="container max-w-5xl mx-auto px-4 flex items-center justify-between text-sm text-zinc-500">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <span>PAC: Proactive Autonomous Computing</span>
                    </div>
                    <div>Zero external dependencies - 100% offline capable</div>
                </div>
            </footer>
        </div>
    );
}
