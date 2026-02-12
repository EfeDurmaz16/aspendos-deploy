import type { Metadata } from 'next';
import { ComparisonPage, type CompetitorData } from '@/components/seo/ComparisonPage';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Poe Alternative with Memory | YULA',
    'Looking for a Poe alternative? YULA offers persistent memory across all models, proactive AI callbacks, and import from ChatGPT/Claude.',
    '/compare/poe',
    {
        keywords: [
            'Poe alternative',
            'Poe AI alternative',
            'Poe vs YULA',
            'better than Poe',
            'Quora Poe alternative',
            'multi-model AI',
        ],
    }
);

const poeData: CompetitorData = {
    name: 'Poe',
    slug: 'poe',
    tagline:
        'Like Poe, YULA offers multi-model access. Unlike Poe, YULA has persistent memory, proactive AI, and history import from other platforms.',
    description:
        'Poe by Quora is a multi-model AI platform that gives users access to various AI models and custom bots.',
    logoColor: 'bg-purple-500',
    strengths: [
        'Access to multiple AI models (GPT-4, Claude, Gemini)',
        'Custom bot creation and sharing',
        'Active community of bot creators',
        'Pay-per-message pricing option',
        'Clean, simple interface',
    ],
    yulaAdvantages: [
        'Persistent semantic memory across ALL conversations and models',
        'Import your ChatGPT and Claude history with one click',
        'Proactive AI Callbacks (PAC) - AI that messages YOU first',
        'Council Mode: Compare 4 models side-by-side',
        'Better pricing for heavy users',
        'Focus on productivity, not just chat',
    ],
    featureComparison: [
        { feature: 'Multi-Model Access', competitor: true, yula: true },
        { feature: 'Persistent Memory', competitor: false, yula: true },
        { feature: 'History Import', competitor: false, yula: true },
        { feature: 'Proactive Reminders', competitor: false, yula: true },
        { feature: 'Council Mode (4x parallel)', competitor: false, yula: true },
        { feature: 'Custom Bots', competitor: true, yula: 'Coming soon' },
        { feature: 'Pay-per-Message', competitor: true, yula: 'Subscription only' },
        { feature: 'Offline AI', competitor: false, yula: true },
        { feature: 'Voice Mode', competitor: 'Limited', yula: true },
    ],
    pricingComparison: [
        { tier: 'Free', competitor: 'Daily limits', yula: 'N/A' },
        { tier: 'Basic', competitor: '$20/mo (Subscriber)', yula: '$20/mo (Starter)' },
        { tier: 'Pro', competitor: 'Pay-per-message', yula: '$50/mo (Pro)' },
        { tier: 'Enterprise', competitor: 'N/A', yula: '$100/mo (Ultra)' },
    ],
    faqs: [
        {
            question: 'How is YULA different from Poe?',
            answer: 'Both offer multi-model access. YULA adds persistent memory across all conversations, proactive AI callbacks, history import from ChatGPT/Claude, and Council Mode for parallel model queries. Poe focuses on custom bots and community.',
        },
        {
            question: 'Can I create custom bots on YULA like Poe?',
            answer: 'Custom bot creation is coming soon to YULA. Currently, YULA focuses on providing the best multi-model AI experience with persistent memory and proactive features that Poe does not have.',
        },
        {
            question: 'Is YULA pricing better than Poe?',
            answer: 'For heavy users, yes. Poe uses pay-per-message which can get expensive. YULA offers flat-rate subscriptions: $50/month for 1,500 chats with all models, or $100/month for 5,000+ chats with parallel queries.',
        },
        {
            question: 'Does YULA have a community like Poe?',
            answer: 'YULA focuses on personal productivity rather than social features. If you want community and custom bots, Poe is good. If you want persistent memory, proactive AI, and history import, YULA is better.',
        },
    ],
    ctaText: 'Try YULA with Persistent Memory',
};

export default function PoeComparePage() {
    return <ComparisonPage competitor={poeData} />;
}
