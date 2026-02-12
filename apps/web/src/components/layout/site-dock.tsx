'use client';

import { Brain, ChatCircle, Compass, House, Tag, User } from '@phosphor-icons/react';
import { usePathname, useRouter } from 'next/navigation';
import { Dock } from '@/components/ui/dock';

import { SkyToggle } from '@/components/ui/sky-toggle';

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
        <Dock items={items}>
            <div className="p-2">
                <SkyToggle />
            </div>
        </Dock>
    );
}
