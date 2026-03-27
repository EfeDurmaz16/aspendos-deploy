import { prisma } from './prisma';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { Resend } from 'resend';

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: process.env.DISABLE_EMAIL_VERIFICATION !== 'true',
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: true,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url }) => {
            const apiKey = process.env.RESEND_API_KEY;
            if (!apiKey) {
                console.error('[Auth] RESEND_API_KEY not set, cannot send password reset email');
                return;
            }
            const resend = new Resend(apiKey);
            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'YULA <noreply@yula.dev>',
                to: user.email,
                subject: 'Reset your YULA password',
                html: `<p>Click the link below to reset your password:</p><p><a href="${url}">Reset Password</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
            });
        },
    },
    account: {
        accountLinking: {
            enabled: false,
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            httpOnly: true,
        },
    },
    rateLimit: {
        window: 60,
        max: 10,
    },
    trustedOrigins: [
        'http://localhost:3000',
        'https://yula.dev',
        'https://www.yula.dev',
    ],
    // TODO: Add Stripe billing plugin
    plugins: [],
});
