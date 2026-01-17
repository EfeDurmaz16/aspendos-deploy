import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <SignIn
                path="/login"
                routing="path"
                signUpUrl="/signup"
                fallbackRedirectUrl="/chat"
                appearance={{
                    elements: {
                        rootBox: "mx-auto",
                        card: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg rounded-xl",
                        headerTitle: "font-serif text-zinc-900 dark:text-zinc-50",
                        headerSubtitle: "text-zinc-600 dark:text-zinc-400",
                        formButtonPrimary: "bg-zinc-900 dark:bg-zinc-50 hover:opacity-90",
                        footerActionLink: "text-zinc-900 dark:text-zinc-50 hover:text-zinc-700 dark:hover:text-zinc-300",
                    }
                }}
            />
        </div>
    )
}
