'use client';

import {
    House,
    ChatCircle,
    Brain,
    Tag,
    User,
    Compass
} from '@phosphor-icons/react';
import { useRouter, usePathname } from 'next/navigation';
import { Dock } from '@/components/ui/dock';

export function SiteDock() {
    const router = useRouter();
    const pathname = usePathname();

    // Hide dock on login/signup pages to avoid clutter
    if (pathname?.startsWith('/login') || pathname?.startsWith('/signup')) {
        return null;
    }

    const items = [
        {
            icon: House,
            label: 'Home',
            onClick: () => router.push('/'),
        },
        {
            icon: ChatCircle,
            label: 'Chat',
            onClick: () => router.push('/chat'),
        },
        {
            icon: Brain,
            label: 'Memory',
            onClick: () => router.push('/memory'),
        },
        {
            icon: Compass,
            label: 'Explore', // Placeholder for feature discovery
            onClick: () => router.push('/#features'),
        },
        {
            icon: Tag,
            label: 'Pricing',
            onClick: () => router.push('/pricing'),
        },
        {
            icon: User,
            label: 'Profile', // Or Login if not authenticated? For now, Profile/Login
            onClick: () => router.push('/login'),
        },
    ];

    return (
        <Dock items={items} />
    );
}
