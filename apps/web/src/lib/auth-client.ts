import { passkeyClient } from '@better-auth/passkey/client';
import { polarClient } from '@polar-sh/better-auth/client';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [passkeyClient(), polarClient()],
});

export const {
    signIn,
    signOut,
    signUp,
    useSession,
    passkey, // For passkey registration: passkey.addPasskey(), passkey.listUserPasskeys(), etc.
    requestPasswordReset,
    resetPassword,
    sendVerificationEmail,
} = authClient;

export const forgetPassword = requestPasswordReset;

// Polar checkout - navigate to checkout page with product slug
export const checkout = async ({ slug }: { slug: string }) => {
    // Use Better Auth's Polar plugin checkout
    const response = await authClient.checkout({
        products: [slug],
    });

    if ('data' in response && response.data?.url) {
        window.location.href = response.data.url;
    }
};

// Polar customer portal - manage subscriptions
export const openCustomerPortal = async () => {
    window.location.href = '/portal';
};
