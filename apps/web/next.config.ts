import withSerwistInit from '@serwist/next';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

// Serwist PWA configuration
const withSerwist = withSerwistInit({
    swSrc: 'src/app/sw.ts',
    swDest: 'public/sw.js',
    cacheOnNavigation: true,
    reloadOnOnline: true,
    disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
    // Enable standalone output for Docker deployments
    output: 'standalone',

    // Strict mode for React
    reactStrictMode: true,

    // Optimize images
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'img.clerk.com' },
            { protocol: 'https', hostname: '*.supabase.co' },
            { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
        ],
        formats: ['image/avif', 'image/webp'],
    },

    // Experimental features
    experimental: {
        // Instrument server code for performance monitoring
        clientTraceMetadata: ['baggage', 'sentry-trace'],
    },

    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    // Security headers
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            // Default: only same origin
                            "default-src 'self'",
                            // Scripts: self + inline (for Next.js) + Clerk + OneSignal
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.*.com https://cdn.onesignal.com",
                            // Styles: self + inline (for Tailwind and styled-components)
                            "style-src 'self' 'unsafe-inline'",
                            // Images: self + Clerk CDN + data URIs (for inline images)
                            "img-src 'self' data: blob: https://img.clerk.com https://cdn.onesignal.com https://*.supabase.co https://avatars.githubusercontent.com",
                            // Fonts: self + data URIs
                            "font-src 'self' data:",
                            // Connect: API server + Clerk + OneSignal + Sentry + Qdrant
                            `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'} https://clerk.*.com https://onesignal.com https://api.onesignal.com wss://onesignal.com https://*.sentry.io https://*.qdrant.io wss://*.qdrant.io`,
                            // Frame: allow embedding from Clerk
                            "frame-src 'self' https://clerk.*.com",
                            // Workers: self + blob (for service workers)
                            "worker-src 'self' blob:",
                            // Object/embed: none
                            "object-src 'none'",
                            // Base URI: self only
                            "base-uri 'self'",
                            // Form actions: self only
                            "form-action 'self'",
                            // Frame ancestors: none (prevent clickjacking)
                            "frame-ancestors 'none'",
                            // Upgrade insecure requests in production
                            ...(process.env.NODE_ENV === 'production'
                                ? ['upgrade-insecure-requests']
                                : []),
                        ]
                            .filter(Boolean)
                            .join('; '),
                    },
                ],
            },
        ];
    },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // Upload source maps in production only
    dryRun: process.env.NODE_ENV !== 'production',

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
};

export default withSentryConfig(withSerwist(nextConfig), sentryWebpackPluginOptions);
