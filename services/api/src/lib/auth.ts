import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@aspendos/db";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false, // Set to true when you have email configured
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: true,
    },
    // Add social providers as needed
    // socialProviders: {
    //     github: {
    //         clientId: process.env.GITHUB_CLIENT_ID!,
    //         clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    //     },
    // },
    trustedOrigins: [
        "http://localhost:3000",
        "https://aspendos.net"
    ],
});
