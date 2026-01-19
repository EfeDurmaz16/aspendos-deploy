import type { Metadata } from 'next';
import { Figtree, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { GlobalCommand } from '@/components/global-command';

const figtree = Figtree({
    subsets: ['latin'],
    variable: '--font-figtree',
    display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Aspendos | The AI Operating System',
    description: 'Memory-first AI OS tailored for builders and researchers.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={cn(
                    figtree.variable,
                    jetbrainsMono.variable,
                    'antialiased min-h-screen bg-background font-sans'
                )}
            >
                <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
                    <GlobalCommand />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
