import type { Metadata } from 'next'
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
// TODO: Re-enable when @clerk/nextjs supports Next.js 16 Turbopack
// import { ClerkProvider } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Aspendos | The AI Operating System',
  description: 'Memory-first AI OS tailored for builders and researchers.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // TODO: Re-enable ClerkProvider when compatible with Next.js 16 Turbopack
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          inter.variable,
          instrumentSerif.variable,
          jetbrainsMono.variable,
          "antialiased min-h-screen bg-background font-mono"
        )}
      >
        <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
