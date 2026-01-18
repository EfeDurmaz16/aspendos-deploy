import { prisma } from '@aspendos/db';
import { polar, checkout, portal } from '@polar-sh/better-auth';
import { Polar } from '@polar-sh/sdk';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

// Initialize Polar client
const polarClient = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
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
