'use client';

/**
 * Offline Fallback Page
 *
 * Shown when the user is offline and the requested page isn't cached.
 */

export default function OfflinePage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="text-center space-y-6">
                <div className="text-6xl">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mx-auto text-muted-foreground"
                    >
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-foreground">You're Offline</h1>

                <p className="text-muted-foreground max-w-md mx-auto">
                    It looks like you've lost your internet connection. Some features may be limited until
                    you're back online.
                </p>

                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">What you can do offline:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                        <li>View recently opened chats (if cached)</li>
                        <li>Review saved memories</li>
                        <li>Draft messages (will sync when online)</li>
                    </ul>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}
