import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { cn } from '@/lib/utils';
import { SiteDock } from '@/components/layout/site-dock';
import { InstallPrompt, OfflineBanner, UpdatePrompt } from '@/components/pwa';
import { SkipLink } from '@/components/accessibility/skip-link';
import { baseMetadata } from '@/lib/seo/metadata';
import {
    organizationSchema,
    websiteSchema,
    softwareAppSchema,
    faqSchema,
    serializeSchema,
} from '@/lib/seo/structured-data';

// Comprehensive metadata for SEO and GEO
export const metadata: Metadata = {
    ...baseMetadata,
};

// Viewport configuration - YULA v3 theme colors (from Pencil)
export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#F8F6F0' },
        { media: '(prefers-color-scheme: dark)', color: '#0A0E27' },
    ],
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    colorScheme: 'dark light',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* PWA Meta Tags */}
                <meta name="application-name" content="YULA" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="YULA" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />

                {/* DNS prefetch for API and external services */}
                <link rel="dns-prefetch" href="https://api.yula.dev" />
                <link rel="dns-prefetch" href="https://api.openai.com" />
                <link rel="dns-prefetch" href="https://api.anthropic.com" />

                {/* JSON-LD Structured Data for SEO and GEO */}
                <Script
                    id="organization-schema"
                    type="application/ld+json"
                    strategy="afterInteractive"
                >
                    {serializeSchema(organizationSchema)}
                </Script>
                <Script
                    id="website-schema"
                    type="application/ld+json"
                    strategy="afterInteractive"
                >
                    {serializeSchema(websiteSchema)}
                </Script>
                <Script
                    id="software-app-schema"
                    type="application/ld+json"
                    strategy="afterInteractive"
                >
                    {serializeSchema(softwareAppSchema)}
                </Script>
                <Script
                    id="faq-schema"
                    type="application/ld+json"
                    strategy="afterInteractive"
                >
                    {serializeSchema(faqSchema)}
                </Script>
            </head>
            <body
                className={cn(
                    'antialiased min-h-screen bg-background'
                )}
            >
                {/* Accessibility: Skip to main content link */}
                <SkipLink />

                <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
                    <OfflineBanner />
                    <ErrorBoundary>
                        <main id="main-content" tabIndex={-1}>
                            {children}
                        </main>
                    </ErrorBoundary>
                    <SiteDock />
                    <InstallPrompt />
                    <UpdatePrompt />
                </ThemeProvider>
            </body>
        </html>
    );
}
