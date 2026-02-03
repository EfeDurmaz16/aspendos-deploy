import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import { polarClient } from "@polar-sh/better-auth/client";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [
        passkeyClient(),
        polarClient(),
    ],
});

export const {
    signIn,
    signOut,
    signUp,
    useSession,
    passkey, // For passkey registration: passkey.addPasskey(), passkey.listUserPasskeys(), etc.
    forgetPassword,
    resetPassword,
    sendVerificationEmail,
} = authClient;

// Polar checkout - navigate to checkout page with product slug
export const checkout = async ({ slug }: { slug: string }) => {
    // Use Better Auth's Polar plugin checkout
    const response = await authClient.checkout({
        products: [slug],
    });

    if (response?.url) {
        window.location.href = response.url;
    }
};

// Polar customer portal - manage subscriptions
export const openCustomerPortal = async () => {
    const response = await authClient.customerPortal();

    if (response?.url) {
        window.location.href = response.url;
    }
};
