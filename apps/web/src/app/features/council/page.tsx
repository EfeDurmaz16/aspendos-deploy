import { UsersThree } from '@phosphor-icons/react/dist/ssr';
import type { Metadata } from 'next';
import { type FeatureData, FeaturePage } from '@/components/seo/FeaturePage';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Council Mode | Multi-Model AI Comparison | Yula',
    'Query up to 4 AI models simultaneously with Council Mode. Compare GPT-5, Claude, Gemini, and Llama responses side-by-side.',
    '/features/council',
    {
        keywords: [
            'multi-model AI',
            'compare AI models',
            'Council Mode',
            'GPT vs Claude',
            'AI comparison',
            'parallel AI queries',
        ],
    }
);

const councilData: FeatureData = {
    name: 'Council Mode',
    slug: 'council',
    tagline:
        'Query multiple AI models simultaneously. Compare GPT-5, Claude, Gemini, and Llama responses side-by-side to get the best answer.',
    description: `Council Mode is Yula's unique multi-model querying feature. Send a single question to up to 4 AI models at once and compare their responses in real-time. Perfect for important decisions, complex questions, or when you want multiple perspectives. Pro users can compare 2 models; Ultra users get 4x parallel queries.`,
    heroIcon: <UsersThree className="w-16 h-16 text-primary" weight="duotone" />,
    benefits: [
        {
            title: 'Get Multiple Perspectives',
            description:
                'Different AI models have different strengths. Council Mode lets you leverage all of them at once.',
        },
        {
            title: 'Choose the Best Answer',
            description:
                'Compare responses side-by-side and pick the best one, or combine insights from multiple models.',
        },
        {
            title: 'Save Time',
            description:
                'Instead of asking the same question to different models separately, get all responses simultaneously.',
        },
        {
            title: 'Reduce AI Bias',
            description:
                'Cross-reference answers from multiple providers to get a more balanced, reliable response.',
        },
    ],
    howItWorks: [
        {
            step: 1,
            title: 'Select your council',
            description:
                'Choose which AI models you want to query - GPT-5, Claude, Gemini, Llama, or any combination.',
        },
        {
            step: 2,
            title: 'Ask your question',
            description:
                'Type your question once. Yula sends it to all selected models simultaneously.',
        },
        {
            step: 3,
            title: 'Compare responses',
            description:
                'View all responses side-by-side as they stream in. Each model responds independently.',
        },
        {
            step: 4,
            title: 'Choose or combine',
            description:
                'Pick the best response, or ask Yula to synthesize insights from multiple answers.',
        },
    ],
    useCases: [
        {
            title: 'Complex Decisions',
            description:
                'Get multiple perspectives on business decisions, technical architecture, or life choices.',
        },
        {
            title: 'Fact Verification',
            description:
                'Cross-reference factual claims across models to reduce hallucinations and increase accuracy.',
        },
        {
            title: 'Creative Writing',
            description:
                'Get different creative approaches from each model and combine the best elements.',
        },
        {
            title: 'Code Review',
            description:
                'Have multiple AI models review your code. Each might catch different issues.',
        },
    ],
    faqs: [
        {
            question: 'How many models can I query at once?',
            answer: 'Pro plan users can query 2 models simultaneously. Ultra plan users can query up to 4 models at once.',
        },
        {
            question: 'Does Council Mode use more of my chat quota?',
            answer: 'Yes, each model response counts as one chat. Querying 4 models uses 4 chats from your monthly quota.',
        },
        {
            question: 'Can I customize which models are in my council?',
            answer: 'Yes! You can choose any combination from our 12+ available models for your council.',
        },
        {
            question: 'Is the memory shared across council queries?',
            answer: 'Yes! All models in your council have access to your semantic memory, so they all understand your context.',
        },
    ],
    ctaText: 'Try Council Mode',
    relatedFeatures: [
        {
            name: 'Semantic Memory',
            slug: 'memory',
            description: 'Persistent memory across all AI models',
        },
        {
            name: 'Import',
            slug: 'import',
            description: 'Import ChatGPT and Claude history',
        },
        {
            name: 'PAC',
            slug: 'pac',
            description: 'Proactive AI that messages you first',
        },
    ],
};

export default function CouncilFeaturePage() {
    return <FeaturePage feature={councilData} />;
}
