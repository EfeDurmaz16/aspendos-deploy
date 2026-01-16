import { SignUp } from '@clerk/nextjs'

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <SignUp
                appearance={{
                    elements: {
                        rootBox: "mx-auto",
                        card: "shadow-lg border border-zinc-200 dark:border-zinc-800",
                        headerTitle: "font-serif",
                        formButtonPrimary: "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900",
                    }
                }}
                routing="path"
                path="/signup"
                signInUrl="/login"
                forceRedirectUrl="/onboarding"
            />
        </div>
    )
}
