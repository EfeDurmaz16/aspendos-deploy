'use client';

/**
 * Messaging Platform Settings
 *
 * Manage platform connections for multi-channel delivery:
 * - Telegram, WhatsApp, Slack, Discord
 * - Connection status and linking
 * - Notification preferences per platform
 */

import { useCallback, useEffect, useState } from 'react';

interface PlatformConnection {
    id: string;
    platform: string;
    platformUserId: string;
    isActive: boolean;
    createdAt: string;
}

const PLATFORMS = [
    {
        id: 'telegram',
        name: 'Telegram',
        description: 'Receive messages and approval requests via Telegram bot',
        setupUrl: 'https://t.me/YulaAIBot',
        icon: '📱',
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        description: 'Get notified on WhatsApp for reminders and approvals',
        setupUrl: null,
        icon: '💬',
    },
    {
        id: 'slack',
        name: 'Slack',
        description: 'Integrate YULA into your Slack workspace',
        setupUrl: null,
        icon: '🔧',
    },
    {
        id: 'discord',
        name: 'Discord',
        description: 'Chat with YULA in your Discord server',
        setupUrl: null,
        icon: '🎮',
    },
] as const;

export default function MessagingSettingsPage() {
    const [connections, setConnections] = useState<PlatformConnection[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConnections = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/messaging/connections', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setConnections(data.connections || []);
            }
        } catch (error) {
            console.error('Failed to fetch connections:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const handleDisconnect = async (connectionId: string) => {
        try {
            await fetch(`/api/v1/messaging/connections/${connectionId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            fetchConnections();
        } catch (error) {
            console.error('Failed to disconnect:', error);
        }
    };

    const getConnection = (platform: string) =>
        connections.find((c) => c.platform === platform && c.isActive);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
                    role="status"
                    aria-label="Loading"
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <h1 className="text-2xl font-bold mb-2">Messaging Platforms</h1>
            <p className="text-neutral-400 mb-6">
                Connect platforms to receive PAC reminders, approval requests, and chat with YULA
                from anywhere.
            </p>

            <div className="space-y-4">
                {PLATFORMS.map((platform) => {
                    const connection = getConnection(platform.id);
                    const isConnected = !!connection;

                    return (
                        <div
                            key={platform.id}
                            className={`border rounded-lg p-4 transition-colors ${
                                isConnected
                                    ? 'border-green-500/30 bg-green-500/5'
                                    : 'border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <span
                                        className="text-2xl"
                                        role="img"
                                        aria-label={platform.name}
                                    >
                                        {platform.icon}
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium">{platform.name}</h3>
                                            {isConnected && (
                                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                                    Connected
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-neutral-400 mt-0.5">
                                            {platform.description}
                                        </p>
                                        {isConnected && (
                                            <p className="text-xs text-neutral-500 mt-1">
                                                ID: {connection.platformUserId}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    {isConnected ? (
                                        <button
                                            type="button"
                                            onClick={() => handleDisconnect(connection.id)}
                                            className="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-md transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                    ) : platform.setupUrl ? (
                                        <a
                                            href={platform.setupUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-md transition-colors inline-block"
                                        >
                                            Connect
                                        </a>
                                    ) : (
                                        <span className="px-3 py-1.5 text-sm text-neutral-500">
                                            Coming Soon
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 p-4 rounded-lg bg-white/5 border border-white/10">
                <h3 className="font-medium mb-2">How it works</h3>
                <ol className="text-sm text-neutral-400 space-y-1.5 list-decimal list-inside">
                    <li>Click Connect on your preferred platform</li>
                    <li>Follow the setup instructions to link your account</li>
                    <li>Start receiving PAC reminders and approval requests</li>
                    <li>Reply directly from the platform to interact with YULA</li>
                </ol>
            </div>
        </div>
    );
}
