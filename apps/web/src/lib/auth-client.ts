'use client';

export function useSession() {
    return { data: null, isPending: false, error: null };
}

export async function signOut(): Promise<void> {
    window.location.href = '/api/auth/logout';
}

export const signIn = {
    email: async () => {
        window.location.href = '/login';
    },
    social: async ({ provider }: { provider: string }) => {
        window.location.href = '/login';
    },
    passkey: async () => {
        window.location.href = '/login';
    },
};

export const signUp = {
    email: async () => {
        window.location.href = '/signup';
    },
};

export async function checkout(_opts: any): Promise<void> {
    window.location.href = '/pricing';
}

export async function forgetPassword(): Promise<void> {
    window.location.href = '/forgot-password';
}

export async function resetPassword(_opts: any): Promise<void> {
    window.location.href = '/login';
}

export const passkey = {
    addPasskey: async () => {},
    deletePasskey: async () => {},
};

export async function sendVerificationEmail(_opts?: any): Promise<void> {}
export async function verifyEmail(_opts?: any): Promise<void> {}
