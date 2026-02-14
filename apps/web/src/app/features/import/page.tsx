import { UploadSimple } from '@phosphor-icons/react/dist/ssr';
import type { Metadata } from 'next';
import { type FeatureData, FeaturePage } from '@/components/seo/FeaturePage';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Import ChatGPT & Claude History | Yula Features',
    'Import your ChatGPT and Claude conversation history into Yula. Bring your AI memory with you and never start from scratch again.',
    '/features/import',
    {
        keywords: [
            'import ChatGPT history',
            'import Claude history',
            'ChatGPT export',
            'AI history import',
            'conversation import',
            'migrate from ChatGPT',
        ],
    }
);

const importData: FeatureData = {
    name: 'Import Your AI History',
    slug: 'import',
    tagline:
        'Bring your ChatGPT and Claude conversations to Yula. Your AI history becomes searchable semantic memory - never start from scratch again.',
    description: `Yula's Import feature lets you bring your entire conversation history from ChatGPT and Claude. Simply export your data from OpenAI or Anthropic, upload to Yula, and all your past conversations become part of your semantic memory. Ask any AI model about discussions you had months ago on another platform - Yula remembers.`,
    heroIcon: <UploadSimple className="w-16 h-16 text-primary" weight="duotone" />,
    benefits: [
        {
            title: 'Never Start Fresh',
            description:
                'Switching to Yula does not mean losing your AI history. Import everything and continue where you left off.',
        },
        {
            title: 'Unified Memory',
            description:
                'Conversations from ChatGPT, Claude, and Yula all become part of one searchable semantic memory.',
        },
        {
            title: 'Cross-Model Access',
            description:
                'Ask GPT-5 about something you discussed with Claude, or vice versa. All history is accessible to all models.',
        },
        {
            title: 'Semantic Search',
            description:
                'Imported conversations are embedded for semantic search. Find discussions by meaning, not just keywords.',
        },
    ],
    howItWorks: [
        {
            step: 1,
            title: 'Export from ChatGPT/Claude',
            description:
                "Go to settings in ChatGPT or Claude and request your data export. You'll receive a file with your conversations.",
        },
        {
            step: 2,
            title: 'Upload to Yula',
            description:
                "In Yula's Import section, upload your export file. Yula processes and converts it automatically.",
        },
        {
            step: 3,
            title: 'Embedding and indexing',
            description:
                'Yula converts your conversations into vector embeddings and indexes them in your semantic memory.',
        },
        {
            step: 4,
            title: 'Access anywhere',
            description:
                'Your imported history is now searchable and available as context for any AI model you use.',
        },
    ],
    useCases: [
        {
            title: 'ChatGPT Refugees',
            description:
                'Moving away from ChatGPT? Bring all your conversations with you. No knowledge is lost.',
        },
        {
            title: 'Claude Users',
            description: 'Want to try GPT-5 but keep your Claude context? Import and have both.',
        },
        {
            title: 'AI Power Users',
            description:
                'Consolidate history from multiple AI platforms into one unified, searchable memory.',
        },
        {
            title: 'Long-term Projects',
            description:
                'Projects spanning months across different AI tools? Import everything and maintain full context.',
        },
    ],
    faqs: [
        {
            question: 'What formats can I import?',
            answer: 'Yula supports ChatGPT exports (JSON) and Claude exports (JSON). We are working on adding support for more platforms.',
        },
        {
            question: 'How long does import take?',
            answer: 'Small exports (under 1000 conversations) typically process in minutes. Larger exports may take longer due to embedding generation.',
        },
        {
            question: 'Is there a limit to how much I can import?',
            answer: 'There is no hard limit. Import your entire history - Yula can handle it.',
        },
        {
            question: 'Can I delete imported conversations?',
            answer: 'Yes! You can manage all imported conversations in the Memory Inspector, including selective deletion.',
        },
    ],
    ctaText: 'Import Your History Free',
    relatedFeatures: [
        {
            name: 'Semantic Memory',
            slug: 'memory',
            description: 'Persistent memory across all AI models',
        },
        {
            name: 'Council Mode',
            slug: 'council',
            description: 'Compare responses from multiple AI models',
        },
        {
            name: 'PAC',
            slug: 'pac',
            description: 'Proactive AI that messages you first',
        },
    ],
};

export default function ImportFeaturePage() {
    return <FeaturePage feature={importData} />;
}
