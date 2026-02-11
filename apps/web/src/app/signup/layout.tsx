import type { Metadata } from 'next';
import Script from 'next/script';
import { generatePageMetadata } from '@/lib/seo/metadata';
import { generateBreadcrumbSchema, serializeSchema } from '@/lib/seo/structured-data';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yula.dev';

export const metadata: Metadata = generatePageMetadata(
    'Sign Up - Get Started with All AI Models',
    'Create your YULA account and access GPT-5, Claude, Gemini, and 12+ AI models with persistent memory. Free tier available, no credit card required.',
    '/signup',
    {
        keywords: [
            'AI signup',
            'create AI account',
            'YULA registration',
            'free AI trial',
            'ChatGPT alternative signup',
            'multi-model AI access',
        ],
    }
);

const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: BASE_URL },
    { name: 'Sign Up', url: `${BASE_URL}/signup` },
]);

export default function SignupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Script
                id="signup-breadcrumb-schema"
                type="application/ld+json"
                strategy="afterInteractive"
            >
                {serializeSchema(breadcrumbSchema)}
            </Script>
            {children}
        </>
    );
}
