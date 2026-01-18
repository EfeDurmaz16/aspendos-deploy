import type { Metadata } from 'next';
import { Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const instrumentSerif = Instrument_Serif({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-instrument-serif',
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
                    inter.variable,
                    instrumentSerif.variable,
                    jetbrainsMono.variable,
                    'antialiased min-h-screen bg-background font-mono'
                )}
            >
                <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
