import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { passkey } from "@better-auth/passkey";
import { polar } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { prisma } from "@aspendos/db";
import { headers } from "next/headers";

// Initialize Polar client for payments
const polarClient = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});

export const authInstance = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        async sendResetPassword(data, request) {
            // Send an email to the user with a link to reset their password
            // data contains user object and token url
            console.log("Reset password for", data.user.email);
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!
        },
        facebook: {
            clientId: process.env.FACEBOOK_CLIENT_ID!,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET!
        },
        apple: {
            clientId: process.env.APPLE_CLIENT_ID!,
            clientSecret: process.env.APPLE_CLIENT_SECRET!
        }
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
                        slug: "pro",
                    },
                    {
                        productId: process.env.POLAR_ULTRA_PRODUCT_ID!,
                        slug: "ultra",
                    },
                ],
                successUrl: "/chat?upgraded=true",
                cancelUrl: "/pricing",
            },
            webhooks: {
                secret: process.env.POLAR_WEBHOOK_SECRET!,
            },
        }),
    ],
    // Sync users to Convex after auth events
    hooks: {
        after: [
            {
                matcher: (context) => context.path.startsWith("/sign-up") || context.path.startsWith("/sign-in"),
                handler: async (ctx) => {
                    // Sync user to Convex after signup/signin
                    if (ctx.context?.user) {
                        try {
                            await fetch(`${process.env.CONVEX_HTTP_URL}/webhooks/auth`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    event: "user.created",
                                    user: ctx.context.user,
                                }),
                            });
                        } catch (error) {
                            console.error("Failed to sync user to Convex:", error);
                        }
                    }
                    return ctx;
                },
            },
        ],
    },
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
