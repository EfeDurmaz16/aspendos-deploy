const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yula.dev';

// Type definitions for Schema.org
interface SchemaBase {
    '@context': 'https://schema.org';
    '@type': string;
}

interface Organization extends SchemaBase {
    '@type': 'Organization';
    name: string;
    alternateName?: string;
    url: string;
    logo: string;
    description: string;
    foundingDate?: string;
    sameAs?: string[];
    contactPoint?: {
        '@type': 'ContactPoint';
        contactType: string;
        email: string;
    };
}

interface WebSite extends SchemaBase {
    '@type': 'WebSite';
    name: string;
    alternateName?: string;
    url: string;
    description: string;
    publisher: { '@type': 'Organization'; name: string };
    potentialAction?: object;
}

interface SoftwareApplication extends SchemaBase {
    '@type': 'SoftwareApplication';
    name: string;
    applicationCategory: string;
    operatingSystem: string;
    offers: object;
    aggregateRating?: object;
    featureList: string[];
}

interface FAQPage extends SchemaBase {
    '@type': 'FAQPage';
    mainEntity: Array<{
        '@type': 'Question';
        name: string;
        acceptedAnswer: {
            '@type': 'Answer';
            text: string;
        };
    }>;
}

interface Product extends SchemaBase {
    '@type': 'Product';
    name: string;
    description: string;
    brand: { '@type': 'Brand'; name: string };
    offers: object;
}

interface BreadcrumbList extends SchemaBase {
    '@type': 'BreadcrumbList';
    itemListElement: Array<{
        '@type': 'ListItem';
        position: number;
        name: string;
        item: string;
    }>;
}

// Organization Schema
export const organizationSchema: Organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'YULA',
    alternateName: 'YULA OS',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: 'YULA is a unified AI platform providing access to multiple AI models with persistent semantic memory.',
    foundingDate: '2024',
    sameAs: [
        'https://twitter.com/yaboruAI',
        'https://github.com/yula-ai',
    ],
    contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@yula.dev',
    },
};

// WebSite Schema with SearchAction for GEO
export const websiteSchema: WebSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'YULA',
    alternateName: 'YULA - Unified AI Platform',
    url: BASE_URL,
    description: 'Access GPT-5, Claude, Gemini & 12+ AI models with persistent shared memory',
    publisher: {
        '@type': 'Organization',
        name: 'YULA',
    },
    potentialAction: {
        '@type': 'SearchAction',
        target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/chat?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
    },
};

// SoftwareApplication Schema
export const softwareAppSchema: SoftwareApplication = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'YULA',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
        '@type': 'AggregateOffer',
        lowPrice: '20',
        highPrice: '100',
        priceCurrency: 'USD',
        offerCount: 3,
    },
    aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '150',
        bestRating: '5',
        worstRating: '1',
    },
    featureList: [
        'Access to 12+ AI models including GPT-5, Claude, and Gemini',
        'Persistent semantic memory across all conversations',
        'Import ChatGPT and Claude conversation history',
        'Proactive AI Callbacks (PAC) for automated reminders',
        'Council Mode for parallel multi-model queries',
        'Offline AI with WebGPU local inference',
        'Voice input and output with 6 voice options',
        'Privacy-first architecture with data encryption',
    ],
};

// FAQ Schema for rich snippets
export const faqSchema: FAQPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'What is YULA?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'YULA (Your Universal Learning Assistant) is a unified AI platform that provides access to multiple AI models like GPT-5, Claude, and Gemini with persistent semantic memory across all conversations. Unlike single-provider AI apps, YULA lets you use the best AI for each task while maintaining context.',
            },
        },
        {
            '@type': 'Question',
            name: 'Can I import my ChatGPT conversations to YULA?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: "Yes! YULA supports importing conversation history from ChatGPT and Claude. Your imported conversations become part of YULA's semantic memory, allowing all AI models to reference your past discussions.",
            },
        },
        {
            '@type': 'Question',
            name: 'What is Council Mode in YULA?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Council Mode allows you to send the same question to multiple AI models simultaneously (up to 4 with Ultra plan). You can compare responses from GPT-5, Claude, Gemini, and other models side-by-side to get the best answer.',
            },
        },
        {
            '@type': 'Question',
            name: 'What is Proactive AI Callback (PAC)?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: "Proactive Agentic Callback (PAC) is YULA's unique feature where the AI can initiate contact with you. If you ask YULA to remind you about something in a week, it will proactively send you a notification - no other AI platform offers this.",
            },
        },
        {
            '@type': 'Question',
            name: 'Does YULA work offline?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes! YULA supports offline AI through WebGPU-powered local models. You can download models like Llama 3.2 to your browser and chat without internet connection.',
            },
        },
        {
            '@type': 'Question',
            name: 'How much does YULA cost?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'YULA offers three tiers: Starter at $20/month (300 chats, basic features), Pro at $50/month (1,500 chats, all models, multi-model comparison), and Ultra at $100/month (5,000+ chats, parallel queries, priority support).',
            },
        },
        {
            '@type': 'Question',
            name: 'Which AI models does YULA support?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'YULA supports 12+ AI models including: GPT-5.2, GPT-5 Nano, GPT-4o from OpenAI; Claude 4.5 Opus, Claude 4.5 Sonnet from Anthropic; Gemini 3 Pro from Google; Llama 4, Grok 4.1, DeepSeek V3.2, Mistral, Qwen 3, and more.',
            },
        },
    ],
};

// Product Schema for pricing pages
export const productSchemas: Product[] = [
    {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'YULA Starter',
        description: 'Entry-level AI access with basic memory and 300 chats per month',
        brand: { '@type': 'Brand', name: 'YULA' },
        offers: {
            '@type': 'Offer',
            price: '20',
            priceCurrency: 'USD',
            priceValidUntil: '2025-12-31',
            availability: 'https://schema.org/InStock',
        },
    },
    {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'YULA Pro',
        description: 'Full AI access with all models, advanced memory, and 1,500 chats per month',
        brand: { '@type': 'Brand', name: 'YULA' },
        offers: {
            '@type': 'Offer',
            price: '50',
            priceCurrency: 'USD',
            priceValidUntil: '2025-12-31',
            availability: 'https://schema.org/InStock',
        },
    },
    {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'YULA Ultra',
        description: 'Power user tier with 5,000+ chats, parallel queries, and priority support',
        brand: { '@type': 'Brand', name: 'YULA' },
        offers: {
            '@type': 'Offer',
            price: '100',
            priceCurrency: 'USD',
            priceValidUntil: '2025-12-31',
            availability: 'https://schema.org/InStock',
        },
    },
];

// Breadcrumb generator
export function generateBreadcrumbSchema(items: { name: string; url: string }[]): BreadcrumbList {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

// Helper to serialize schema to JSON string (safe - only static data)
export function serializeSchema(schema: SchemaBase | SchemaBase[]): string {
    return JSON.stringify(schema);
}
