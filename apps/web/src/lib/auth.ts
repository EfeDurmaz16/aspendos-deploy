import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { passkey } from "@better-auth/passkey";
import { prisma } from "@aspendos/db";
import { headers } from "next/headers";

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
    ],
    /** if no database is provided, the user data will be stored in memory.
     * Make sure to provide a database to persist user data **/
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
