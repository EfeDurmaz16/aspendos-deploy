import { prisma } from '@aspendos/db';
import { checkout, polar, portal } from '@polar-sh/better-auth';
import { Polar } from '@polar-sh/sdk';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

// Initialize Polar client
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
        requireEmailVerification: false, // Set to true when you have email configured
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: true,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24, // Update every day
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        },
    },
    trustedOrigins: ['http://localhost:3000', 'https://aspendos.net'],
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
