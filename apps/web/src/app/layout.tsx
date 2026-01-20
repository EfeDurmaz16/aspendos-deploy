import type { Metadata } from 'next';
import { Figtree, JetBrains_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { GlobalCommand } from '@/components/global-command';
import { SiteDock } from '@/components/layout/site-dock';

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

const instrumentSerif = Instrument_Serif({
    subsets: ['latin'],
    variable: '--font-serif',
    display: 'swap',
    weight: '400',
});

export const metadata: Metadata = {
    title: 'Aspendos | One Platform. Infinite Possibilities.',
    description: 'Unified AI workspace with persistent shared memory. Connect Claude, GPT-4, and Gemini in a single interface.',
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
                    instrumentSerif.variable,
                    'antialiased min-h-screen bg-background font-sans'
                )}
            >
                <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
                    <GlobalCommand />
                    {children}
                    <SiteDock />
                </ThemeProvider>
            </body>
        </html>
    );
}
