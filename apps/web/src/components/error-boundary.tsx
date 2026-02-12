'use client';

import { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                this.props.fallback || (
                    <div className="flex min-h-screen items-center justify-center bg-background">
                        <div className="text-center space-y-4 p-8">
                            <h2 className="text-xl font-semibold text-foreground">
                                Something went wrong
                            </h2>
                            <p className="text-muted-foreground">
                                An unexpected error occurred. Please refresh the page.
                            </p>
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                )
            );
        }

        return this.props.children;
    }
}
