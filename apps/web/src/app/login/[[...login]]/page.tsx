// Temporary placeholder - Clerk disabled for Next.js 16 Turbopack compatibility
// TODO: Re-enable when @clerk/nextjs supports Next.js 16 Turbopack

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-8 max-w-md w-full mx-4">
                <h1 className="font-serif text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                    Login
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                    Authentication is temporarily disabled for development.
                </p>
                <div className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                    />
                    <a
                        href="/chat"
                        className="block w-full text-center px-4 py-3 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium hover:opacity-90 transition"
                    >
                        Continue to Chat →
                    </a>
                </div>
                <p className="text-xs text-zinc-500 mt-4 text-center">
                    Clerk auth will be re-enabled when Next.js 16 compatible
                </p>
            </div>
        </div>
    )
}
