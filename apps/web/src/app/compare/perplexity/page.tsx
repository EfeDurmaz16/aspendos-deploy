import type { Metadata } from 'next';
import { ComparisonPage, type CompetitorData } from '@/components/seo/ComparisonPage';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Perplexity Alternative with Memory | Yula',
    'Looking for a Perplexity alternative? Yula offers persistent memory, access to 12+ AI models, and deep conversational AI beyond quick search answers.',
    '/compare/perplexity',
    {
        keywords: [
            'Perplexity alternative',
            'Perplexity AI alternative',
            'Perplexity vs Yula',
            'better than Perplexity',
            'AI search alternative',
            'Perplexity replacement',
        ],
    }
);

const perplexityData: CompetitorData = {
    name: 'Perplexity',
    slug: 'perplexity',
    tagline:
        'Yula offers deep conversational AI with persistent memory, while Perplexity focuses on quick search answers. Get the best of both worlds.',
    description:
        'Perplexity is an AI-powered search engine that provides concise answers with citations from web sources.',
    logoColor: 'bg-teal-500',
    strengths: [
        'Excellent for quick research with citations',
        'Real-time web search integration',
        'Clean, focused search interface',
        'Free tier with good limits',
        'Multiple AI models for Pro users',
    ],
    yulaAdvantages: [
        'Deep conversational AI, not just search answers',
        'Persistent semantic memory across ALL conversations',
        'Proactive AI Callbacks (PAC) - AI that messages YOU first',
        'Council Mode: Compare 4 AI models simultaneously',
        'Import history from ChatGPT and Claude',
        'Better for complex tasks, coding, and long-form work',
    ],
    featureComparison: [
        { feature: 'Quick Search Answers', competitor: true, yula: 'Via MCP' },
        { feature: 'Deep Conversations', competitor: 'Limited', yula: true },
        { feature: 'Persistent Memory', competitor: 'Limited', yula: true },
        { feature: 'Multi-Model Access', competitor: true, yula: true },
        { feature: 'Proactive Reminders', competitor: false, yula: true },
        { feature: 'History Import', competitor: false, yula: true },
        { feature: 'Citations', competitor: true, yula: 'Via search MCP' },
        { feature: 'Coding Assistance', competitor: 'Basic', yula: 'Advanced' },
        { feature: 'Voice Input', competitor: true, yula: true },
    ],
    pricingComparison: [
        { tier: 'Free', competitor: 'Limited searches', yula: 'N/A' },
        { tier: 'Basic', competitor: '$20/mo (Pro)', yula: '$20/mo (Starter)' },
        { tier: 'Pro', competitor: '$40/mo (Enterprise)', yula: '$50/mo (Pro)' },
        { tier: 'Enterprise', competitor: 'Custom', yula: '$100/mo (Ultra)' },
    ],
    faqs: [
        {
            question: 'Is Yula like Perplexity?',
            answer: 'They serve different purposes. Perplexity is optimized for quick search with citations. Yula is a conversational AI platform with persistent memory, multi-model access, and proactive AI callbacks. Yula is better for complex tasks and ongoing projects.',
        },
        {
            question: 'Can Yula search the web like Perplexity?',
            answer: 'Yula supports MCP (Model Context Protocol) integrations that can add web search capabilities. While not the primary focus, you can get similar functionality while also having persistent memory and multi-model access.',
        },
        {
            question: 'Why choose Yula over Perplexity?',
            answer: 'Choose Perplexity for quick research. Choose Yula for deep conversations, complex tasks, coding, and projects where you need AI to remember context. Yula also offers proactive AI that can message you first.',
        },
        {
            question: 'Does Yula have the Pro Search feature?',
            answer: 'Yula focuses on deep conversational AI rather than search. However, with MCP integrations, you can add search capabilities while also having access to 12+ AI models with persistent memory.',
        },
    ],
    ctaText: 'Try Yula for Deep AI Conversations',
};

export default function PerplexityComparePage() {
    return <ComparisonPage competitor={perplexityData} />;
}
