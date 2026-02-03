import type { Metadata, Viewport } from 'next';
import { Playfair_Display, DM_Sans, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
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

const playfairDisplay = Playfair_Display({
    subsets: ['latin'],
    variable: '--font-playfair',
    display: 'swap',
    weight: ['400', '500', '600', '700'],
});

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-dm-sans',
    display: 'swap',
    weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
});

// Comprehensive metadata for SEO and GEO
export const metadata: Metadata = {
    ...baseMetadata,
};

// Viewport configuration - YULA warm theme colors
export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#F5F0E8' },
        { media: '(prefers-color-scheme: dark)', color: '#2D2926' },
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

                {/* Preconnect to critical origins for performance */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

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
                    playfairDisplay.variable,
                    dmSans.variable,
                    jetbrainsMono.variable,
                    'antialiased min-h-screen bg-background'
                )}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
                {/* Accessibility: Skip to main content link */}
                <SkipLink />

                <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
                    <OfflineBanner />
                    <main id="main-content" tabIndex={-1}>
                        {children}
                    </main>
                    <SiteDock />
                    <InstallPrompt />
                    <UpdatePrompt />
                </ThemeProvider>
            </body>
        </html>
    );
}
