import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Memory - Your AI Knowledge Base',
    'Manage your persistent AI memory. Search semantically across all conversations, import ChatGPT/Claude history, and export your data anytime.',
    '/memory',
    {
        keywords: [
            'AI memory',
            'persistent AI context',
            'conversation history',
            'semantic search AI',
            'ChatGPT history import',
            'Claude history import',
            'AI knowledge base',
        ],
        noIndex: true, // Private page
    }
);

export default function MemoryLayout({ children }: { children: React.ReactNode }) {
    return children;
}
