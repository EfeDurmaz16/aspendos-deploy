import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MaiaBackground } from '@/components/ui/maia-background';

/**
 * 404 Not Found Page
 * Displays when a route doesn't exist
 */
export default function NotFound() {
    return (
        <div className="relative min-h-screen flex items-center justify-center px-4">
            <MaiaBackground />

            <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
                {/* YULA Branding */}
                <div className="space-y-2">
                    <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold font-playfair tracking-tight text-foreground">
                        YULA
                    </h1>
                    <div className="text-sm text-muted-foreground uppercase tracking-[0.2em]">
                        Your Universal Learning Assistant
                    </div>
                </div>

                {/* 404 Message */}
                <div className="space-y-4 py-8">
                    <div className="text-9xl sm:text-[12rem] font-bold font-playfair text-primary/20 dark:text-primary/10 leading-none select-none">
                        404
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
                        Page Not Found
                    </h2>
                    <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                </div>

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <Button asChild size="lg" variant="primary">
                        <Link href="/">
                            Go Home
                        </Link>
                    </Button>
                    <Button asChild size="lg" variant="secondary">
                        <Link href="/chat">
                            Start Chatting
                        </Link>
                    </Button>
                </div>

                {/* Additional Help */}
                <div className="pt-8">
                    <p className="text-sm text-muted-foreground">
                        Need help?{' '}
                        <Link
                            href="/chat"
                            className="text-primary hover:underline underline-offset-4 transition-colors"
                        >
                            Ask YULA AI
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
