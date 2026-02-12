import { prisma } from '@aspendos/db';
import { passkey } from '@better-auth/passkey';
import { polar } from '@polar-sh/better-auth';
import { Polar } from '@polar-sh/sdk';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { headers } from 'next/headers';

async function sendPasswordResetEmail(args: { to: string; resetUrl: string }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;

    if (!apiKey || !from) return;

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: args.to,
            subject: 'Reset your YULA password',
            html: `<p>Reset your password by clicking the link below:</p><p><a href="${args.resetUrl}">Reset password</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
        }),
    });

    if (!response.ok) {
        console.error('Failed to send password reset email:', await response.text());
    }
}

// Initialize Polar client for payments
const polarClient = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
});

export const authInstance = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: process.env.NODE_ENV === 'production',
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: true,
        revokeSessionsOnPasswordReset: true,
        async sendResetPassword(data, _request) {
            const resetUrl = (data as { url?: unknown }).url;
            const email = (data as { user?: { email?: unknown } }).user?.email;
            if (typeof resetUrl !== 'string' || typeof email !== 'string') return;
            await sendPasswordResetEmail({ to: email, resetUrl });
        },
    },
    account: {
        accountLinking: {
            enabled: false,
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // Update session token daily
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            httpOnly: true,
        },
    },
    rateLimit: {
        window: 60, // 1 minute window
        max: 10, // max 10 auth attempts per minute
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
        facebook: {
            clientId: process.env.FACEBOOK_CLIENT_ID!,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
        },
        apple: {
            clientId: process.env.APPLE_CLIENT_ID!,
            clientSecret: process.env.APPLE_CLIENT_SECRET!,
        },
    },
    plugins: [
        passkey(),
        nextCookies(),
        // Polar plugin for payments
        polar({
            client: polarClient,
            createCustomerOnSignUp: true,
            enableCustomerPortal: true,
            checkout: {
                enabled: true,
                products: [
                    {
                        productId: process.env.POLAR_PRO_PRODUCT_ID!,
                        slug: 'pro',
                    },
                    {
                        productId: process.env.POLAR_ULTRA_PRODUCT_ID!,
                        slug: 'ultra',
                    },
                ],
                successUrl: '/chat?upgraded=true',
                cancelUrl: '/pricing',
            },
            webhooks: {
                secret: process.env.POLAR_WEBHOOK_SECRET!,
            },
        }),
    ],
});

/**
 * Get the current session from server components/API routes
 * This is the primary way to get the authenticated user
 *
 * Returns { userId, user, session } for backward compatibility
 */
export async function auth() {
    const headersList = await headers();
    const result = await authInstance.api.getSession({
        headers: headersList,
    });

    if (!result) {
        return null;
    }

    // Return with userId at top level for backward compatibility
    return {
        userId: result.user?.id,
        user: result.user,
        session: result.session,
    };
}

/**
 * Export type for session
 */
export type Session = Awaited<ReturnType<typeof auth>>;
