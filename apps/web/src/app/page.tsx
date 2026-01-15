"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Cpu, Database, Microphone, Lightning, CheckCircle } from "@phosphor-icons/react";
import { ModeToggle } from "@/components/mode-toggle";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-background text-foreground selection:bg-zinc-200 selection:text-zinc-900">

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl font-semibold tracking-tight">ASPENDOS</span>
          </div>
          <nav className="hidden md:flex gap-8 items-center text-[15px] font-medium text-zinc-600 dark:text-zinc-400">
            <Link href="#features" className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">Method</Link>
            <Link href="#pricing" className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">Log in</Link>
            <ModeToggle />
            <Button size="sm" className="h-9 px-4 rounded-full font-medium" asChild>
              <Link href="/signup">Start using Aspendos</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">

        {/* Hero Section */}
        <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 px-6 lg:px-8 overflow-hidden">
          <div className="container max-w-7xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-zinc-50/50 backdrop-blur-sm text-[13px] font-medium text-zinc-600 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              The Memory-First AI Operating System
            </div>

            <h1 className="font-serif text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.1] font-medium tracking-tight text-zinc-900 dark:text-zinc-50 mb-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both delay-100">
              Stop paying for <br />
              <span className="text-zinc-400">fragmented intelligence.</span>
            </h1>

            <p className="text-[17px] md:text-[19px] leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both delay-200">
              Aspendos unifies GPT-4o, Claude 3.5, and Gemini into a single OS with persistent memory.
              Save context, save money, and build a second brain that actually remembers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both delay-300">
              <Button size="lg" className="rounded-full px-8 text-[15px] h-12 shadow-lg hover:shadow-xl transition-all" asChild>
                <Link href="/signup">Start Free Trial <ArrowRight className="ml-2 w-4 h-4" weight="bold" /></Link>
              </Button>
              <Button variant="outline" size="lg" className="rounded-full px-8 text-[15px] h-12 bg-white/50 hover:bg-white" asChild>
                <Link href="#demo">Live Demo</Link>
              </Button>
            </div>
          </div>

          {/* Abstract background element */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-zinc-200/50 to-transparent rounded-full blur-3xl -z-10 pointer-events-none opacity-40 dark:from-zinc-800/20" />
        </section>

        {/* Interactive Demo Placeholder (To be replaced with real component) */}
        <section id="demo" className="py-24 px-6 lg:px-8 bg-zinc-50/50 dark:bg-zinc-900/50 border-y border-zinc-200/50 dark:border-zinc-800">
          <div className="container max-w-5xl mx-auto">
            <div className="bg-white dark:bg-black rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden h-[600px] relative flex flex-col items-center justify-center text-center p-12">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
              <Brain className="w-16 h-16 text-zinc-300 mb-6" weight="duotone" />
              <h3 className="font-serif text-3xl mb-4 text-zinc-900 dark:text-white">Interactive Memory Demo</h3>
              <p className="text-zinc-500 max-w-md mx-auto mb-8">
                Try asking "What project am I working on?" after telling the AI about your work.
                <br /><span className="text-xs uppercase tracking-widest text-zinc-400 mt-2 block">Coming Soon to Preview</span>
              </p>
              <Button variant="secondary" disabled>Start Demo</Button>
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section id="features" className="py-32 px-6 lg:px-8">
          <div className="container max-w-7xl mx-auto">
            <div className="mb-20">
              <h2 className="font-serif text-4xl md:text-5xl mb-6 text-zinc-900 dark:text-zinc-50">The Aspendos Method</h2>
              <p className="text-[17px] text-zinc-700 dark:text-zinc-400 max-w-xl">
                Most AI tools are amnesiacs. We built a knowledge graph that persists across every conversation and every model.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 auto-rows-[400px]">

              {/* Feature 1: Multi-Model */}
              <div className="group relative overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-900 p-10 flex flex-col justify-between border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all">
                <div className="absolute top-10 right-10 p-4 bg-white dark:bg-black rounded-xl shadow-sm rotate-2 group-hover:rotate-0 transition-transform duration-500">
                  <Cpu size={48} className="text-zinc-800 dark:text-zinc-200" weight="light" />
                </div>
                <div className="mt-auto relative z-10">
                  <h3 className="font-serif text-2xl mb-3 text-zinc-900 dark:text-white">Multi-Model Core</h3>
                  <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-400">
                    Switch between GPT-4o, Claude 3.5, and Gemini Pro instantly. Ask one, verify with another.
                  </p>
                </div>
              </div>

              {/* Feature 2: Memory Graph (Span 2) */}
              <div className="md:col-span-2 group relative overflow-hidden rounded-3xl bg-zinc-900 dark:bg-white p-10 flex flex-col justify-between text-white dark:text-zinc-900 shadow-2xl">
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-20 pointer-events-none">
                  {/* Placeholder for Graph Viz */}
                  <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-500 to-transparent" />
                </div>

                <div className="relative z-10 max-w-lg">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-[13px] font-medium text-white mb-6">
                    <Database className="w-4 h-4" /> Persistent Layer
                  </div>
                  <h3 className="font-serif text-4xl mb-4">Semantic Memory Graph</h3>
                  <p className="text-[17px] opacity-80 leading-relaxed">
                    Aspendos doesn't just store logs. It maps concepts, entities, and relationships into a 3D graph.
                    It remembers that "Project Alpha" is a "SaaS platform" using "Next.js".
                  </p>
                </div>
              </div>

              {/* Feature 3: Voice */}
              <div className="group relative overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-900 p-10 flex flex-col justify-between border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-32 h-32 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                    <Microphone size={32} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" weight="light" />
                  </div>
                </div>
                <div className="mt-auto relative z-10">
                  <h3 className="font-serif text-2xl mb-3 text-zinc-900 dark:text-white">Real-Time Voice</h3>
                  <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-400">
                    Talk to your OS naturally. Interruptible, low-latency voice mode for when you're on the move.
                  </p>
                </div>
              </div>

              {/* Feature 4: Unification */}
              <div className="group relative overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-900 p-10 flex flex-col justify-between border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all">
                <div className="grid grid-cols-2 gap-4 mb-8 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800"></div>
                  <div className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800 translate-y-4"></div>
                </div>
                <div className="mt-auto relative z-10">
                  <h3 className="font-serif text-2xl mb-3 text-zinc-900 dark:text-white">Consolidated Billing</h3>
                  <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-400">
                    $49/mo covers everything. No more separate invoices for ChatGPT, Claude, and Perplexity.
                  </p>
                </div>
              </div>

              {/* Feature 5: Builder (CTA) */}
              <div className="group relative overflow-hidden rounded-3xl bg-zinc-50 dark:bg-zinc-950 p-10 flex flex-col justify-center items-center text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 transition-all cursor-pointer">
                <Lightning size={48} className="text-zinc-300 mb-6 group-hover:text-amber-400 transition-colors" weight="fill" />
                <h3 className="font-serif text-2xl mb-2 text-zinc-900 dark:text-white">Ready to upgrade?</h3>
                <p className="text-[15px] text-zinc-500 mb-6">Join 10,000+ builders.</p>
                <Button variant="default" className="rounded-full">View Plans</Button>
              </div>

            </div>
          </div>
        </section>


        {/* Pricing Section */}
        <section id="pricing" className="py-24 px-6 lg:px-8 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="container max-w-7xl mx-auto">
            <div className="mb-16 text-center max-w-2xl mx-auto">
              <h2 className="font-serif text-4xl mb-6 text-zinc-900 dark:text-zinc-50">Simple, unified pricing.</h2>
              <p className="text-[17px] text-zinc-700 dark:text-zinc-400">
                Replace 3+ subscriptions with one. Get the best models and persistent memory for less than the cost of GPT-4 alone.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Starter */}
              <div className="rounded-2xl p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                <div className="mb-6">
                  <h3 className="font-serif text-xl mb-2 text-zinc-900 dark:text-white">Starter</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight">$0</span>
                    <span className="text-zinc-500">/mo</span>
                  </div>
                  <p className="text-sm text-zinc-500 mt-2">Perfect for trying out the memory engine.</p>
                </div>
                <div className="space-y-4 mb-8 flex-1">
                  <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <CheckCircle className="w-5 h-5 text-zinc-900 dark:text-white shrink-0" weight="fill" />
                    <span>50 messages/day</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <CheckCircle className="w-5 h-5 text-zinc-900 dark:text-white shrink-0" weight="fill" />
                    <span>Basic Memory (100 facts)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <CheckCircle className="w-5 h-5 text-zinc-900 dark:text-white shrink-0" weight="fill" />
                    <span>GPT-4o mini & Claude Haiku</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full rounded-full" asChild>
                  <Link href="/signup">Start Free</Link>
                </Button>
              </div>

              {/* Pro */}
              <div className="rounded-2xl p-8 bg-zinc-900 dark:bg-zinc-50 border border-zinc-900 dark:border-white shadow-xl flex flex-col relative overflow-hidden transform md:-translate-y-4">
                <div className="absolute top-0 right-0 p-4">
                  <div className="bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                </div>
                <div className="mb-6">
                  <h3 className="font-serif text-xl mb-2 text-white dark:text-zinc-900">Pro</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight text-white dark:text-zinc-900">$29</span>
                    <span className="text-zinc-400 dark:text-zinc-600">/mo</span>
                  </div>
                  <p className="text-sm text-zinc-400 dark:text-zinc-600 mt-2">The complete power user suite.</p>
                </div>
                <div className="space-y-4 mb-8 flex-1">
                  <div className="flex items-center gap-3 text-sm text-zinc-300 dark:text-zinc-700">
                    <CheckCircle className="w-5 h-5 text-white dark:text-zinc-900 shrink-0" weight="fill" />
                    <span>Unlimited Usage</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-300 dark:text-zinc-700">
                    <CheckCircle className="w-5 h-5 text-white dark:text-zinc-900 shrink-0" weight="fill" />
                    <span>Unlimited Memory Graph</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-300 dark:text-zinc-700">
                    <CheckCircle className="w-5 h-5 text-white dark:text-zinc-900 shrink-0" weight="fill" />
                    <span>All Top Models (GPT-4o, Opus)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-300 dark:text-zinc-700">
                    <CheckCircle className="w-5 h-5 text-white dark:text-zinc-900 shrink-0" weight="fill" />
                    <span>Voice Mode included</span>
                  </div>
                </div>
                <Button className="w-full rounded-full bg-white text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800" asChild>
                  <Link href="/signup">Upgrade to Pro</Link>
                </Button>
              </div>

              {/* Team */}
              <div className="rounded-2xl p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                <div className="mb-6">
                  <h3 className="font-serif text-xl mb-2 text-zinc-900 dark:text-white">Team</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight">$49</span>
                    <span className="text-zinc-500">/user</span>
                  </div>
                  <p className="text-sm text-zinc-500 mt-2">For collaborative knowledge.</p>
                </div>
                <div className="space-y-4 mb-8 flex-1">
                  <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <CheckCircle className="w-5 h-5 text-zinc-900 dark:text-white shrink-0" weight="fill" />
                    <span>Shared Workspace Memory</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <CheckCircle className="w-5 h-5 text-zinc-900 dark:text-white shrink-0" weight="fill" />
                    <span>Admin Controls & SSO</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <CheckCircle className="w-5 h-5 text-zinc-900 dark:text-white shrink-0" weight="fill" />
                    <span>Priority Support</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full rounded-full" asChild>
                  <Link href="/signup">Contact Sales</Link>
                </Button>
              </div>

            </div>
          </div>
        </section>

      </main>

      <footer className="py-12 border-t border-zinc-100 dark:border-zinc-900 mt-24">
        <div className="container max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <span className="font-serif text-xl font-semibold tracking-tight text-zinc-300 dark:text-zinc-700">ASPENDOS</span>
          <p className="text-[13px] text-zinc-400 font-mono">© 2026 Aspendos Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
