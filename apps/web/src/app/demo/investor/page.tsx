'use client';

import {
    Bell,
    Brain,
    CheckCircle,
    CurrencyDollar,
    HardDrives,
    Lightning,
    Spinner,
    Wallet,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';

type DemoPhase =
    | 'idle'
    | 'thinking'
    | 'wallet_check'
    | 'provisioning'
    | 'confirmed'
    | 'pac_notification';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

export default function InvestorDemoPage() {
    const [phase, setPhase] = useState<DemoPhase>('idle');
    const [messages, setMessages] = useState<Message[]>([]);
    const [streamingText, setStreamingText] = useState('');
    const [showPacNotification, setShowPacNotification] = useState(false);
    const [pacAction, setPacAction] = useState<'pending' | 'shutdown' | 'keep'>('pending');
    const [walletBalance, setWalletBalance] = useState(247.5);

    const addMessage = useCallback((role: Message['role'], content: string) => {
        setMessages((prev) => [
            ...prev,
            {
                id: `msg-${Date.now()}`,
                role,
                content,
                timestamp: new Date(),
            },
        ]);
    }, []);

    const streamText = useCallback(async (text: string, speed = 30) => {
        setStreamingText('');
        for (let i = 0; i < text.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, speed));
            setStreamingText((prev) => prev + text[i]);
        }
        return text;
    }, []);

    const runDemo = useCallback(async () => {
        // Reset state
        setMessages([]);
        setStreamingText('');
        setShowPacNotification(false);

        // User message
        addMessage('user', 'Book a server for deployment.');

        // Phase 1: Thinking
        setPhase('thinking');
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Phase 2: Wallet Check
        setPhase('wallet_check');
        addMessage('system', 'Checking wallet balance...');
        await new Promise((resolve) => setTimeout(resolve, 1200));

        // Phase 3: Provisioning
        setPhase('provisioning');
        addMessage('system', 'Connecting to Sardis Cloud...');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Phase 4: Confirmed - Stream the response
        setPhase('confirmed');
        const response = `I've provisioned a deployment server for you on Sardis Cloud.

**Server Details:**
- Instance: sardis-deploy-prod-01
- Region: EU-West (Frankfurt)
- Specs: 4 vCPU, 16GB RAM, 100GB NVMe
- Cost: $0.12/hour (~$86/month)

**Status:** Running and ready for deployment.

Your wallet balance: $247.50 (sufficient for ~85 days)

Would you like me to configure CI/CD pipelines for this server?`;

        await streamText(response, 15);
        addMessage('assistant', response);
        setStreamingText('');

        // Phase 5: PAC Notification (3 seconds later)
        await new Promise((resolve) => setTimeout(resolve, 3000));
        setPhase('pac_notification');
        setShowPacNotification(true);
    }, [addMessage, streamText]);

    const resetDemo = useCallback(() => {
        setPhase('idle');
        setMessages([]);
        setStreamingText('');
        setShowPacNotification(false);
        setPacAction('pending');
        setWalletBalance(247.5);
    }, []);

    const handleShutDown = useCallback(async () => {
        setPacAction('shutdown');
        // Simulate server shutdown
        await new Promise((resolve) => setTimeout(resolve, 500));
        setShowPacNotification(false);
        // Add confirmation message
        addMessage(
            'system',
            'Server sardis-deploy-prod-01 has been shut down. You saved $2.88/day.'
        );
        // Update wallet to show no ongoing charges
        setWalletBalance((prev) => prev + 2.88);
    }, [addMessage]);

    const handleKeepRunning = useCallback(() => {
        setPacAction('keep');
        setShowPacNotification(false);
        addMessage('system', 'Server will continue running. Next review scheduled in 24 hours.');
    }, [addMessage]);

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="border-b border-zinc-800 px-6 py-4">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-400 flex items-center justify-center">
                            <Lightning weight="fill" className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">YULA OS</h1>
                            <p className="text-xs text-zinc-500">Investor Demo</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-800">
                            <Wallet className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-medium">${walletBalance.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-6 py-8">
                {/* Demo Controls */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <button
                        onClick={runDemo}
                        disabled={phase !== 'idle' && phase !== 'pac_notification'}
                        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-400 rounded-xl font-semibold
                                   hover:from-amber-400 hover:to-amber-300 transition-all
                                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <HardDrives className="w-5 h-5" />
                        Start Demo
                    </button>
                    {phase !== 'idle' && (
                        <button
                            onClick={resetDemo}
                            className="px-6 py-3 bg-zinc-800 rounded-xl font-semibold hover:bg-zinc-700 transition-all"
                        >
                            Reset
                        </button>
                    )}
                </div>

                {/* Chat Messages */}
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                        msg.role === 'user'
                                            ? 'bg-amber-500 text-white'
                                            : msg.role === 'system'
                                              ? 'bg-zinc-800/50 text-zinc-400 text-sm border border-zinc-700'
                                              : 'bg-zinc-800 text-white'
                                    }`}
                                >
                                    {msg.role === 'system' ? (
                                        <div className="flex items-center gap-2">
                                            <Spinner className="w-4 h-4 animate-spin" />
                                            {msg.content}
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Thinking Indicator */}
                    <AnimatePresence>
                        {phase === 'thinking' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex justify-start"
                            >
                                <div className="bg-zinc-800 rounded-2xl px-4 py-3 flex items-center gap-3">
                                    <Brain className="w-5 h-5 text-amber-400 animate-pulse" />
                                    <span className="text-zinc-300">Thinking...</span>
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Streaming Response */}
                    <AnimatePresence>
                        {streamingText && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-start"
                            >
                                <div className="max-w-[80%] bg-zinc-800 rounded-2xl px-4 py-3">
                                    <div className="whitespace-pre-wrap">{streamingText}</div>
                                    <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-0.5" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Status Bar */}
                <AnimatePresence>
                    {phase !== 'idle' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed bottom-6 left-1/2 -translate-x-1/2"
                        >
                            <div className="bg-zinc-900 border border-zinc-700 rounded-full px-6 py-3 flex items-center gap-4 shadow-xl">
                                <StatusStep
                                    icon={<Brain className="w-4 h-4" />}
                                    label="Thinking"
                                    active={phase === 'thinking'}
                                    done={[
                                        'wallet_check',
                                        'provisioning',
                                        'confirmed',
                                        'pac_notification',
                                    ].includes(phase)}
                                />
                                <StatusStep
                                    icon={<Wallet className="w-4 h-4" />}
                                    label="Wallet"
                                    active={phase === 'wallet_check'}
                                    done={[
                                        'provisioning',
                                        'confirmed',
                                        'pac_notification',
                                    ].includes(phase)}
                                />
                                <StatusStep
                                    icon={<HardDrives className="w-4 h-4" />}
                                    label="Sardis"
                                    active={phase === 'provisioning'}
                                    done={['confirmed', 'pac_notification'].includes(phase)}
                                />
                                <StatusStep
                                    icon={<CheckCircle className="w-4 h-4" />}
                                    label="Done"
                                    active={phase === 'confirmed' || phase === 'pac_notification'}
                                    done={phase === 'pac_notification'}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* PAC Notification */}
            <AnimatePresence>
                {showPacNotification && (
                    <motion.div
                        initial={{ opacity: 0, x: 400 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 400 }}
                        className="fixed top-20 right-6 w-96"
                    >
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                    <Bell className="w-5 h-5 text-amber-400" weight="fill" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-amber-400">
                                            PAC Alert
                                        </span>
                                        <span className="text-xs text-zinc-500">Just now</span>
                                    </div>
                                    <p className="text-sm text-zinc-300 mb-3">
                                        Unused server detected. Shut down to save funds?
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                                            <CurrencyDollar className="w-3.5 h-3.5" />
                                            <span>Saving ~$2.88/day</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={handleShutDown}
                                            disabled={pacAction !== 'pending'}
                                            className="px-3 py-1.5 bg-amber-500 text-black text-sm font-medium rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
                                        >
                                            {pacAction === 'shutdown'
                                                ? 'Shutting down...'
                                                : 'Shut Down'}
                                        </button>
                                        <button
                                            onClick={handleKeepRunning}
                                            disabled={pacAction !== 'pending'}
                                            className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-sm rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                        >
                                            Keep Running
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatusStep({
    icon,
    label,
    active,
    done,
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    done: boolean;
}) {
    return (
        <div className="flex items-center gap-2">
            <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                    done
                        ? 'bg-emerald-500 text-white'
                        : active
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-zinc-700 text-zinc-400'
                }`}
            >
                {done ? <CheckCircle weight="bold" className="w-4 h-4" /> : icon}
            </div>
            <span className={`text-xs ${active || done ? 'text-white' : 'text-zinc-500'}`}>
                {label}
            </span>
        </div>
    );
}
