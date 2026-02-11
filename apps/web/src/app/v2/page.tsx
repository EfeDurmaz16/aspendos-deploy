'use client';

import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ArrowRight, Sparkle, Brain, Lightning, Eye, Shield, Command, Terminal, Globe, Clock, Star, Play, Check } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

// Cinematic section wrapper with scroll animations
function CinematicSection({
  children,
  className,
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// Horizontal scrolling feature marquee
function FeatureMarquee() {
  return (
    <div className="relative overflow-hidden py-8 border-y border-zinc-800">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: [0, -1000] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex gap-12 items-center">
            <span className="text-zinc-500 font-mono text-sm tracking-widest">SHARED MEMORY</span>
            <span className="text-cyan-400">◆</span>
            <span className="text-zinc-500 font-mono text-sm tracking-widest">MULTI-MODEL</span>
            <span className="text-cyan-400">◆</span>
            <span className="text-zinc-500 font-mono text-sm tracking-widest">INTELLIGENT ROUTING</span>
            <span className="text-cyan-400">◆</span>
            <span className="text-zinc-500 font-mono text-sm tracking-widest">AGENTIC RAG</span>
            <span className="text-cyan-400">◆</span>
            <span className="text-zinc-500 font-mono text-sm tracking-widest">VOICE ENABLED</span>
            <span className="text-cyan-400">◆</span>
            <span className="text-zinc-500 font-mono text-sm tracking-widest">PRIVACY FIRST</span>
            <span className="text-cyan-400">◆</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// Cinematic stat display
function StatBlock({ value, label, delay }: { value: string; label: string; delay: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="text-center"
    >
      <div className="text-5xl md:text-7xl font-serif text-white mb-2">{value}</div>
      <div className="text-zinc-500 font-mono text-xs tracking-widest uppercase">{label}</div>
    </motion.div>
  );
}

// Feature card with hover effects
function FeatureCard({
  icon: Icon,
  title,
  description,
  index
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="group relative p-8 border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm hover:border-cyan-500/50 transition-colors duration-500"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <Icon className="w-8 h-8 text-cyan-400 mb-6" weight="thin" />
      <h3 className="text-xl font-serif text-white mb-3">{title}</h3>
      <p className="text-zinc-400 leading-relaxed text-sm">{description}</p>
    </motion.div>
  );
}

// Model card for supported AI models
function ModelCard({ name, provider, speed, index }: { name: string; provider: string; speed: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="flex items-center justify-between p-4 border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
          <Terminal className="w-5 h-5 text-cyan-400" weight="thin" />
        </div>
        <div>
          <div className="text-white font-medium">{name}</div>
          <div className="text-zinc-500 text-sm">{provider}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-cyan-400 font-mono text-sm">{speed}</div>
        <div className="text-zinc-600 text-xs">avg response</div>
      </div>
    </motion.div>
  );
}

// Use case card
function UseCaseCard({ title, description, icon: Icon, index }: { title: string; description: string; icon: React.ElementType; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="p-6 border border-zinc-800 hover:border-zinc-700 transition-colors bg-zinc-950/30"
    >
      <Icon className="w-6 h-6 text-cyan-400 mb-4" weight="thin" />
      <h4 className="text-white font-medium mb-2">{title}</h4>
      <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

// Testimonial card
function TestimonialCard({ quote, author, role, index }: { quote: string; author: string; role: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="p-8 border border-zinc-800 bg-zinc-950/30"
    >
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-cyan-400" weight="fill" />
        ))}
      </div>
      <p className="text-zinc-300 leading-relaxed mb-6 font-serif italic">&ldquo;{quote}&rdquo;</p>
      <div>
        <div className="text-white font-medium">{author}</div>
        <div className="text-zinc-500 text-sm">{role}</div>
      </div>
    </motion.div>
  );
}

// Pricing tier
function PricingTier({
  name,
  price,
  features,
  highlighted = false,
  index
}: {
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative p-8 border transition-all duration-300",
        highlighted
          ? "border-cyan-500 bg-cyan-500/5"
          : "border-zinc-800 bg-zinc-950/30 hover:border-zinc-700"
      )}
    >
      {highlighted && (
        <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      )}
      <div className="font-mono text-xs text-zinc-500 tracking-widest uppercase mb-4">{name}</div>
      <div className="text-4xl font-serif text-white mb-6">{price}<span className="text-lg text-zinc-500">/mo</span></div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
            <Check className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" weight="bold" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={`/signup?tier=${name.toLowerCase()}`}
        className={cn(
          "block w-full py-3 text-center text-sm font-medium transition-all duration-300",
          highlighted
            ? "bg-cyan-500 text-black hover:bg-cyan-400"
            : "border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
        )}
      >
        Get Started
      </Link>
    </motion.div>
  );
}

// FAQ Item
function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="border-b border-zinc-800 pb-6"
    >
      <h4 className="text-white font-medium mb-3">{question}</h4>
      <p className="text-zinc-400 text-sm leading-relaxed">{answer}</p>
    </motion.div>
  );
}

export default function LandingPageV2() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  const models = [
    { name: "GPT-4o", provider: "OpenAI", speed: "~1.2s" },
    { name: "Claude Opus", provider: "Anthropic", speed: "~1.8s" },
    { name: "Claude Sonnet", provider: "Anthropic", speed: "~0.9s" },
    { name: "Gemini Pro", provider: "Google", speed: "~1.1s" },
    { name: "Llama 3.1", provider: "Meta", speed: "~0.6s" },
    { name: "Mistral Large", provider: "Mistral", speed: "~0.8s" },
  ];

  const useCases = [
    { title: "Research & Analysis", description: "Analyze complex documents, extract insights, and synthesize information from multiple sources.", icon: Eye },
    { title: "Code Development", description: "Write, debug, and refactor code with context-aware assistance across your entire project.", icon: Terminal },
    { title: "Content Creation", description: "Draft emails, reports, and creative content with your personal writing style preserved.", icon: Globe },
    { title: "Task Automation", description: "Schedule reminders, automate workflows, and let AI proactively manage your tasks.", icon: Clock },
  ];

  const earlyAdopterBenefits = [
    { title: "Unified Memory", description: "One conversation thread that works across GPT-4, Claude, and Gemini. Context that actually persists." },
    { title: "Smart Routing", description: "Automatic model selection based on your query. Always get the best AI for the task." },
    { title: "Proactive AI", description: "Schedule reminders and let AI initiate conversations when needed. Your AI works for you." },
  ];

  const faqs = [
    { question: "How does shared memory work across models?", answer: "YULA maintains a unified memory layer that persists across all AI interactions. When you switch from GPT-4 to Claude, your context, preferences, and conversation history seamlessly transfer." },
    { question: "Is my data secure?", answer: "Yes. All data is encrypted at rest and in transit. We never train on your data, and you can export or delete your memory at any time. Enterprise plans include SOC 2 compliance." },
    { question: "Can I use my own API keys?", answer: "Pro and Ultra plans support bringing your own API keys for direct provider access. This gives you more control over rate limits and billing." },
    { question: "What happens when I exceed my limits?", answer: "You'll receive notifications at 75%, 90%, and 100% of your monthly limit. After hitting 100%, you can purchase additional credits or wait for the next billing cycle." },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Minimal navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-6 py-6 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl tracking-tight">
            YULA
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors font-mono tracking-wide">
              Features
            </Link>
            <Link href="#models" className="text-sm text-zinc-400 hover:text-white transition-colors font-mono tracking-wide">
              Models
            </Link>
            <Link href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors font-mono tracking-wide">
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors font-mono tracking-wide"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm bg-white text-black hover:bg-zinc-200 transition-colors font-mono tracking-wide"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Cinematic fullscreen */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative min-h-screen flex items-center justify-center px-6"
      >
        {/* Subtle gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-[96px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-800 text-zinc-500 font-mono text-xs tracking-widest">
              <Sparkle className="w-3 h-3 text-cyan-400" weight="fill" />
              UNIVERSAL AI OPERATING SYSTEM
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-serif leading-[0.9] tracking-tight mb-8"
          >
            One memory.
            <br />
            <span className="text-zinc-500">Every model.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed"
          >
            Stop switching tabs. Stop repeating yourself.
            Access GPT-4, Claude, and Gemini through a single interface
            that remembers everything.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/signup"
              className="group flex items-center gap-3 px-8 py-4 bg-white text-black font-medium hover:bg-cyan-400 transition-colors duration-300"
            >
              <Command className="w-5 h-5" />
              Start Building
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#demo"
              className="flex items-center gap-2 px-8 py-4 border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white transition-all duration-300 font-mono text-sm tracking-wide"
            >
              <Play className="w-4 h-4" weight="fill" />
              Watch Demo
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-px h-16 bg-gradient-to-b from-zinc-600 to-transparent"
          />
        </motion.div>
      </motion.section>

      {/* Feature marquee */}
      <FeatureMarquee />

      {/* Problem/Solution Section */}
      <CinematicSection className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24">
            <div>
              <span className="font-mono text-xs text-red-400 tracking-widest uppercase mb-4 block">The Problem</span>
              <h2 className="text-3xl md:text-4xl font-serif text-white mb-6 leading-tight">
                AI is powerful but fragmented.
              </h2>
              <p className="text-zinc-400 leading-relaxed mb-6">
                You use ChatGPT for writing, Claude for analysis, Gemini for research.
                Each conversation exists in isolation. Context is lost.
                You repeat yourself endlessly.
              </p>
              <ul className="space-y-3 text-zinc-500 text-sm">
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  Multiple AI tools with zero memory continuity
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  $200+/month for separate subscriptions
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  Hours wasted re-explaining context
                </li>
              </ul>
            </div>
            <div>
              <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase mb-4 block">The Solution</span>
              <h2 className="text-3xl md:text-4xl font-serif text-white mb-6 leading-tight">
                Unified intelligence, persistent memory.
              </h2>
              <p className="text-zinc-400 leading-relaxed mb-6">
                YULA connects every AI model through a shared memory layer.
                Start a conversation with GPT-4, continue with Claude.
                Your context follows you everywhere.
              </p>
              <ul className="space-y-3 text-zinc-500 text-sm">
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  Single interface, every major AI model
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  One subscription, unlimited context
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  AI that truly knows you
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CinematicSection>

      {/* Stats Section */}
      <section className="py-24 px-6 border-y border-zinc-800">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-8">
          <StatBlock value="10+" label="AI Models" delay={0} />
          <StatBlock value="<100ms" label="Routing Latency" delay={0.1} />
          <StatBlock value="Growing" label="Community" delay={0.2} />
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <CinematicSection className="mb-16">
            <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase mb-4 block">Capabilities</span>
            <h2 className="text-4xl md:text-5xl font-serif text-white max-w-2xl leading-tight">
              Intelligence without friction.
            </h2>
          </CinematicSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1">
            <FeatureCard
              icon={Brain}
              title="Persistent Memory"
              description="Every conversation builds on the last. Your AI remembers preferences, projects, and context indefinitely."
              index={0}
            />
            <FeatureCard
              icon={Lightning}
              title="Intelligent Routing"
              description="Automatically directs each query to the optimal model. Sub-100ms decisions with Groq-powered analysis."
              index={1}
            />
            <FeatureCard
              icon={Eye}
              title="Multimodal Input"
              description="Text, voice, images, and code in one interface. Switch modalities without losing context."
              index={2}
            />
            <FeatureCard
              icon={Shield}
              title="Privacy First"
              description="Your data stays yours. End-to-end encryption with optional self-hosted deployment."
              index={3}
            />
            <FeatureCard
              icon={Command}
              title="Agentic RAG"
              description="Intelligent retrieval that knows when to search your memory and when to reply directly."
              index={4}
            />
            <FeatureCard
              icon={Clock}
              title="Proactive Scheduling"
              description="AI-initiated callbacks for reminders, follow-ups, and scheduled tasks."
              index={5}
            />
          </div>
        </div>
      </section>

      {/* Supported Models */}
      <section id="models" className="py-32 px-6 bg-zinc-950/50">
        <div className="max-w-4xl mx-auto">
          <CinematicSection className="mb-12 text-center">
            <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase mb-4 block">Integrations</span>
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-4">
              Every model. One interface.
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Access the world&apos;s best AI models through a single, unified experience.
            </p>
          </CinematicSection>

          <div className="space-y-1">
            {models.map((model, index) => (
              <ModelCard key={model.name} {...model} index={index} />
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-zinc-600 text-sm mt-8"
          >
            + 20 more models including Cohere, AI21, and open-source options
          </motion.p>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <CinematicSection className="mb-12">
            <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase mb-4 block">Use Cases</span>
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-4">
              Built for how you work.
            </h2>
          </CinematicSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-1">
            {useCases.map((useCase, index) => (
              <UseCaseCard key={useCase.title} {...useCase} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* What YULA Offers */}
      <section className="py-32 px-6 bg-zinc-950/50">
        <div className="max-w-6xl mx-auto">
          <CinematicSection className="mb-12 text-center">
            <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase mb-4 block">Why YULA</span>
            <h2 className="text-4xl md:text-5xl font-serif text-white">
              Built for early adopters.
            </h2>
          </CinematicSection>

          <div className="grid md:grid-cols-3 gap-1">
            {earlyAdopterBenefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="p-8 border border-zinc-800 bg-zinc-950/30"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-cyan-400" weight="fill" />
                  ))}
                </div>
                <h3 className="text-white font-medium mb-3">{benefit.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote/Testimonial Section */}
      <CinematicSection className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <blockquote className="text-3xl md:text-4xl font-serif text-white leading-relaxed mb-8">
            &ldquo;The idea was born from my own frustration as a developer constantly
            switching between different AI tools and losing context every time.&rdquo;
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-black font-serif text-xl">
              E
            </div>
            <div className="text-left">
              <div className="text-white font-medium">Efe Baran Durmaz</div>
              <div className="text-zinc-500 text-sm font-mono">Founder & AI Engineer</div>
            </div>
          </div>
        </div>
      </CinematicSection>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <CinematicSection className="mb-16 text-center">
            <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase mb-4 block">Pricing</span>
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-4">
              Simple, transparent.
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Access premium AI models that typically cost $200+/month. All unified in one subscription.
            </p>
          </CinematicSection>

          <div className="grid md:grid-cols-3 gap-1">
            <PricingTier
              name="Starter"
              price="$20"
              features={[
                "~300 chats/month",
                "GPT-4 + 1 additional model",
                "10 min voice/day",
                "Basic memory",
                "Email support"
              ]}
              index={0}
            />
            <PricingTier
              name="Pro"
              price="$50"
              features={[
                "~1,500 chats/month",
                "All models: GPT-4, Claude, Gemini",
                "60 min voice/day",
                "Advanced memory + search",
                "Priority routing"
              ]}
              highlighted
              index={1}
            />
            <PricingTier
              name="Ultra"
              price="$100"
              features={[
                "5,000+ chats/month",
                "All models + experimental",
                "180 min voice/day",
                "Full Memory Inspector",
                "Dedicated support"
              ]}
              index={2}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-6 bg-zinc-950/50">
        <div className="max-w-3xl mx-auto">
          <CinematicSection className="mb-12 text-center">
            <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase mb-4 block">FAQ</span>
            <h2 className="text-4xl font-serif text-white">
              Common questions.
            </h2>
          </CinematicSection>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <FAQItem key={faq.question} {...faq} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <CinematicSection className="py-32 px-6 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-serif text-white mb-6 leading-tight">
            Ready to unify your AI?
          </h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
            Join thousands of developers and creators building with persistent context.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black text-lg font-medium hover:bg-cyan-400 transition-colors duration-300"
          >
            <Command className="w-6 h-6" />
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </CinematicSection>

      {/* Minimal Footer */}
      <footer className="py-12 px-6 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="font-serif text-xl text-zinc-600">YULA</div>
          <div className="flex items-center gap-8 text-sm text-zinc-600">
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
            <a href="https://github.com" className="hover:text-zinc-400 transition-colors">GitHub</a>
            <a href="https://twitter.com" className="hover:text-zinc-400 transition-colors">X</a>
          </div>
          <div className="text-sm text-zinc-700 font-mono">© 2026 YULA</div>
        </div>
      </footer>
    </div>
  );
}
