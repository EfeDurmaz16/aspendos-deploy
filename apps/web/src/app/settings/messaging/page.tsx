'use client';

/**
 * Messaging Platform Settings
 *
 * Manage platform connections for multi-channel delivery.
 */

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
        await fetch(`/api/v1/messaging/connections/${connectionId}`, {
            method: 'DELETE',
            credentials: 'include',
        }).catch(() => {});
        fetchConnections();
    };

    const getConnection = (platform: string) =>
        connections.find((c) => c.platform === platform && c.isActive);

    if (loading) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-8 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={`skel-${i}`} className="h-24 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <h1 className="text-2xl font-bold mb-2">Messaging Platforms</h1>
            <p className="text-muted-foreground mb-6">
                Connect platforms to receive PAC reminders, approval requests, and chat with YULA
                from anywhere.
            </p>

            <div className="space-y-4">
                {PLATFORMS.map((platform) => {
                    const connection = getConnection(platform.id);
                    const isConnected = !!connection;

                    return (
                        <Card
                            key={platform.id}
                            className={isConnected ? 'border-emerald-500/30 bg-emerald-500/5' : ''}
                        >
                            <CardContent className="p-4">
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
                                                    <Badge variant="success">Connected</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                {platform.description}
                                            </p>
                                            {isConnected && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    ID: {connection.platformUserId}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        {isConnected ? (
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleDisconnect(connection.id)}
                                            >
                                                Disconnect
                                            </Button>
                                        ) : platform.setupUrl ? (
                                            <Button size="sm" variant="secondary" asChild>
                                                <a
                                                    href={platform.setupUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    Connect
                                                </a>
                                            </Button>
                                        ) : (
                                            <Badge variant="tertiary">Coming Soon</Badge>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="mt-8">
                <CardContent className="p-4">
                    <h3 className="font-medium mb-2">How it works</h3>
                    <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                        <li>Click Connect on your preferred platform</li>
                        <li>Follow the setup instructions to link your account</li>
                        <li>Start receiving PAC reminders and approval requests</li>
                        <li>Reply directly from the platform to interact with YULA</li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    );
}
