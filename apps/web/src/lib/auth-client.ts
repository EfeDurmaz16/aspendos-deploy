import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [passkeyClient()],
});

export const {
    signIn,
    signOut,
    signUp,
    useSession,
    passkey, // For passkey registration: passkey.addPasskey(), passkey.listUserPasskeys(), etc.
} = authClient;

export const checkout = async ({ slug }: { slug: string }) => {
    window.location.href = `/checkout?productId=${slug}`;
};
