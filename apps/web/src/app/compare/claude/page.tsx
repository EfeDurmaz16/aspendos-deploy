import type { Metadata } from 'next';
import { ComparisonPage, type CompetitorData } from '@/components/seo/ComparisonPage';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Claude Alternative with Memory | YULA',
    'Looking for a Claude alternative? YULA offers persistent memory, access to Claude plus 12+ other AI models, and the ability to import your Claude history.',
    '/compare/claude',
    {
        keywords: [
            'Claude alternative',
            'Claude AI alternative',
            'import Claude history',
            'Claude vs YULA',
            'better than Claude',
            'Anthropic alternative',
        ],
    }
);

const claudeData: CompetitorData = {
    name: 'Claude',
    slug: 'claude',
    tagline: 'YULA gives you Claude plus 12+ other AI models, persistent memory across all of them, and the ability to import your Claude history.',
    description: 'Claude by Anthropic is known for its safety-focused approach, long context windows, and excellent writing capabilities.',
    logoColor: 'bg-orange-500',
    strengths: [
        'Excellent at nuanced, long-form writing',
        'Industry-leading 200K context window',
        'Strong safety and alignment focus',
        'Claude 4.5 Opus for complex reasoning',
        'Artifacts feature for code and documents',
    ],
    yulaAdvantages: [
        'Access Claude PLUS 12+ other models (GPT-5, Gemini, Llama)',
        'Import your entire Claude history with one click',
        'Persistent semantic memory across ALL conversations and models',
        'Proactive AI Callbacks (PAC) - AI that messages YOU first',
        'Council Mode: Compare Claude with GPT-5, Gemini simultaneously',
        'Use the right model for each task, not just one provider',
    ],
    featureComparison: [
        { feature: 'Claude Access', competitor: true, yula: true },
        { feature: 'GPT-5 Access', competitor: false, yula: true },
        { feature: 'Gemini Access', competitor: false, yula: true },
        { feature: 'Persistent Memory', competitor: 'Per-conversation', yula: 'Cross-conversation' },
        { feature: 'Import Claude History', competitor: false, yula: true },
        { feature: 'Multi-Model Comparison', competitor: false, yula: true },
        { feature: 'Proactive Reminders', competitor: false, yula: true },
        { feature: 'Artifacts', competitor: true, yula: 'Coming soon' },
        { feature: 'Long Context (200K+)', competitor: true, yula: true },
    ],
    pricingComparison: [
        { tier: 'Free', competitor: 'Limited Claude 3.5', yula: 'N/A' },
        { tier: 'Basic', competitor: '$20/mo (Pro)', yula: '$20/mo (Starter)' },
        { tier: 'Pro', competitor: '$100/mo (Max)', yula: '$50/mo (Pro)' },
        { tier: 'Enterprise', competitor: 'Custom', yula: '$100/mo (Ultra)' },
    ],
    faqs: [
        {
            question: 'Can I import my Claude conversations to YULA?',
            answer: 'Yes! YULA supports one-click import of your Claude conversation history. Export your data from Claude settings and upload it to YULA. All conversations become part of your searchable semantic memory.',
        },
        {
            question: 'Does YULA have the same Claude models?',
            answer: 'YULA provides access to Claude 4.5 Opus and Claude 4.5 Sonnet from Anthropic, plus 12+ other models. You get the full Claude experience along with GPT-5, Gemini, and more.',
        },
        {
            question: 'Why choose YULA over Claude directly?',
            answer: 'YULA gives you Claude PLUS multi-model access, persistent memory that works across all models, and proactive AI callbacks. If Claude is great for one task but GPT-5 is better for another, YULA lets you use both.',
        },
        {
            question: 'Is YULA more expensive than Claude Pro?',
            answer: 'YULA Pro at $50/month gives you all models including Claude, while Claude Max at $100/month only gives you Anthropic models. YULA Ultra at $100/month includes 4x parallel queries across all models.',
        },
    ],
    ctaText: 'Import your Claude history free',
};

export default function ClaudeComparePage() {
    return <ComparisonPage competitor={claudeData} />;
}
