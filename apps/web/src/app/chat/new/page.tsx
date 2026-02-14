'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * /chat/new redirects to /chat which handles the new-chat experience.
 */
export default function NewChatRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/chat');
    }, [router]);

    return null;
}
