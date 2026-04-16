import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { headers } from 'next/headers';
import Script from 'next/script';
import './globals.css';

const manrope = Manrope({
    subsets: ['latin'],
    variable: '--font-manrope',
    display: 'swap',
});
import { SkipLink } from '@/components/accessibility/skip-link';
import { ErrorBoundary } from '@/components/error-boundary';
import { InstallPrompt, OfflineBanner, UpdatePrompt } from '@/components/pwa';
import { ThemeProvider } from '@/components/theme-provider';
import { CookieConsent } from '@/components/ui/cookie-consent';
import { baseMetadata } from '@/lib/seo/metadata';
import {
    faqSchema,
    organizationSchema,
    serializeSchema,
    softwareAppSchema,
    websiteSchema,
} from '@/lib/seo/structured-data';
import { ConvexClientProvider } from '@/components/convex-client-provider';
import { cn } from '@/lib/utils';

function AuthProvider({ children }: { children: React.ReactNode }) {
    // Clerk requires NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY — skip wrapper if not set
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
        return <>{children}</>;
    }
    // Dynamic require to avoid build error when key is missing
    const { ClerkProvider } = require('@clerk/nextjs');
    return <ClerkProvider>{children}</ClerkProvider>;
}

// Comprehensive metadata for SEO and GEO
export const metadata: Metadata = {
    ...baseMetadata,
};

// Viewport configuration - Clean neutral theme colors
export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
        { media: '(prefers-color-scheme: dark)', color: '#0d0d0d' },
    ],
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    colorScheme: 'dark light',
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const headersList = await headers();
    const nonce = headersList.get('x-nonce') || undefined;

    return (
        <html lang="en" suppressHydrationWarning className={manrope.variable}>
            <head>
                {/* PWA Meta Tags */}
                <meta name="application-name" content="Yula" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="Yula" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />

                {/* DNS prefetch for external services */}
                <link rel="dns-prefetch" href="https://api.openai.com" />
                <link rel="dns-prefetch" href="https://api.anthropic.com" />

                {/* JSON-LD Structured Data for SEO and GEO */}
                <Script
                    id="organization-schema"
                    type="application/ld+json"
                    strategy="afterInteractive"
                    nonce={nonce}
                >
                    {serializeSchema(organizationSchema)}
                </Script>
                <Script
                    id="website-schema"
                    type="application/ld+json"
                    strategy="afterInteractive"
                    nonce={nonce}
                >
                    {serializeSchema(websiteSchema)}
                </Script>
                <Script
                    id="software-app-schema"
                    type="application/ld+json"
                    strategy="afterInteractive"
                    nonce={nonce}
                >
                    {serializeSchema(softwareAppSchema)}
                </Script>
                <Script
                    id="faq-schema"
                    type="application/ld+json"
                    strategy="afterInteractive"
                    nonce={nonce}
                >
                    {serializeSchema(faqSchema)}
                </Script>
            </head>
            <body className={cn('antialiased min-h-screen bg-background')}>
                <SkipLink />

                <AuthProvider>
                    <ConvexClientProvider>
                        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
                            <OfflineBanner />
                            <ErrorBoundary>
                                <main id="main-content" tabIndex={-1}>
                                    {children}
                                </main>
                            </ErrorBoundary>
                            <InstallPrompt />
                            <UpdatePrompt />
                            <CookieConsent />
                        </ThemeProvider>
                    </ConvexClientProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
