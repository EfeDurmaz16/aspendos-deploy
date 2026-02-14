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
                    // Content-Security-Policy - only enabled in production
                    // Development needs more permissive settings for hot reload
                    ...(process.env.NODE_ENV === 'production'
                        ? [
                              {
                                  key: 'Content-Security-Policy',
                                  value: [
                                      "default-src 'self'",
                                      // unsafe-inline required by Next.js for inline scripts/styles
                                      // TODO: migrate to nonce-based CSP via Next.js middleware when stable
                                      "script-src 'self' 'unsafe-inline' https://cdn.onesignal.com",
                                      "style-src 'self' 'unsafe-inline'",
                                      "img-src 'self' data: blob: https://cdn.onesignal.com https://*.supabase.co https://avatars.githubusercontent.com",
                                      "font-src 'self' data:",
                                      `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'https://api.aspendos.app'} https://yula.dev https://www.yula.dev https://onesignal.com https://api.onesignal.com wss://onesignal.com https://*.sentry.io https://*.qdrant.io wss://*.qdrant.io`,
                                      "frame-src 'self'",
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

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
