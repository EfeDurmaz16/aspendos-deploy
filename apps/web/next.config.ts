import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
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
                            "img-src 'self' data: https://img.clerk.com https://cdn.onesignal.com",
                            // Fonts: self + data URIs
                            "font-src 'self' data:",
                            // Connect: API server + Clerk + OneSignal + Sentry
                            `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'} https://clerk.*.com https://onesignal.com https://api.onesignal.com wss://onesignal.com https://sentry.io`,
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
                            ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
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

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
