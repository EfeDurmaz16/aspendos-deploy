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
  Bell,
  Clock,
  Headphones,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
              variant="primary"
              className="rounded-full px-5 h-9 font-medium shadow-sm"
              asChild
            >
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-32">
        {/* Hero Section - Proactive Focus */}
        <section className="relative px-6 lg:px-8 pb-32 pt-20 overflow-hidden">
          {/* Gradient Mesh Background */}
          <div className="absolute inset-0 pointer-events-none -z-10">
            <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/30 to-transparent dark:from-blue-900/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 right-1/4 w-[600px] h-[600px] bg-gradient-to-tl from-emerald-100/20 to-transparent dark:from-emerald-900/15 rounded-full blur-3xl" />
          </div>

          <div className="container max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-8 animate-fade-up">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Now with voice & proactive scheduling
            </div>

            <h1 className="text-6xl md:text-[5.5rem] leading-[0.95] font-semibold tracking-tighter text-zinc-900 dark:text-white mb-6 animate-fade-up animation-delay-100">
              Meet your <br />
              <span className="relative">
                <span className="relative z-10">autonomous AI assistant</span>
                <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full opacity-30" />
              </span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up animation-delay-200">
              Aspendos doesn't just respond—it anticipates. Proactive notifications, autonomous scheduling, and persistent memory across every conversation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up animation-delay-300">
              <Button
                size="lg"
                variant="primary"
                className="rounded-full px-8 h-14 text-base shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                asChild
              >
                <Link href="/signup">
                  Start using Aspendos
                  <ArrowRight className="ml-2 w-4 h-4" weight="bold" />
                </Link>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full px-8 h-14 text-base transition-all hover-raise"
                asChild
              >
                <Link href="#demo">Watch the demo</Link>
              </Button>
            </div>
          </div>

          {/* Hero Visual - Proactive Features Showcase */}
          <div className="container max-w-6xl mx-auto mt-24 relative animate-fade-up animation-delay-500">
            {/* Subtle glow behind cards */}
            <div className="absolute -inset-12 bg-gradient-to-b from-blue-500/5 to-transparent dark:from-blue-400/5 rounded-3xl blur-2xl opacity-50" />

            {/* Main card with asymmetric layout */}
            <div className="relative rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-zinc-50 to-transparent dark:from-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center px-6 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                </div>
                <div className="ml-4 text-[10px] text-zinc-400 font-mono">aspendos.core / proactive-agent</div>
              </div>

              {/* Content - Asymmetric Layout */}
              <div className="p-8 lg:p-12 pt-20 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-96">
                {/* Left: Main feature */}
                <div className="lg:col-span-2 flex flex-col justify-center space-y-8">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                      AI that acts before you ask
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Autonomous scheduling, predictive notifications, and proactive assistance. Your AI doesn't wait in the chat box—it works ahead of your needs.
                    </p>
                  </div>

                  {/* Feature items */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Bell className="text-blue-500" size={20} weight="bold" />
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">Proactive</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Anticipates your needs</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Clock className="text-emerald-500" size={20} weight="bold" />
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">Scheduled</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Acts at the right time</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Brain className="text-purple-500" size={20} weight="bold" />
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">Remembers</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Learns from context</p>
                    </div>
                  </div>
                </div>

                {/* Right: Visual indicator */}
                <div className="lg:col-span-1 flex flex-col items-center justify-center relative">
                  <div className="relative w-32 h-32">
                    {/* Animated pulse ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse" />
                    <div className="absolute inset-2 rounded-full border border-emerald-500/20" />

                    {/* Center circle */}
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-emerald-500/10 to-blue-500/10 flex items-center justify-center">
                      <Sparkle className="text-emerald-500 animate-float" size={40} weight="fill" />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4 text-center">Active &amp; Learning</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features - Three Core Pillars */}
        <section id="features" className="py-32 px-6 lg:px-8 relative overflow-hidden">
          {/* Gradient meshes for visual depth */}
          <div className="absolute inset-0 pointer-events-none -z-10">
            <div className="absolute top-32 right-0 w-[500px] h-[400px] bg-gradient-to-l from-purple-100/20 to-transparent dark:from-purple-900/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-gradient-to-t from-blue-100/15 to-transparent dark:from-blue-900/10 rounded-full blur-3xl" />
          </div>

          <div className="container max-w-6xl mx-auto relative z-10">
            <div className="mb-24 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-semibold mb-6 tracking-tight text-zinc-900 dark:text-white">
                Built for autonomous work.
              </h2>
              <p className="text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Aspendos combines three essential capabilities into one unified platform. Proactivity, memory, and voice—everything you need for truly autonomous AI.
              </p>
            </div>

            {/* Asymmetric Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-auto">
              {/* Feature 1: Proactive Agent - Large Feature */}
              <div className="md:col-span-7 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 p-10 lg:p-12 relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:shadow-lg hover-lift">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 space-y-8">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Bell className="text-blue-500" size={22} weight="bold" />
                      </div>
                      <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pillar 1</span>
                    </div>
                    <h3 className="text-3xl font-semibold text-zinc-900 dark:text-white">
                      Proactive Agent
                    </h3>
                  </div>

                  <p className="text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-sm">
                    Aspendos doesn't wait in a chat box. It autonomously schedules tasks, sends predictive notifications, and takes action on your behalf.
                  </p>

                  <div className="space-y-3 pt-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-emerald-500 flex-shrink-0 mt-1" size={20} weight="fill" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Predictive notifications at the right moment</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-emerald-500 flex-shrink-0 mt-1" size={20} weight="fill" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Autonomous task scheduling with commitment detection</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-emerald-500 flex-shrink-0 mt-1" size={20} weight="fill" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Context-aware decision making across conversations</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 2: Memory System - Medium */}
              <div className="md:col-span-5 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 p-10 relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:shadow-lg hover-lift">
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 space-y-8 h-full flex flex-col">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Database className="text-purple-500" size={22} weight="bold" />
                      </div>
                      <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pillar 2</span>
                    </div>
                    <h3 className="text-3xl font-semibold text-zinc-900 dark:text-white">
                      Persistent Memory
                    </h3>
                  </div>

                  <p className="text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed flex-1">
                    Never lose context again. Aspendos maintains a knowledge graph of your preferences, projects, and decisions.
                  </p>

                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-900/30 dark:bg-zinc-950/50 rounded-lg px-3 py-2">
                      <span className="text-emerald-400">→</span> Cross-conversation memory
                    </p>
                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-900/30 dark:bg-zinc-950/50 rounded-lg px-3 py-2">
                      <span className="text-emerald-400">→</span> Vector-based recall
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 3: Voice I/O - Medium */}
              <div className="md:col-span-5 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 p-10 relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:shadow-lg hover-lift">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 space-y-8 h-full flex flex-col">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Headphones className="text-emerald-500" size={22} weight="bold" />
                      </div>
                      <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pillar 3</span>
                    </div>
                    <h3 className="text-3xl font-semibold text-zinc-900 dark:text-white">
                      Voice I/O
                    </h3>
                  </div>

                  <p className="text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed flex-1">
                    Talk to your AI. Whisper transcription and natural speech synthesis for natural, hands-free interaction.
                  </p>

                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-900/30 dark:bg-zinc-950/50 rounded-lg px-3 py-2">
                      <span className="text-emerald-400">→</span> OpenAI Whisper v3
                    </p>
                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-900/30 dark:bg-zinc-950/50 rounded-lg px-3 py-2">
                      <span className="text-emerald-400">→</span> Natural TTS synthesis
                    </p>
                  </div>
                </div>
              </div>

              {/* Secondary Feature: Model Agnostic */}
              <div className="md:col-span-7 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 dark:from-zinc-100 dark:to-zinc-200 text-white dark:text-zinc-900 p-10 relative overflow-hidden group hover:shadow-lg transition-all">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Shapes size={200} weight="thin" className="opacity-20" />
                  </div>
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="max-w-sm space-y-3">
                    <h3 className="text-2xl font-semibold">Any Model. Any Time.</h3>
                    <p className="text-zinc-300 dark:text-zinc-700 leading-relaxed">
                      Switch seamlessly between Claude, GPT-4o, and Gemini. Aspendos handles model selection, cost optimization, and unified billing.
                    </p>
                  </div>
                  <div className="hidden lg:flex gap-2 flex-shrink-0">
                    {[1, 2, 3].map((_, i) => (
                      <div
                        key={i}
                        className="w-12 h-12 rounded-xl border border-zinc-700 dark:border-zinc-300 bg-zinc-800/50 dark:bg-zinc-300/50 flex items-center justify-center shadow-lg"
                      >
                        <Cpu size={20} className="text-white dark:text-zinc-900" weight="bold" />
                      </div>
                    ))}
                  </div>
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
              <Button variant="secondary" className="w-full rounded-full h-12" asChild>
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
              <Button variant="primary" className="w-full rounded-full h-12" asChild>
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
