import type { Metadata } from 'next';
import {
    FeaturesIndexPage,
    type FeatureIndexData,
} from '@/components/seo/FeaturesIndexPage';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Features | Yula AI Platform',
    'Explore Yula features: Semantic Memory, Council Mode, PAC (Proactive AI), and History Import. The most advanced unified AI platform.',
    '/features',
    {
        keywords: [
            'Yula features',
            'AI features',
            'semantic memory',
            'council mode',
            'proactive AI',
            'AI history import',
        ],
    }
);

const features: FeatureIndexData[] = [
    {
        name: 'Semantic Memory',
        slug: 'memory',
        description:
            'Persistent memory across all AI models. Your AI remembers every conversation and can search your entire history.',
        icon: 'brain',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
    },
    {
        name: 'Council Mode',
        slug: 'council',
        description:
            'Query up to 4 AI models simultaneously. Compare GPT-5, Claude, Gemini, and Llama responses side-by-side.',
        icon: 'users-three',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
    },
    {
        name: 'PAC - Proactive AI',
        slug: 'pac',
        description:
            'The first AI that messages YOU first. Schedule reminders, follow-ups, and let Yula reach out when it matters.',
        icon: 'bell-ringing',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
    },
    {
        name: 'History Import',
        slug: 'import',
        description:
            'Import your ChatGPT and Claude conversations. Bring your AI memory with you and never start from scratch.',
        icon: 'upload-simple',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
    },
];

export default function FeaturesPage() {
    return <FeaturesIndexPage features={features} />;
}
