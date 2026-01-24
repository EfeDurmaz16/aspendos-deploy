import type { Metadata } from 'next';
import { ComparisonPage, type CompetitorData } from '@/components/seo/ComparisonPage';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Gemini Alternative with Memory | YULA',
    'Looking for a Google Gemini alternative? YULA offers persistent memory, access to Gemini plus 12+ other AI models including GPT-5 and Claude.',
    '/compare/gemini',
    {
        keywords: [
            'Gemini alternative',
            'Google Gemini alternative',
            'Gemini vs YULA',
            'better than Gemini',
            'Gemini Pro alternative',
            'Google AI alternative',
        ],
    }
);

const geminiData: CompetitorData = {
    name: 'Gemini',
    slug: 'gemini',
    tagline: 'YULA gives you Gemini plus 12+ other AI models, persistent memory across all of them, and proactive AI that messages you first.',
    description: 'Google Gemini is an AI assistant integrated into Google Workspace, offering multimodal capabilities and Google Search integration.',
    logoColor: 'bg-blue-500',
    strengths: [
        'Deep Google Workspace integration (Docs, Gmail, Drive)',
        'Excellent multimodal capabilities (images, video)',
        'Native Google Search grounding',
        'Gemini 3 Pro with 1M context window',
        'Free tier with generous limits',
    ],
    yulaAdvantages: [
        'Access Gemini PLUS 12+ other models (GPT-5, Claude, Llama)',
        'Persistent semantic memory that works across ALL models',
        'Proactive AI Callbacks (PAC) - AI that messages YOU first',
        'Council Mode: Compare Gemini with GPT-5, Claude simultaneously',
        'Import history from ChatGPT and Claude',
        'Not locked into the Google ecosystem',
    ],
    featureComparison: [
        { feature: 'Gemini Access', competitor: true, yula: true },
        { feature: 'GPT-5 Access', competitor: false, yula: true },
        { feature: 'Claude Access', competitor: false, yula: true },
        { feature: 'Persistent Memory', competitor: 'Google-based', yula: 'Universal' },
        { feature: 'Multi-Model Comparison', competitor: false, yula: true },
        { feature: 'Proactive Reminders', competitor: false, yula: true },
        { feature: 'Google Workspace Integration', competitor: true, yula: 'Via MCP' },
        { feature: 'Multimodal (Images)', competitor: true, yula: true },
        { feature: 'History Import', competitor: false, yula: true },
    ],
    pricingComparison: [
        { tier: 'Free', competitor: 'Gemini 1.5 Flash', yula: 'N/A' },
        { tier: 'Basic', competitor: '$20/mo (Advanced)', yula: '$20/mo (Starter)' },
        { tier: 'Pro', competitor: 'Workspace pricing', yula: '$50/mo (Pro)' },
        { tier: 'Enterprise', competitor: 'Workspace Enterprise', yula: '$100/mo (Ultra)' },
    ],
    faqs: [
        {
            question: 'Does YULA have access to Gemini models?',
            answer: 'Yes! YULA provides access to Gemini 3 Pro from Google, plus 12+ other models from OpenAI, Anthropic, Meta, and more. You can use whichever model is best for your task.',
        },
        {
            question: 'Can I use YULA with Google Workspace?',
            answer: 'YULA supports MCP (Model Context Protocol) integrations that can connect to Google services. While not as deeply integrated as native Gemini, you get the flexibility of multi-model access.',
        },
        {
            question: 'Why choose YULA over Google Gemini?',
            answer: 'Gemini locks you into the Google ecosystem. YULA gives you Gemini plus GPT-5, Claude, and more. With persistent memory and proactive callbacks, YULA offers capabilities Gemini does not have.',
        },
        {
            question: 'Does Gemini have persistent memory like YULA?',
            answer: 'Gemini memory is tied to your Google account and only works within the Gemini app. YULA memory works across all 12+ AI models, letting you switch between models while keeping full context.',
        },
    ],
    ctaText: 'Try YULA with Gemini + More',
};

export default function GeminiComparePage() {
    return <ComparisonPage competitor={geminiData} />;
}
