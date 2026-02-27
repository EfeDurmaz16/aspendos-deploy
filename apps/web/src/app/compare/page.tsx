import type { Metadata } from 'next';
import {
    CompareIndexPage,
    type CompareIndexCompetitor,
} from '@/components/seo/CompareIndexPage';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Compare AI Platforms | Yula vs ChatGPT, Claude, Gemini',
    'Compare Yula with ChatGPT, Claude, Gemini, Perplexity, and Poe. See why Yula is the best unified AI platform with persistent memory and multi-model access.',
    '/compare',
    {
        keywords: [
            'AI comparison',
            'ChatGPT alternative',
            'Claude alternative',
            'compare AI platforms',
            'best AI chat platform',
            'multi-model AI comparison',
        ],
    }
);

const competitors: CompareIndexCompetitor[] = [
    {
        name: 'ChatGPT',
        slug: 'chatgpt',
        description: 'Compare Yula with OpenAI ChatGPT - import history, multi-model access',
        color: 'bg-emerald-500',
        searches: '74K monthly searches',
    },
    {
        name: 'Claude',
        slug: 'claude',
        description: 'Compare Yula with Anthropic Claude - persistent memory across models',
        color: 'bg-orange-500',
        searches: '22K monthly searches',
    },
    {
        name: 'Gemini',
        slug: 'gemini',
        description: 'Compare Yula with Google Gemini - not locked into one ecosystem',
        color: 'bg-blue-500',
        searches: '18K monthly searches',
    },
    {
        name: 'Perplexity',
        slug: 'perplexity',
        description: 'Compare Yula with Perplexity - deep conversations vs quick search',
        color: 'bg-teal-500',
        searches: '12K monthly searches',
    },
    {
        name: 'Poe',
        slug: 'poe',
        description: 'Compare Yula with Quora Poe - memory and proactive features',
        color: 'bg-purple-500',
        searches: '8K monthly searches',
    },
];

export default function ComparePage() {
    return <CompareIndexPage competitors={competitors} />;
}
