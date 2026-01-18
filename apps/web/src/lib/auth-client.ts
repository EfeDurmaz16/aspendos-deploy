import { createAuthClient } from "better-auth/react";

/**
 * Better Auth Client for Aspendos
 * Connects to the Better Auth API running on the backend.
 */
export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
export type Session = typeof authClient.$Infer.Session;
export type User = Session["user"];
