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
    name: 'Yula',
    alternateName: 'Yula',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
        'Yula is a deterministic AI agent platform — every action is signed, logged, and reversible.',
    foundingDate: '2024',
    sameAs: [
        'https://twitter.com/efebarandurmaz',
        'https://github.com/EfeDurmaz16/aspendos-deploy',
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
    name: 'Yula',
    alternateName: 'Yula - Unified AI Platform',
    url: BASE_URL,
    description:
        'Deterministic AI agents that prove what they did. Every action signed, logged, reversible.',
    publisher: {
        '@type': 'Organization',
        name: 'Yula',
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
    name: 'Yula',
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
        'Deterministic guard chain before agent tool execution',
        'FIDES-signed action payloads',
        'Persistent pre-execution and post-execution audit commits',
        'Human approval gates for high-risk actions',
        'Reversibility classes for undoable, cancelable, compensatable, approval-only, and blocked actions',
        'Webhook and messaging approval surfaces',
        'Sandbox ownership checks for agent tools',
        'Fail-loud production posture for missing durable infrastructure',
    ],
};

// FAQ Schema for rich snippets
export const faqSchema: FAQPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'What is Yula?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yula is a deterministic AI agent platform for provable actions. It checks policy before execution, signs action payloads, writes persistent audit commits, and exposes verification records so operators can trust agent work.',
            },
        },
        {
            '@type': 'Question',
            name: 'How does Yula make agent actions verifiable?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yula classifies the action, verifies guardrails, signs a canonical payload through FIDES, writes a pre-execution commit, executes the tool, writes a result commit, and serves the audit trail for verification.',
            },
        },
        {
            '@type': 'Question',
            name: 'What happens when an action is risky?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Risky actions are assigned a reversibility class. High-risk or irreversible actions require explicit human approval, and dangerous actions can be blocked before any tool executes.',
            },
        },
        {
            '@type': 'Question',
            name: 'Can Yula reverse agent actions?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yula tracks whether an action is undoable, cancelable within a time window, compensatable, approval-only, or blocked. Undo and rollback behavior depends on that class and the tool-specific rollback strategy.',
            },
        },
        {
            '@type': 'Question',
            name: 'Is Yula tied to one model provider?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'No. Yula is model-agnostic. Its core value is the action control plane around model output: policy checks, signatures, approvals, execution logs, and verification.',
            },
        },
        {
            '@type': 'Question',
            name: 'How much does Yula cost?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yula offers tiers for different action volumes and control requirements, from signed logs and basic approvals to advanced policy, messaging approvals, and audit controls.',
            },
        },
        {
            '@type': 'Question',
            name: 'Which AI models does Yula support?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yula can route work across model providers, but the production contract is provider-independent: every consequential action must pass through deterministic checks, signing, commit logging, and verification.',
            },
        },
    ],
};

// Product Schema for pricing pages
export const productSchemas: Product[] = [
    {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Yula Starter',
        description:
            'Entry-level deterministic agent controls with signed logs and basic approvals',
        brand: { '@type': 'Brand', name: 'Yula' },
        offers: {
            '@type': 'Offer',
            price: '20',
            priceCurrency: 'USD',
            priceValidUntil: '2027-12-31',
            availability: 'https://schema.org/InStock',
        },
    },
    {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Yula Pro',
        description: 'Deterministic agent controls with reversibility and messaging approvals',
        brand: { '@type': 'Brand', name: 'Yula' },
        offers: {
            '@type': 'Offer',
            price: '50',
            priceCurrency: 'USD',
            priceValidUntil: '2027-12-31',
            availability: 'https://schema.org/InStock',
        },
    },
    {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Yula Ultra',
        description: 'Advanced policy and audit controls for higher-volume agent execution',
        brand: { '@type': 'Brand', name: 'Yula' },
        offers: {
            '@type': 'Offer',
            price: '100',
            priceCurrency: 'USD',
            priceValidUntil: '2027-12-31',
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
