import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Login - Access Your AI Workspace',
    'Sign in to Yula and continue with your AI conversations across GPT-5, Claude, Gemini and more. Your memory and history are waiting.',
    '/login',
    {
        keywords: ['AI login', 'Yula login', 'AI workspace signin', 'ChatGPT alternative login'],
    }
);

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return children;
}
