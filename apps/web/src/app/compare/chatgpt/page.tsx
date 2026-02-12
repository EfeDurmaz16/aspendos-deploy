import type { Metadata } from 'next';
import { ComparisonPage, type CompetitorData } from '@/components/seo/ComparisonPage';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'ChatGPT Alternative with Memory | YULA',
    'Looking for a ChatGPT alternative? YULA offers persistent memory, access to 12+ AI models including GPT-5, and the ability to import your ChatGPT history.',
    '/compare/chatgpt',
    {
        keywords: [
            'ChatGPT alternative',
            'ChatGPT with memory',
            'import ChatGPT history',
            'ChatGPT vs YULA',
            'better than ChatGPT',
            'ChatGPT replacement',
        ],
    }
);

const chatgptData: CompetitorData = {
    name: 'ChatGPT',
    slug: 'chatgpt',
    tagline:
        'YULA gives you everything ChatGPT offers, plus persistent memory, multi-model access, and the ability to import your ChatGPT history.',
    description:
        'ChatGPT by OpenAI is the most popular AI assistant, offering GPT-4 and GPT-4o models with a clean interface and plugin ecosystem.',
    logoColor: 'bg-emerald-500',
    strengths: [
        'First-mover advantage with massive user base',
        'GPT-4o with fast response times',
        'Plugin ecosystem for third-party integrations',
        'Mobile apps for iOS and Android',
        'Voice conversations with Advanced Voice Mode',
    ],
    yulaAdvantages: [
        'Access 12+ AI models (GPT-5, Claude, Gemini, Llama) vs OpenAI models only',
        'Import your entire ChatGPT history with one click - no more starting fresh',
        'Persistent semantic memory across ALL conversations and models',
        'Proactive AI Callbacks (PAC) - AI that messages YOU first',
        'Council Mode: Compare responses from 4 models simultaneously',
        'Lower cost for similar usage with more features included',
    ],
    featureComparison: [
        { feature: 'GPT-5/GPT-4o Access', competitor: true, yula: true },
        { feature: 'Claude Access', competitor: false, yula: true },
        { feature: 'Gemini Access', competitor: false, yula: true },
        {
            feature: 'Persistent Memory',
            competitor: 'Per-conversation',
            yula: 'Cross-conversation',
        },
        { feature: 'Import ChatGPT History', competitor: false, yula: true },
        { feature: 'Multi-Model Comparison', competitor: false, yula: true },
        { feature: 'Proactive Reminders', competitor: false, yula: true },
        { feature: 'Voice Mode', competitor: true, yula: true },
        { feature: 'Offline AI', competitor: false, yula: true },
    ],
    pricingComparison: [
        { tier: 'Free', competitor: 'Limited GPT-3.5', yula: 'N/A' },
        { tier: 'Basic', competitor: '$20/mo (Plus)', yula: '$20/mo (Starter)' },
        { tier: 'Pro', competitor: '$200/mo (Pro)', yula: '$50/mo (Pro)' },
        { tier: 'Enterprise', competitor: 'Custom', yula: '$100/mo (Ultra)' },
    ],
    faqs: [
        {
            question: 'Can I import my ChatGPT conversations to YULA?',
            answer: 'Yes! YULA supports one-click import of your ChatGPT conversation history. Just export your data from ChatGPT settings and upload it to YULA. All your conversations become searchable in your semantic memory.',
        },
        {
            question: 'Does YULA use the same GPT models as ChatGPT?',
            answer: 'YULA provides access to OpenAI models including GPT-5.2, GPT-5 Nano, and GPT-4o, plus 12+ other models from Anthropic, Google, Meta, and more. You get more model choices than ChatGPT alone.',
        },
        {
            question: 'Is YULA better than ChatGPT?',
            answer: 'YULA offers capabilities ChatGPT does not: multi-model access, persistent memory across all conversations, history import, and proactive AI that can message you first. For users who want more than a single provider, YULA is the better choice.',
        },
        {
            question: 'How is YULA pricing compared to ChatGPT?',
            answer: 'YULA Pro at $50/month gives you access to all models with 1,500 chats, while ChatGPT Pro at $200/month only gives you OpenAI models. For most users, YULA offers significantly better value.',
        },
    ],
    ctaText: 'Import your ChatGPT history free',
};

export default function ChatGPTComparePage() {
    return <ComparisonPage competitor={chatgptData} />;
}
