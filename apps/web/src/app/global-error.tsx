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
        console.error('Global error:', error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    padding: 0,
                    fontFamily:
                        "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                    backgroundColor: '#0d0d0d',
                    color: '#ececec',
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
                        maxWidth: '480px',
                    }}
                >
                    <div
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                        }}
                    >
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1
                        style={{
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            marginBottom: '0.75rem',
                            letterSpacing: '-0.025em',
                        }}
                    >
                        Something went wrong
                    </h1>
                    <p
                        style={{
                            fontSize: '0.875rem',
                            color: '#a3a3a3',
                            marginBottom: '1.5rem',
                            lineHeight: 1.6,
                        }}
                    >
                        A critical error occurred. Please try refreshing the page.
                    </p>
                    {error.digest && (
                        <p
                            style={{
                                fontSize: '0.75rem',
                                color: '#737373',
                                marginBottom: '1.5rem',
                                fontFamily: "'Geist Mono', 'SF Mono', monospace",
                            }}
                        >
                            Error ID: {error.digest}
                        </p>
                    )}
                    <button
                        onClick={reset}
                        style={{
                            backgroundColor: '#ececec',
                            color: '#0d0d0d',
                            border: 'none',
                            padding: '0.625rem 1.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            borderRadius: '0.75rem',
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
