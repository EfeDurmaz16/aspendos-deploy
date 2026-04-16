import { SignUp } from '@clerk/nextjs';

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <SignUp afterSignUpUrl="/chat" />
        </div>
    );
}
