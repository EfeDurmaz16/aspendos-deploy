'use client';

import Image from 'next/image';
import { useState } from 'react';

const BRANDFETCH_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID ?? '';

const DOMAINS = {
    slack: 'slack.com',
    telegram: 'telegram.org',
    discord: 'discord.com',
    whatsapp: 'whatsapp.com',
    teams: 'microsoft.com',
    googlechat: 'workspace.google.com',
    imessage: 'apple.com',
    signal: 'signal.org',
} as const;

const FALLBACKS: Record<keyof typeof DOMAINS, string> = {
    slack: '/logos/slack.svg',
    telegram: '/logos/telegram.svg',
    discord: '/logos/discord.svg',
    whatsapp: '/logos/whatsapp.svg',
    teams: '/logos/microsoft-teams.svg',
    googlechat: '/logos/google-chat.svg',
    imessage: '/logos/imessage.svg',
    signal: '/logos/signal.svg',
};

const LABELS: Record<keyof typeof DOMAINS, string> = {
    slack: 'Slack',
    telegram: 'Telegram',
    discord: 'Discord',
    whatsapp: 'WhatsApp',
    teams: 'Microsoft Teams',
    googlechat: 'Google Chat',
    imessage: 'iMessage',
    signal: 'Signal',
};

export type PlatformName = keyof typeof DOMAINS;

export function PlatformIcon({
    name,
    size = 40,
    theme = 'light',
    className,
}: {
    name: PlatformName;
    size?: number;
    theme?: 'light' | 'dark';
    className?: string;
}) {
    const [err, setErr] = useState(!BRANDFETCH_ID);

    if (err) {
        return (
            <Image
                src={FALLBACKS[name]}
                alt={`${LABELS[name]} logo`}
                width={size}
                height={size}
                className={className}
                unoptimized
            />
        );
    }

    const src = `https://cdn.brandfetch.io/${DOMAINS[name]}/w/${size * 2}/h/${size * 2}/theme/${theme}?c=${BRANDFETCH_ID}`;
    return (
        <Image
            src={src}
            alt={`${LABELS[name]} logo`}
            width={size}
            height={size}
            className={className}
            unoptimized
            onError={() => setErr(true)}
        />
    );
}

export const PLATFORM_LABELS = LABELS;
