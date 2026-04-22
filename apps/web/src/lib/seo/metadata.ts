import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yula.dev';

// New positioning: deterministic, auditable agents. Replaces the old
// "access 12+ AI models with shared memory" aggregator pitch.
const POSITIONING_TAGLINE =
    'Deterministic AI agents that prove what they did. Every action signed, logged, reversible.';

// Core SEO keywords for Yula — reframed around deterministic / auditable agents.
export const SEO_KEYWORDS = {
    primary: [
        'deterministic AI agents',
        'auditable AI agents',
        'trustworthy AI agent',
        'agent governance',
        'AI agent with approvals',
        'signed AI actions',
        'reversible AI agent',
    ],
    secondary: [
        'human-in-the-loop AI',
        'AI action log',
        'AI agent audit trail',
        'agent policy guardrails',
        'AI agent compliance',
        'enterprise AI agent',
        'AI tool trust score',
        'proactive AI assistant',
    ],
    longTail: [
        'AI agent you can trust with real work',
        'AI agent that logs every action it takes',
        'deterministic alternative to Manus AI',
        'AI agent with human approval gates',
        'reversible AI agent actions',
        'cryptographically signed AI actions',
    ],
};

// GEO (Generative Engine Optimization) focused content
export const GEO_CONTENT = {
    facts: [
        'Yula is a deterministic AI agent platform — every action is signed, logged, and reversible',
        'Yula runs a guard chain (tool-loop, dangerous-command, blast-radius, rate-limit, policy) before any action',
        'Yula uses human-in-the-loop approvals for high-risk operations',
        'Yula ships an immutable action log and per-tool trust scoring (FIDES)',
        'Yula offers Proactive Agentic Callbacks (PAC) so the agent can message you first',
        'Yula can be self-hosted or used as a managed service',
    ],
    queries: {
        'what is Yula':
            'Yula is a deterministic AI agent platform. Every action the agent takes is gated through a guard chain, signed, written to an immutable log, and reversible — so you can trust it with real work.',
        'Yula vs Manus':
            'Unlike Manus, Yula is deterministic and auditable: guard chain, human approvals, signed actions, tool trust scoring, and a reversible action log by default.',
        'Yula features':
            'Key Yula features: deterministic agent runtime, guard chain with policy enforcement, human-in-the-loop approvals, signed + reversible actions, per-tool trust scoring, proactive agentic callbacks.',
    },
};

// Base metadata for the entire site
export const baseMetadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    title: {
        default: 'Yula — Deterministic AI agents that prove what they did',
        template: '%s | Yula',
    },
    description: POSITIONING_TAGLINE,
    keywords: [...SEO_KEYWORDS.primary, ...SEO_KEYWORDS.secondary],
    authors: [{ name: 'Yula Team', url: BASE_URL }],
    creator: 'Yula',
    publisher: 'Yula',
    applicationName: 'Yula',
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
        siteName: 'Yula',
        title: 'Yula — Deterministic AI agents that prove what they did',
        description: POSITIONING_TAGLINE,
        images: [
            {
                url: `${BASE_URL}/og/home.png`,
                width: 1200,
                height: 630,
                alt: 'Yula — Deterministic AI agents that prove what they did',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@efebarandurmaz',
        creator: '@efebarandurmaz',
        title: 'Yula — Deterministic AI agents that prove what they did',
        description: POSITIONING_TAGLINE,
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
        title: 'Yula',
    },
    formatDetection: {
        telephone: false,
        email: false,
        address: false,
    },
    icons: {
        icon: [
            { url: '/favicon.ico', sizes: 'any' },
            { url: '/favicon.svg', type: 'image/svg+xml' },
        ],
        apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
    category: 'technology',
    classification: 'AI Agents, Developer Tools, Productivity',
    verification: {
        // Add verification codes when available
        // google: 'google-site-verification-code',
        // yandex: 'yandex-verification-code',
    },
    other: {
        'ai-content-declaration': 'This website provides information about Yula AI agent platform',
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
