import { Brain } from '@phosphor-icons/react/dist/ssr';
import type { Metadata } from 'next';
import { type FeatureData, FeaturePage } from '@/components/seo/FeaturePage';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Semantic Memory | Yula AI Features',
    'Yula features persistent semantic memory across all AI models. Your AI remembers every conversation and can search your entire history.',
    '/features/memory',
    {
        keywords: [
            'AI memory',
            'persistent AI memory',
            'semantic memory',
            'AI that remembers',
            'cross-model memory',
            'conversation history',
        ],
    }
);

const memoryData: FeatureData = {
    name: 'Semantic Memory',
    slug: 'memory',
    tagline:
        'AI that remembers everything. Every conversation, every preference, every context - available across all AI models.',
    description: `Yula's Semantic Memory is powered by vector embeddings stored in Qdrant, enabling true semantic search across your entire conversation history. Unlike other AI assistants that forget between sessions, Yula maintains persistent context that works across GPT-5, Claude, Gemini, and all other models. Ask any model about something you discussed months ago with a different model - Yula remembers.`,
    heroIcon: <Brain className="w-16 h-16 text-primary" weight="duotone" />,
    benefits: [
        {
            title: 'Cross-Model Memory',
            description:
                'Memory works across ALL AI models. Discuss a project with Claude, then continue it with GPT-5 - Yula maintains full context.',
        },
        {
            title: 'Semantic Search',
            description:
                'Search your conversation history by meaning, not just keywords. Find that discussion about "that thing we talked about last month" naturally.',
        },
        {
            title: 'Automatic Context',
            description:
                'Yula automatically retrieves relevant memories when you ask questions, making every AI response more personalized and informed.',
        },
        {
            title: 'Import Your History',
            description:
                'Import conversations from ChatGPT and Claude into your semantic memory. No more starting from scratch.',
        },
    ],
    howItWorks: [
        {
            step: 1,
            title: 'Conversations are embedded',
            description:
                'Every conversation is converted into vector embeddings that capture semantic meaning, not just keywords.',
        },
        {
            step: 2,
            title: 'Stored in vector database',
            description:
                'Embeddings are stored in Qdrant, a high-performance vector database optimized for similarity search.',
        },
        {
            step: 3,
            title: 'Automatic retrieval',
            description:
                'When you ask a question, relevant memories are automatically retrieved and provided to the AI as context.',
        },
        {
            step: 4,
            title: 'Cross-model availability',
            description:
                'The same memory is available to all AI models, so you can switch between GPT-5, Claude, and Gemini seamlessly.',
        },
    ],
    useCases: [
        {
            title: 'Long-term Projects',
            description:
                'Work on projects over weeks or months without losing context. Yula remembers all previous discussions.',
        },
        {
            title: 'Personal Preferences',
            description:
                'Yula learns your coding style, writing preferences, and communication patterns over time.',
        },
        {
            title: 'Knowledge Base',
            description:
                'Build a personal AI knowledge base from your conversations that any model can access.',
        },
        {
            title: 'Research Continuity',
            description:
                'Continue research threads across sessions without re-explaining your progress each time.',
        },
    ],
    faqs: [
        {
            question: 'How is Yula memory different from ChatGPT memory?',
            answer: 'ChatGPT memory is limited to OpenAI models and only remembers key facts. Yula memory is semantic - it understands meaning and context, works across all 12+ AI models, and includes your full conversation history.',
        },
        {
            question: 'Can I delete specific memories?',
            answer: 'Yes! You can view, search, and delete any memories from your Memory Inspector. You have full control over what Yula remembers.',
        },
        {
            question: 'Is my memory data private?',
            answer: 'Yes. Your memory data is encrypted and never shared. It is only used to improve your personal AI experience.',
        },
        {
            question: 'How much history can Yula remember?',
            answer: 'Yula can store unlimited conversation history. The semantic search ensures relevant memories are always retrieved, regardless of how much history you have.',
        },
    ],
    ctaText: 'Try AI with Memory',
    relatedFeatures: [
        {
            name: 'Import',
            slug: 'import',
            description: 'Import ChatGPT and Claude history into your memory',
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

export default function MemoryFeaturePage() {
    return <FeaturePage feature={memoryData} />;
}
