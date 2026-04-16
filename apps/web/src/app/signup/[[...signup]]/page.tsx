'use client';

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-6 max-w-sm px-6">
                <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center mx-auto">
                    <span className="text-background text-lg font-bold">Y</span>
                </div>
                <div className="space-y-2">
                    <h1 className="text-xl font-semibold">Create your Yula account</h1>
                    <p className="text-sm text-muted-foreground">
                        Authentication is being configured. Check back soon.
                    </p>
                </div>
                <a
                    href="/"
                    className="inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    Back to home
                </a>
            </div>
        </div>
    );
}
