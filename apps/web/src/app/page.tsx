'use client';

import {
  ArrowRight,
  Brain,
  CheckCircle,
  Cpu,
  Database,
  GithubLogo,
  Lightning,
  Microphone,
  Sparkle,
  XLogo,
  TerminalWindow,
  Globe,
  Shapes,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-background text-foreground selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Navigation - Floating & Blurry */}
      <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-6">
        <div className="w-full max-w-5xl rounded-full border border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-sm px-6 py-3 flex items-center justify-between transition-all duration-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg tracking-tight">ASPENDOS</span>
          </div>
          <nav className="hidden md:flex gap-8 items-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
            <Link
              href="#features"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Method
            </Link>
            <Link
              href="#pricing"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Log in
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <Button
              size="sm"
              className="rounded-full px-5 h-9 font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm"
              asChild
            >
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-32">
        {/* Hero Section - Bold & Centered */}
        <section className="relative px-6 lg:px-8 pb-32 pt-20 overflow-hidden">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-zinc-100 to-transparent dark:from-zinc-900/50 rounded-[100%] blur-3xl -z-10 opacity-60" />

          <div className="container max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-8 animate-fade-up">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Aspendos OS v1.2 is live
            </div>

            <h1 className="text-6xl md:text-[5.5rem] leading-[0.95] font-semibold tracking-tighter text-zinc-900 dark:text-white mb-8 animate-fade-up animation-delay-100">
              The operating system <br />
              <span className="text-zinc-400 dark:text-zinc-600">
                for your second brain.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up animation-delay-200">
              Stop losing context. Aspendos unifies Claude, GPT-4, and Gemini into a
              single workspace with persistent memory that spans every conversation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up animation-delay-300">
              <Button
                size="lg"
                className="rounded-full px-8 h-14 text-base bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                asChild
              >
                <Link href="/signup">
                  Start using Aspendos
                  <ArrowRight className="ml-2 w-4 h-4" weight="bold" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-14 text-base border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                asChild
              >
                <Link href="#demo">Watch the film</Link>
              </Button>
            </div>
          </div>

          {/* Hero Visual - Dashboard Preview */}
          <div className="container max-w-6xl mx-auto mt-24 relative animate-fade-up animation-delay-500">
            <div className="absolute -inset-1 bg-gradient-to-b from-zinc-200 to-transparent dark:from-zinc-800 rounded-3xl blur-2xl opacity-50" />
            <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden aspect-[16/9] group">
              <div className="absolute top-0 left-0 right-0 h-10 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                </div>
                <div className="ml-4 px-3 py-1 bg-white dark:bg-black rounded-md border border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 font-mono w-64 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  aspendos.os / memory-core
                </div>
              </div>
              <div className="p-8 flex items-center justify-center h-full bg-zinc-50/50 dark:bg-black/50">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-tr from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
                    <Brain size={32} className="text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <p className="text-zinc-400 font-mono text-sm">
                    Global Memory Graph Active
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features - Bento Grid */}
        <section id="features" className="py-32 px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950/50">
          <div className="container max-w-6xl mx-auto">
            <div className="mb-20 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-semibold mb-6 tracking-tight text-zinc-900 dark:text-white">
                Intelligence, unified.
              </h2>
              <p className="text-lg text-zinc-500 dark:text-zinc-400">
                Connect to any model. Aspendos handles the memory, context, and billing.
                It's the last AI interface you'll ever need.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-[300px]">
              {/* Card 1: Models - Standard */}
              <div className="md:col-span-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <div className="absolute top-10 right-10 flex gap-[-10px]">
                  {[1, 2, 3].map((_, i) => (
                    <div
                      key={i}
                      className="w-12 h-12 rounded-full border-4 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center -ml-4 first:ml-0 shadow-sm z-10"
                    >
                      <Cpu size={20} className="text-zinc-400" />
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-10 left-10 max-w-md z-20">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                    <Shapes className="text-blue-500" size={24} weight="duotone" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2 text-zinc-900 dark:text-white">
                    Model Agnostic
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Switch seamlessly between GPT-4o, Claude 3.5 Sonnet, and
                    Gemini 1.5 Pro. Use the best tool for the job, in the same
                    chat.
                  </p>
                </div>
              </div>

              {/* Card 2: Speed - Vertical */}
              <div className="md:col-span-2 rounded-3xl bg-zinc-900 dark:bg-zinc-100 p-10 relative overflow-hidden group text-white dark:text-zinc-900">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
                  <Lightning
                    size={180}
                    className="text-white/5 dark:text-black/5 rotate-12"
                    weight="fill"
                  />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-end">
                  <h3 className="text-2xl font-semibold mb-2">Instant</h3>
                  <p className="text-zinc-400 dark:text-zinc-600 leading-relaxed">
                    Local-first architecture ensures zero-latency UI interactions.
                  </p>
                </div>
              </div>

              {/* Card 3: Global Memory - Wide */}
              <div className="md:col-span-3 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-zinc-50 to-transparent dark:from-zinc-950/50 pointer-events-none" />
                <div className="max-w-xs relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                    <Database
                      className="text-purple-500"
                      size={24}
                      weight="duotone"
                    />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2 text-zinc-900 dark:text-white">
                    Deep Memory
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Aspendos remembers project details, user preferences, and code
                    snippets across every session.
                  </p>
                </div>
              </div>

              {/* Card 4: Developer API */}
              <div className="md:col-span-3 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors flex flex-col justify-between">
                <div className="w-full bg-zinc-950 rounded-lg p-4 font-mono text-xs text-zinc-400 border border-zinc-800 shadow-inner mb-6">
                  <span className="text-purple-400">const</span> memory ={' '}
                  <span className="text-yellow-400">await</span> aspendos.
                  <span className="text-blue-400">recall</span>(
                  <span className="text-green-400">'project_specs'</span>);
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2 text-zinc-900 dark:text-white">
                    Developer SDK
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Build agents that share your memory graph. Full API access
                    included.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing - Clean & Simple */}
        <section id="pricing" className="py-32 px-6 lg:px-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="container max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-semibold mb-6 tracking-tight text-zinc-900 dark:text-white">
              Universal Access.
            </h2>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
              One subscription for all models. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 container max-w-4xl mx-auto">
            <div className="rounded-3xl p-10 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex flex-col">
              <div className="mb-8">
                <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Free</span>
                <div className="text-4xl font-bold mt-4 mb-2 text-zinc-900 dark:text-white">$0</div>
                <p className="text-zinc-500">For casual exploration.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['50 messages/day', 'GPT-4o mini', 'Basic Memory'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <CheckCircle className="text-zinc-300 dark:text-zinc-600" size={20} weight="fill" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full rounded-full h-12" asChild>
                <Link href="/signup">Start Free</Link>
              </Button>
            </div>

            <div className="rounded-3xl p-10 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
              <div className="mb-8 relative z-10">
                <span className="text-sm font-semibold uppercase tracking-wider opacity-70">Pro</span>
                <div className="text-4xl font-bold mt-4 mb-2">$29</div>
                <p className="opacity-70">For the power user.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 relative z-10">
                {['Unlimited Messages', 'All Frontier Models', 'Full Memory Graph', 'Priority Support'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="text-emerald-500" size={20} weight="fill" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="w-full rounded-full h-12 bg-white text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 border-0" asChild>
                <Link href="/signup">Upgrade to Pro</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
        <div className="container max-w-7xl mx-auto px-6 text-center text-sm text-zinc-400 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 mb-4 opacity-50">
            <GithubLogo size={20} />
            <XLogo size={20} />
          </div>
          <p>© 2026 Aspendos Inc. San Francisco.</p>
        </div>
      </footer>
    </div>
  );
}
