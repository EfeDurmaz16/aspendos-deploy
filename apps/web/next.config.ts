import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

// Note: Serwist PWA is disabled in development
// Enable in production by uncommenting the withSerwist wrapper below

const nextConfig: NextConfig = {
    // Enable standalone output for Docker deployments
    output: 'standalone',

    // Strict mode for React
    reactStrictMode: true,

    // Optimize images
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '*.supabase.co' },
            { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
        ],
        formats: ['image/avif', 'image/webp'],
    },

    // Experimental features
    experimental: {
        clientTraceMetadata: ['baggage', 'sentry-trace'],
        // Tree-shake barrel imports - biggest dev compile speedup
        optimizePackageImports: [
            '@phosphor-icons/react',
            'framer-motion',
            '@radix-ui/react-icons',
            'lucide-react',
        ],
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
                        value: 'camera=(), microphone=(self), geolocation=()',
                    },
                    // CSP is now handled by middleware with per-request nonce (see middleware.ts)
                ],
            },
        ];
    },
};

const sentryWebpackPluginOptions = {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    dryRun: process.env.NODE_ENV !== 'production',
    hideSourceMaps: true,
    webpack: {
        treeshake: {
            removeDebugLogging: true,
        },
    },
};

// Skip Sentry webpack wrapping in dev - saves ~30s compile time
export default process.env.NODE_ENV === 'production'
    ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
    : nextConfig;
