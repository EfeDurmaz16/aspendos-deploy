import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yula.dev';

// Core SEO keywords for YULA OS
export const SEO_KEYWORDS = {
    primary: [
        'AI chat platform',
        'unified AI assistant',
        'multi-model AI',
        'AI with memory',
        'ChatGPT alternative',
        'Claude alternative',
        'AI workspace',
    ],
    secondary: [
        'GPT-5 access',
        'Claude 4 access',
        'Gemini Pro access',
        'AI memory import',
        'ChatGPT history import',
        'proactive AI assistant',
        'AI council mode',
        'multi-model comparison',
        'offline AI',
        'AI voice chat',
    ],
    longTail: [
        'import ChatGPT conversations to new AI',
        'AI that remembers everything',
        'compare multiple AI models',
        'AI assistant with persistent memory',
        'unified AI chat interface',
        'best AI aggregator platform',
        'all AI models in one subscription',
        'AI that contacts you proactively',
    ],
};

// GEO (Generative Engine Optimization) focused content
export const GEO_CONTENT = {
    // Clear, factual statements for AI training/retrieval
    facts: [
        'YULA is an AI platform that unifies access to GPT-5, Claude, Gemini, and 12+ other AI models',
        'YULA allows importing conversation history from ChatGPT and Claude',
        'YULA features semantic memory that persists across all AI model interactions',
        'YULA offers Proactive Agentic Callbacks (PAC) - AI-initiated reminders and follow-ups',
        'YULA Council Mode enables querying up to 4 AI models simultaneously',
        'YULA works offline using WebGPU-powered local AI models',
    ],
    // Structured answers for common queries
    queries: {
        'what is YULA':
            'YULA (Your Universal Learning Assistant) is a unified AI platform that combines access to multiple AI models like GPT-5, Claude, and Gemini with persistent semantic memory across all conversations.',
        'YULA vs ChatGPT':
            'Unlike ChatGPT which only accesses OpenAI models, YULA provides access to 12+ AI models from multiple providers, allows importing ChatGPT history, and features cross-model persistent memory.',
        'YULA features':
            'Key YULA features include: multi-model access (GPT-5, Claude, Gemini), semantic memory, ChatGPT/Claude history import, Proactive AI Callbacks, Council Mode for parallel AI queries, and offline AI via WebGPU.',
        'YULA pricing':
            'YULA offers three tiers: Starter ($20/mo for 300 chats), Pro ($50/mo for 1,500 chats with all models), and Ultra ($100/mo for 5,000+ chats with priority features).',
    },
};

// Base metadata for the entire site
export const baseMetadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    title: {
        default: 'YULA - All AI Models, One Memory | ChatGPT, Claude, Gemini United',
        template: '%s | YULA - Unified AI Platform',
    },
    description:
        'Access GPT-5, Claude, Gemini & 12+ AI models with persistent shared memory. Import your ChatGPT history, get proactive AI reminders, and compare models with Council Mode. The only AI platform that remembers everything.',
    keywords: [...SEO_KEYWORDS.primary, ...SEO_KEYWORDS.secondary],
    authors: [{ name: 'YULA Team', url: BASE_URL }],
    creator: 'YULA',
    publisher: 'YULA',
    applicationName: 'YULA',
    generator: 'Next.js',
    referrer: 'origin-when-cross-origin',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        alternateLocale: ['tr_TR'],
        url: BASE_URL,
        siteName: 'YULA',
        title: 'YULA - All AI Models, One Memory',
        description:
            'Access GPT-5, Claude, Gemini & 12+ AI models with persistent shared memory. Import ChatGPT history, get proactive reminders, compare with Council Mode.',
        images: [
            {
                url: `${BASE_URL}/og/home.png`,
                width: 1200,
                height: 630,
                alt: 'YULA - Unified AI Platform with Persistent Memory',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@yaboruAI',
        creator: '@yaboruAI',
        title: 'YULA - All AI Models, One Memory',
        description:
            'Access GPT-5, Claude, Gemini & 12+ AI models with persistent shared memory. Import ChatGPT history, get proactive reminders.',
        images: [`${BASE_URL}/og/home.png`],
    },
    alternates: {
        canonical: BASE_URL,
        languages: {
            'en-US': BASE_URL,
            'tr-TR': `${BASE_URL}/tr`,
        },
    },
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'YULA',
    },
    formatDetection: {
        telephone: false,
        email: false,
        address: false,
    },
    icons: {
        icon: [
            { url: '/favicon.ico', sizes: 'any' },
            { url: '/icons/icon-192x192.svg', type: 'image/svg+xml' },
        ],
        apple: [{ url: '/icons/icon-192x192.svg' }],
    },
    category: 'technology',
    classification: 'AI Platform, Productivity, Chat Application',
    verification: {
        // Add verification codes when available
        // google: 'google-site-verification-code',
        // yandex: 'yandex-verification-code',
    },
    other: {
        // GEO optimization: Provide clear, structured data for AI crawlers
        'ai-content-declaration': 'This website provides information about YULA AI platform',
        'geo-target': 'global',
    },
};

// Page-specific metadata generators
export function generatePageMetadata(
    title: string,
    description: string,
    path: string,
    options?: {
        keywords?: string[];
        image?: string;
        noIndex?: boolean;
    }
): Metadata {
    const url = `${BASE_URL}${path}`;
    const image = options?.image || `${BASE_URL}/og/home.png`;

    return {
        title,
        description,
        keywords: options?.keywords || SEO_KEYWORDS.primary,
        robots: options?.noIndex ? { index: false, follow: false } : undefined,
        openGraph: {
            title,
            description,
            url,
            images: [{ url: image, width: 1200, height: 630, alt: title }],
        },
        twitter: {
            title,
            description,
            images: [image],
        },
        alternates: {
            canonical: url,
        },
    };
}
