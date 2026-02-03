'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to console for debugging
        console.error('Global error:', error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    padding: 0,
                    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    backgroundColor: '#09090b',
                    color: '#fafafa',
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div
                    style={{
                        textAlign: 'center',
                        padding: '2rem',
                        maxWidth: '600px',
                    }}
                >
                    <div
                        style={{
                            fontSize: '4rem',
                            marginBottom: '1rem',
                            opacity: 0.5,
                        }}
                    >
                        ⚠️
                    </div>
                    <h1
                        style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            marginBottom: '1rem',
                            letterSpacing: '-0.025em',
                        }}
                    >
                        Something went wrong
                    </h1>
                    <p
                        style={{
                            fontSize: '1rem',
                            color: '#a1a1aa',
                            marginBottom: '2rem',
                            lineHeight: 1.6,
                        }}
                    >
                        A critical error occurred that prevented the application from loading. Please try
                        refreshing the page.
                    </p>
                    {error.digest && (
                        <p
                            style={{
                                fontSize: '0.875rem',
                                color: '#71717a',
                                marginBottom: '2rem',
                                fontFamily: "'JetBrains Mono', monospace",
                            }}
                        >
                            Error ID: {error.digest}
                        </p>
                    )}
                    <button
                        onClick={reset}
                        style={{
                            backgroundColor: '#fafafa',
                            color: '#09090b',
                            border: 'none',
                            padding: '0.75rem 2rem',
                            fontSize: '1rem',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                        }}
                        type="button"
                    >
                        Try Again
                    </button>
                </div>
            </body>
        </html>
    );
}
