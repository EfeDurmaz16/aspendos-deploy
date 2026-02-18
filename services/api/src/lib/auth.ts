import { prisma } from '@aspendos/db';
import { checkout, polar, portal } from '@polar-sh/better-auth';
import { Polar } from '@polar-sh/sdk';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

// Initialize Polar client
const accessToken = process.env.POLAR_ACCESS_TOKEN || '';
const isSandbox = accessToken.startsWith('polar_sat_');

const polarClient = new Polar({
    accessToken,
    server: isSandbox ? 'sandbox' : 'production',
});

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: process.env.NODE_ENV === 'production',
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: true,
        // Revoke all other sessions when password changes (security best practice)
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url }) => {
            // TODO: Integrate email provider (Resend/SendGrid)
            console.log(`[Auth] Password reset requested for ${user.id}, url: ${url}`);
        },
    },
    account: {
        accountLinking: {
            enabled: false, // Disable by default for security
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days (reduced from 30 for security)
        updateAge: 60 * 60 * 24, // Update every day
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            httpOnly: true,
        },
    },
    rateLimit: {
        window: 60, // 1 minute window
        max: 10, // max 10 auth attempts per minute
    },
    trustedOrigins: [
        'http://localhost:3000',
        'https://yula.dev',
        'https://www.yula.dev',
    ],
    plugins: [
        polar({
            client: polarClient,
            // Automatically create a Polar customer when user signs up
            createCustomerOnSignUp: true,
            use: [
                // Checkout integration for purchasing subscriptions
                checkout({
                    products: [
                        {
                            productId: process.env.NEXT_PUBLIC_POLAR_STARTER_PRODUCT_ID!,
                            slug: 'starter',
                        },
                        {
                            productId: process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID!,
                            slug: 'pro',
                        },
                        {
                            productId: process.env.NEXT_PUBLIC_POLAR_ULTRA_PRODUCT_ID!,
                            slug: 'ultra',
                        },
                    ],
                    successUrl: '/billing?success=true&checkout_id={CHECKOUT_ID}',
                    authenticatedUsersOnly: true,
                }),
                // Customer portal for managing subscriptions
                portal(),
            ],
        }),
    ],
});
