import type { Metadata } from 'next';
import Script from 'next/script';
import { generatePageMetadata } from '@/lib/seo/metadata';
import { productSchemas, serializeSchema, generateBreadcrumbSchema } from '@/lib/seo/structured-data';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yula.dev';

export const metadata: Metadata = generatePageMetadata(
    'Pricing - All AI Models in One Subscription',
    'Access GPT-5, Claude, Gemini, and 12+ AI models with one subscription. Plans from $20/month. Import ChatGPT history, proactive reminders, and multi-model comparison included.',
    '/pricing',
    {
        keywords: [
            'AI subscription pricing',
            'ChatGPT alternative price',
            'Claude pricing',
            'Gemini pricing',
            'AI platform cost',
            'multi-model AI subscription',
            'AI chat pricing',
            'YULA pricing',
            'unified AI cost',
            'best AI subscription value',
        ],
    }
);

const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: BASE_URL },
    { name: 'Pricing', url: `${BASE_URL}/pricing` },
]);

export default function PricingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* Product structured data for rich snippets */}
            <Script
                id="pricing-products-schema"
                type="application/ld+json"
                strategy="afterInteractive"
            >
                {serializeSchema(productSchemas as any)}
            </Script>
            <Script
                id="pricing-breadcrumb-schema"
                type="application/ld+json"
                strategy="afterInteractive"
            >
                {serializeSchema(breadcrumbSchema as any)}
            </Script>
            {children}
        </>
    );
}
