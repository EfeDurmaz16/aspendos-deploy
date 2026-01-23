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
                    // Content-Security-Policy - only enabled in production
                    // Development needs more permissive settings for hot reload
                    ...(process.env.NODE_ENV === 'production'
                        ? [
                              {
                                  key: 'Content-Security-Policy',
                                  value: [
                                      "default-src 'self'",
                                      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://cdn.onesignal.com",
                                      "style-src 'self' 'unsafe-inline'",
                                      "img-src 'self' data: blob: https://img.clerk.com https://cdn.onesignal.com https://*.supabase.co https://avatars.githubusercontent.com",
                                      "font-src 'self' data:",
                                      `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'https://api.aspendos.app'} https://*.clerk.com https://onesignal.com https://api.onesignal.com wss://onesignal.com https://*.sentry.io https://*.qdrant.io wss://*.qdrant.io`,
                                      "frame-src 'self' https://*.clerk.com",
                                      "worker-src 'self' blob:",
                                      "object-src 'none'",
                                      "base-uri 'self'",
                                      "form-action 'self'",
                                      "frame-ancestors 'none'",
                                      'upgrade-insecure-requests',
                                  ].join('; '),
                              },
                          ]
                        : []),
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
