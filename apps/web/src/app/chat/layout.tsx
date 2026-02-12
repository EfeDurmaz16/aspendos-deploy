import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Chat - Talk to Any AI Model',
    'Chat with GPT-5, Claude, Gemini and 12+ AI models. Persistent memory, voice input, and multi-model comparison in one interface.',
    '/chat',
    {
        keywords: [
            'AI chat',
            'GPT-5 chat',
            'Claude chat',
            'Gemini chat',
            'multi-model AI chat',
            'AI voice chat',
            'unified AI interface',
        ],
        noIndex: true, // Private page
    }
);

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return children;
}
