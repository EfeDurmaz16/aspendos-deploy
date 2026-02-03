'use client';

import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import {
    ArrowRight,
    Check,
    ArrowUpRight,
    Play,
    Sparkle,
    CloudArrowUp,
    Bell,
    UsersThree,
    Brain,
    Microphone,
    ShieldCheck,
    Lightning,
    CaretDown,
    X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

// =============================================================================
// DESIGN SYSTEM: EDITORIAL LUXURY
// Deep navy (#0A0E27), Gold (#D4AF37), Cream (#F8F6F0), Pure white
// Playfair Display (serif headlines) + DM Sans (body)
// Generous whitespace, asymmetric layouts, large typography
// =============================================================================

const COLORS = {
    navy: '#0A0E27',
    navyLight: '#141B3D',
    gold: '#D4AF37',
    goldLight: '#E8D48A',
    cream: '#F8F6F0',
    white: '#FFFFFF',
    gray: {
        100: '#F5F5F5',
        200: '#E5E5E5',
        300: '#D4D4D4',
        400: '#A3A3A3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
    },
};

// Feature accent colors
const ACCENTS = {
    import: '#3B82F6',    // Blue
    pac: '#F59E0B',       // Amber
    council: '#EC4899',   // Pink
};

// =============================================================================
// YULA MONOGRAM LOGO
// Elegant "Y" with neural network pattern
// =============================================================================

function YulaMonogram({ className = '', variant = 'dark' }: { className?: string; variant?: 'dark' | 'light' | 'gold' }) {
    const color = variant === 'gold' ? COLORS.gold : variant === 'light' ? COLORS.white : COLORS.navy;

    return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            {/* Outer circle with subtle glow */}
            <circle cx="24" cy="24" r="23" stroke={color} strokeWidth="1" opacity="0.3" />

            {/* Neural network dots */}
            <circle cx="8" cy="16" r="1.5" fill={color} opacity="0.4" />
            <circle cx="40" cy="16" r="1.5" fill={color} opacity="0.4" />
            <circle cx="24" cy="6" r="1.5" fill={color} opacity="0.4" />
            <circle cx="14" cy="38" r="1.5" fill={color} opacity="0.4" />
            <circle cx="34" cy="38" r="1.5" fill={color} opacity="0.4" />

            {/* Connecting lines */}
            <path d="M8 16 L24 24 L40 16" stroke={color} strokeWidth="0.75" opacity="0.2" />
            <path d="M24 6 L24 24" stroke={color} strokeWidth="0.75" opacity="0.2" />
            <path d="M14 38 L24 24 L34 38" stroke={color} strokeWidth="0.75" opacity="0.2" />

            {/* The Y letterform - elegant serif style */}
            <path
                d="M14 12 L24 26 L34 12"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <path
                d="M24 26 L24 38"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
            />

            {/* Serif accents */}
            <path d="M12 12 L16 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <path d="M32 12 L36 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <path d="M22 38 L26 38" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

// Animated logo for hero
function YulaLogoAnimated({ className = '' }: { className?: string }) {
    return (
        <motion.div className={cn('relative', className)}>
            {/* Outer glow ring */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `radial-gradient(circle, ${COLORS.gold}20 0%, transparent 70%)`,
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Main logo */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
                <YulaMonogram className="w-full h-full" variant="gold" />
            </motion.div>

            {/* Orbiting particles */}
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                        background: i === 0 ? ACCENTS.import : i === 1 ? ACCENTS.pac : ACCENTS.council,
                        top: '50%',
                        left: '50%',
                    }}
                    animate={{
                        rotate: 360,
                    }}
                    transition={{
                        duration: 8 + i * 2,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                    initial={{
                        x: -4,
                        y: -4,
                    }}
                >
                    <motion.div
                        style={{
                            position: 'absolute',
                            left: `${50 + i * 15}px`,
                        }}
                        className="w-2 h-2 rounded-full"
                    />
                </motion.div>
            ))}
        </motion.div>
    );
}

// =============================================================================
// GRADIENT MESH BACKGROUND
// Flowing organic gradient with subtle animation
// =============================================================================

function GradientMeshBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Base gradient */}
            <div
                className="absolute inset-0"
                style={{
                    background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyLight} 50%, ${COLORS.navy} 100%)`,
                }}
            />

            {/* Animated gradient orbs */}
            <motion.div
                className="absolute w-[800px] h-[800px] rounded-full opacity-30 blur-[120px]"
                style={{
                    background: `radial-gradient(circle, ${COLORS.gold}40 0%, transparent 70%)`,
                    top: '-20%',
                    right: '-10%',
                }}
                animate={{
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            <motion.div
                className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[100px]"
                style={{
                    background: `radial-gradient(circle, ${ACCENTS.council}30 0%, transparent 70%)`,
                    bottom: '-10%',
                    left: '-5%',
                }}
                animate={{
                    x: [0, -30, 0],
                    y: [0, -40, 0],
                    scale: [1, 1.15, 1],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            <motion.div
                className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-[80px]"
                style={{
                    background: `radial-gradient(circle, ${ACCENTS.import}25 0%, transparent 70%)`,
                    top: '40%',
                    left: '30%',
                }}
                animate={{
                    x: [0, 40, 0],
                    y: [0, -20, 0],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Noise texture overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Subtle grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(${COLORS.white} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.white} 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />
        </div>
    );
}

// =============================================================================
// GLASS CARD COMPONENT
// Frosted glass effect with subtle border
// =============================================================================

function GlassCard({
    children,
    className,
    hover = true,
}: {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}) {
    return (
        <motion.div
            className={cn(
                'relative backdrop-blur-xl rounded-2xl overflow-hidden',
                'border border-white/10',
                'bg-white/5',
                hover && 'transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-black/20',
                className
            )}
            whileHover={hover ? { y: -4 } : undefined}
        >
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            {children}
        </motion.div>
    );
}

// =============================================================================
// ANIMATED SECTION WRAPPER
// =============================================================================

function AnimatedSection({
    children,
    className,
    id,
    delay = 0,
}: {
    children: React.ReactNode;
    className?: string;
    id?: string;
    delay?: number;
}) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <motion.section
            ref={ref}
            id={id}
            initial={{ opacity: 0, y: 60 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
            transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.section>
    );
}

// =============================================================================
// STAGGERED TEXT ANIMATION
// =============================================================================

function StaggeredText({
    text,
    className,
    delay = 0,
}: {
    text: string;
    className?: string;
    delay?: number;
}) {
    const words = text.split(' ');

    return (
        <span className={className}>
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    className="inline-block mr-[0.25em]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.5,
                        delay: delay + i * 0.05,
                        ease: [0.16, 1, 0.3, 1],
                    }}
                >
                    {word}
                </motion.span>
            ))}
        </span>
    );
}

// =============================================================================
// FEATURE PILL
// =============================================================================

function FeaturePill({
    icon: Icon,
    label,
    color,
    delay = 0,
}: {
    icon: React.ElementType;
    label: string;
    color: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md"
            style={{
                background: `${color}15`,
                border: `1px solid ${color}30`,
            }}
        >
            <Icon size={16} weight="fill" style={{ color }} />
            <span className="text-sm font-medium text-white/90">{label}</span>
        </motion.div>
    );
}

// =============================================================================
// ASCII ART COMPONENTS
// =============================================================================

// Import Flow ASCII Animation
function ImportFlowASCII() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((s) => (s + 1) % 4);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const frames = [
        // Step 0: ChatGPT Export
        `
    ┌─────────────────────────────────────┐
    │  ░▒▓ ChatGPT ▓▒░                    │
    │                                     │
    │  ┌───────────────────────────────┐  │
    │  │ > Export my data              │  │
    │  │                               │  │
    │  │   [ Settings ]                │  │
    │  │   [ Data Controls ]           │  │
    │  │   [■ Export Data ] ◄──────    │  │
    │  │                               │  │
    │  └───────────────────────────────┘  │
    │                                     │
    │  Downloading: conversations.zip     │
    │  ████████████████████░░░░  78%      │
    └─────────────────────────────────────┘`,

        // Step 1: File Ready
        `
    ┌─────────────────────────────────────┐
    │                                     │
    │         ┌─────────────────┐         │
    │         │                 │         │
    │         │    ╔═══════╗    │         │
    │         │    ║  ZIP  ║    │         │
    │         │    ╚═══════╝    │         │
    │         │                 │         │
    │         │ conversations   │         │
    │         │    .zip         │         │
    │         │                 │         │
    │         │   847 chats     │         │
    │         │   12.4 MB       │         │
    │         └─────────────────┘         │
    │                                     │
    └─────────────────────────────────────┘`,

        // Step 2: Drag to YULA
        `
    ┌─────────────────────────────────────┐
    │                                     │
    │    ╔═══════╗                        │
    │    ║  ZIP  ║  ─────────────►        │
    │    ╚═══════╝                        │
    │                      ┌───────────┐  │
    │                      │   YULA    │  │
    │     ╭───────────╮    │           │  │
    │     │ ░░░░░░░░░ │    │  ┌─────┐  │  │
    │     │ ░ DROP  ░ │    │  │  Y  │  │  │
    │     │ ░ HERE  ░ │    │  └─────┘  │  │
    │     │ ░░░░░░░░░ │    │           │  │
    │     ╰───────────╯    └───────────┘  │
    │                                     │
    └─────────────────────────────────────┘`,

        // Step 3: Import Complete
        `
    ┌─────────────────────────────────────┐
    │                                     │
    │      ✓ Import Complete!             │
    │                                     │
    │   ┌────────────────────────────┐    │
    │   │  847 conversations         │    │
    │   │  ████████████████████ 100% │    │
    │   │                            │    │
    │   │  ✓ 2,341 messages parsed   │    │
    │   │  ✓ 156 memories extracted  │    │
    │   │  ✓ 23 projects detected    │    │
    │   │  ✓ Context ready           │    │
    │   └────────────────────────────┘    │
    │                                     │
    │      [ Start Chatting → ]           │
    └─────────────────────────────────────┘`,
    ];

    return (
        <div className="relative">
            <pre
                className="text-xs md:text-sm font-mono leading-tight"
                style={{ color: ACCENTS.import }}
            >
                {frames[step]}
            </pre>
            <div className="flex justify-center gap-2 mt-4">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={cn(
                            'w-2 h-2 rounded-full transition-all duration-300',
                            step === i ? 'w-6' : ''
                        )}
                        style={{
                            backgroundColor: step === i ? ACCENTS.import : `${ACCENTS.import}40`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

// PAC Notification ASCII Animation
function PACNotificationASCII() {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame((f) => (f + 1) % 3);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    const frames = [
        // Frame 0: AI Detects Commitment
        `
    ╔═══════════════════════════════════════════╗
    ║                                           ║
    ║   User: "I'll finish the report by        ║
    ║         Friday and send it to Sarah"      ║
    ║                                           ║
    ║   ┌─────────────────────────────────┐     ║
    ║   │  ◉ YULA detected:               │     ║
    ║   │                                 │     ║
    ║   │  📋 Commitment: Finish report   │     ║
    ║   │  📅 Deadline: Friday            │     ║
    ║   │  👤 Stakeholder: Sarah          │     ║
    ║   │                                 │     ║
    ║   │  [ Schedule Reminder? ]         │     ║
    ║   └─────────────────────────────────┘     ║
    ║                                           ║
    ╚═══════════════════════════════════════════╝`,

        // Frame 1: Phone Notification
        `
              ┌──────────────────────┐
              │ ▓▓▓▓▓  9:41  ▓▓▓▓▓  │
              ├──────────────────────┤
              │                      │
              │  ┌────────────────┐  │
              │  │ 🔔 YULA        │  │
              │  │                │  │
              │  │ Hey! Remember  │  │
              │  │ that report    │  │
              │  │ for Sarah?     │  │
              │  │                │  │
              │  │ It's due       │  │
              │  │ tomorrow!      │  │
              │  │                │  │
              │  │ [Snooze][Open] │  │
              │  └────────────────┘  │
              │                      │
              └──────────────────────┘`,

        // Frame 2: Timeline
        `
    ┌─────────────────────────────────────────────┐
    │                                             │
    │   PAC Timeline                              │
    │                                             │
    │   Mon ──●───────────────────────────────    │
    │         │ "I'll finish the report..."       │
    │         ▼                                   │
    │   Wed ──○─────────────────────────────      │
    │         │ ⏰ Progress check scheduled       │
    │         ▼                                   │
    │   Thu ──◉─────────────────────────────      │
    │         │ 🔔 "Report due tomorrow!"         │
    │         ▼                                   │
    │   Fri ──○─────────────────────────────      │
    │         │ 📧 "Did you send to Sarah?"       │
    │                                             │
    │   AI proactively follows up on your behalf  │
    └─────────────────────────────────────────────┘`,
    ];

    return (
        <div className="relative">
            <AnimatePresence mode="wait">
                <motion.pre
                    key={frame}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xs md:text-sm font-mono leading-tight whitespace-pre"
                    style={{ color: ACCENTS.pac }}
                >
                    {frames[frame]}
                </motion.pre>
            </AnimatePresence>
            <div className="flex justify-center gap-2 mt-4">
                {[0, 1, 2].map((i) => (
                    <button
                        key={i}
                        onClick={() => setFrame(i)}
                        className={cn(
                            'w-2 h-2 rounded-full transition-all duration-300',
                            frame === i ? 'w-6' : ''
                        )}
                        style={{
                            backgroundColor: frame === i ? ACCENTS.pac : `${ACCENTS.pac}40`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

// Council Mode ASCII Animation
function CouncilASCII() {
    const [showSynthesis, setShowSynthesis] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setShowSynthesis((s) => !s);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const councilArt = `
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │   User: "Should I learn Rust or Go for my next project?"    │
    │                                                             │
    ├─────────────────────────────────────────────────────────────┤
    │                                                             │
    │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
    │   │  ◈ SCHOLAR  │    │ ★ VISIONARY │    │ ● PRAGMATIST│    │
    │   │   (GPT-4)   │    │  (Claude)   │    │  (Gemini)   │    │
    │   ├─────────────┤    ├─────────────┤    ├─────────────┤    │
    │   │ "Research   │    │ "Rust is    │    │ "For quick  │    │
    │   │ shows Rust  │    │ the future  │    │ results, Go │    │
    │   │ has 40%     │    │ of systems. │    │ ships in    │    │
    │   │ fewer bugs  │    │ Memory      │    │ half the    │    │
    │   │ in memory   │    │ safety will │    │ time. Good  │    │
    │   │ management" │    │ be key..."  │    │ ecosystem"  │    │
    │   └─────────────┘    └─────────────┘    └─────────────┘    │
    │                                                             │
    │                    ┌─────────────┐                          │
    │                    │ ◆ ADVOCATE  │                          │
    │                    │   (Llama)   │                          │
    │                    ├─────────────┤                          │
    │                    │ "Consider:  │                          │
    │                    │ What's your │                          │
    │                    │ team's      │                          │
    │                    │ existing    │                          │
    │                    │ expertise?" │                          │
    │                    └─────────────┘                          │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘`;

    const synthesisArt = `
    ╔═════════════════════════════════════════════════════════════╗
    ║                                                             ║
    ║   ◈★●◆  COUNCIL SYNTHESIS                                   ║
    ║                                                             ║
    ╠═════════════════════════════════════════════════════════════╣
    ║                                                             ║
    ║   Based on 4 perspectives, here's a balanced view:          ║
    ║                                                             ║
    ║   ┌───────────────────────────────────────────────────┐     ║
    ║   │                                                   │     ║
    ║   │  → If you prioritize SAFETY & long-term:  RUST    │     ║
    ║   │    • Memory safety, growing ecosystem             │     ║
    ║   │    • Steeper learning curve pays off              │     ║
    ║   │                                                   │     ║
    ║   │  → If you prioritize SPEED & simplicity:  GO      │     ║
    ║   │    • Faster development, easier hiring            │     ║
    ║   │    • Great for web services & CLI tools           │     ║
    ║   │                                                   │     ║
    ║   │  → KEY QUESTION: What's your deadline?            │     ║
    ║   │                                                   │     ║
    ║   └───────────────────────────────────────────────────┘     ║
    ║                                                             ║
    ║   Consensus: 3/4 recommend starting with Go, then Rust      ║
    ║                                                             ║
    ╚═════════════════════════════════════════════════════════════╝`;

    return (
        <div className="relative">
            <AnimatePresence mode="wait">
                <motion.pre
                    key={showSynthesis ? 'synthesis' : 'council'}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="text-xs md:text-sm font-mono leading-tight whitespace-pre"
                    style={{ color: ACCENTS.council }}
                >
                    {showSynthesis ? synthesisArt : councilArt}
                </motion.pre>
            </AnimatePresence>
            <div className="flex justify-center gap-4 mt-4">
                <button
                    onClick={() => setShowSynthesis(false)}
                    className={cn(
                        'px-4 py-2 rounded-full text-xs font-medium transition-all',
                        !showSynthesis ? 'bg-pink-500/20 text-pink-400' : 'text-gray-500'
                    )}
                >
                    4 Responses
                </button>
                <button
                    onClick={() => setShowSynthesis(true)}
                    className={cn(
                        'px-4 py-2 rounded-full text-xs font-medium transition-all',
                        showSynthesis ? 'bg-pink-500/20 text-pink-400' : 'text-gray-500'
                    )}
                >
                    Synthesis
                </button>
            </div>
        </div>
    );
}

// Interactive Chat Demo ASCII
function ChatDemoASCII() {
    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
    const [currentDemo, setCurrentDemo] = useState(0);
    const [isTyping, setIsTyping] = useState(false);

    const demos = [
        {
            user: "What did I tell you about my startup last week?",
            ai: `Based on your memory, last Tuesday you mentioned:

  ┌────────────────────────────────────────┐
  │ 🧠 Retrieved from memory:              │
  │                                        │
  │ • Startup name: "AeroSync"             │
  │ • Industry: Drone logistics            │
  │ • Stage: Pre-seed, seeking $500K       │
  │ • Challenge: FAA regulations           │
  │ • Next step: Pitch deck by Friday      │
  └────────────────────────────────────────┘

Would you like to continue working on that pitch deck?`
        },
        {
            user: "Remind me to call mom on Sunday",
            ai: `Got it! I've scheduled a reminder:

  ┌────────────────────────────────────────┐
  │ ⏰ PAC Reminder Created                │
  │                                        │
  │ What: Call mom                         │
  │ When: Sunday, 10:00 AM                 │
  │ How:  Push notification + in-app       │
  │                                        │
  │ I'll remind you Sunday morning.        │
  │ Want me to suggest talking points      │
  │ based on your recent conversations?    │
  └────────────────────────────────────────┘`
        },
        {
            user: "Ask council: Best database for my SaaS?",
            ai: `Querying 4 AI models simultaneously...

  ┌──────────────────────────────────────────┐
  │ ◈ Scholar:   PostgreSQL - battle-tested  │
  │ ★ Visionary: PlanetScale - the future    │
  │ ● Pragmatist: Supabase - ship faster     │
  │ ◆ Advocate:  What's your scale target?   │
  └──────────────────────────────────────────┘

  📊 Synthesis: For early-stage SaaS, Supabase
  gives you PostgreSQL + Auth + Realtime in one.
  Migrate to dedicated Postgres when you scale.`
        }
    ];

    useEffect(() => {
        const runDemo = async () => {
            setMessages([]);
            setIsTyping(false);

            await new Promise(r => setTimeout(r, 1000));

            // Show user message
            setMessages([{ role: 'user', text: demos[currentDemo].user }]);

            await new Promise(r => setTimeout(r, 800));

            // Show typing
            setIsTyping(true);

            await new Promise(r => setTimeout(r, 1500));

            // Show AI response
            setIsTyping(false);
            setMessages([
                { role: 'user', text: demos[currentDemo].user },
                { role: 'ai', text: demos[currentDemo].ai }
            ]);

            await new Promise(r => setTimeout(r, 5000));

            // Next demo
            setCurrentDemo((d) => (d + 1) % demos.length);
        };

        runDemo();
    }, [currentDemo]);

    return (
        <div className="font-mono text-sm">
            <div className="border border-gray-700 rounded-lg overflow-hidden" style={{ background: '#0d1117' }}>
                {/* Terminal Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-4 text-gray-500 text-xs">YULA Terminal — Live Demo</span>
                </div>

                {/* Chat Area */}
                <div className="p-4 min-h-[300px] space-y-4">
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                'whitespace-pre-wrap',
                                msg.role === 'user' ? 'text-green-400' : 'text-gray-300'
                            )}
                        >
                            <span className={msg.role === 'user' ? 'text-green-600' : 'text-blue-400'}>
                                {msg.role === 'user' ? '❯ ' : '◆ '}
                            </span>
                            {msg.text}
                        </motion.div>
                    ))}

                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-gray-500"
                        >
                            <span className="text-blue-400">◆ </span>
                            <span className="inline-flex gap-1">
                                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity }}>●</motion.span>
                                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}>●</motion.span>
                                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}>●</motion.span>
                            </span>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Demo selector */}
            <div className="flex justify-center gap-2 mt-4">
                {demos.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentDemo(i)}
                        className={cn(
                            'w-2 h-2 rounded-full transition-all',
                            currentDemo === i ? 'w-6 bg-white' : 'bg-gray-600'
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// MAIN LANDING PAGE
// =============================================================================

export default function LandingPage() {
    const heroRef = useRef<HTMLDivElement>(null);
    const [isNavScrolled, setIsNavScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ['start start', 'end start'],
    });

    const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

    useEffect(() => {
        const handleScroll = () => {
            setIsNavScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {/* =========================================================
                NAVIGATION
                ========================================================= */}
            <motion.header
                className={cn(
                    'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
                    isNavScrolled
                        ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50 py-4'
                        : 'bg-transparent py-6'
                )}
            >
                <nav className="container max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <YulaMonogram
                            className="w-10 h-10 transition-transform duration-300 group-hover:scale-110"
                            variant={isNavScrolled ? 'dark' : 'gold'}
                        />
                        <span
                            className={cn(
                                'text-2xl font-semibold tracking-tight transition-colors duration-300',
                                isNavScrolled ? 'text-gray-900' : 'text-white'
                            )}
                            style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                            YULA
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        {['Features', 'How It Works', 'Pricing'].map((item) => (
                            <Link
                                key={item}
                                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                                className={cn(
                                    'text-sm font-medium transition-colors duration-300',
                                    isNavScrolled
                                        ? 'text-gray-600 hover:text-gray-900'
                                        : 'text-white/70 hover:text-white'
                                )}
                            >
                                {item}
                            </Link>
                        ))}
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <Link
                            href="/login"
                            className={cn(
                                'text-sm font-medium transition-colors duration-300',
                                isNavScrolled
                                    ? 'text-gray-600 hover:text-gray-900'
                                    : 'text-white/70 hover:text-white'
                            )}
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/signup"
                            className={cn(
                                'px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300',
                                isNavScrolled
                                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                                    : 'bg-white text-gray-900 hover:bg-white/90'
                            )}
                        >
                            Get Started
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? (
                            <X size={24} className={isNavScrolled ? 'text-gray-900' : 'text-white'} />
                        ) : (
                            <div className="space-y-1.5">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            'w-6 h-0.5 transition-colors',
                                            isNavScrolled ? 'bg-gray-900' : 'bg-white'
                                        )}
                                    />
                                ))}
                            </div>
                        )}
                    </button>
                </nav>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden bg-white border-t border-gray-100"
                        >
                            <div className="container max-w-7xl mx-auto px-6 py-6 space-y-4">
                                {['Features', 'How It Works', 'Pricing'].map((item) => (
                                    <Link
                                        key={item}
                                        href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                                        className="block text-gray-600 hover:text-gray-900 font-medium"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {item}
                                    </Link>
                                ))}
                                <div className="pt-4 border-t border-gray-100 space-y-3">
                                    <Link href="/login" className="block text-gray-600 font-medium">
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="block w-full py-3 bg-gray-900 text-white text-center rounded-full font-medium"
                                    >
                                        Get Started
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.header>

            <main>
                {/* =========================================================
                    HERO SECTION
                    ========================================================= */}
                <section
                    ref={heroRef}
                    className="relative min-h-screen flex items-center justify-center overflow-hidden"
                    style={{ background: COLORS.navy }}
                >
                    <GradientMeshBackground />

                    <motion.div
                        style={{ opacity: heroOpacity, scale: heroScale }}
                        className="container max-w-6xl mx-auto px-6 py-32 relative z-10"
                    >
                        <div className="text-center space-y-8">
                            {/* Logo */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1 }}
                                className="flex justify-center mb-4"
                            >
                                <YulaLogoAnimated className="w-24 h-24 md:w-32 md:h-32" />
                            </motion.div>

                            {/* Feature Pills */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                className="flex flex-wrap items-center justify-center gap-3"
                            >
                                <FeaturePill icon={CloudArrowUp} label="Import History" color={ACCENTS.import} delay={0.4} />
                                <FeaturePill icon={Bell} label="AI Reminders" color={ACCENTS.pac} delay={0.5} />
                                <FeaturePill icon={UsersThree} label="Multi-Model" color={ACCENTS.council} delay={0.6} />
                            </motion.div>

                            {/* Headline */}
                            <div className="space-y-4">
                                <h1
                                    className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-white leading-[0.95]"
                                    style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                    <StaggeredText text="AI that truly" delay={0.5} />
                                    <br />
                                    <motion.span
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6, delay: 0.8 }}
                                        className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent"
                                    >
                                        knows you
                                    </motion.span>
                                </h1>

                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: 1 }}
                                    className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto leading-relaxed font-light"
                                >
                                    Import your ChatGPT history. Get proactive reminders.
                                    <br className="hidden md:block" />
                                    Query 4 AI models at once. One unified experience.
                                </motion.p>
                            </div>

                            {/* CTAs */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 1.2 }}
                                className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
                            >
                                <Link
                                    href="/signup"
                                    className="group relative px-8 py-4 rounded-full overflow-hidden"
                                >
                                    <div
                                        className="absolute inset-0 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <span className="relative flex items-center gap-2 text-gray-900 font-semibold">
                                        Start Free Trial
                                        <ArrowRight size={20} weight="bold" className="transition-transform group-hover:translate-x-1" />
                                    </span>
                                </Link>

                                <Link
                                    href="#demo"
                                    className="group flex items-center gap-3 px-6 py-4 text-white/80 hover:text-white transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white/40 transition-colors">
                                        <Play size={20} weight="fill" className="ml-0.5" />
                                    </div>
                                    <span className="font-medium">Watch Demo</span>
                                </Link>
                            </motion.div>

                            {/* Social Proof */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.6, delay: 1.5 }}
                                className="pt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/40"
                            >
                                {['No credit card required', '7-day free trial', 'Cancel anytime'].map((text, i) => (
                                    <span key={text} className="flex items-center gap-2">
                                        <Check size={16} weight="bold" style={{ color: COLORS.gold }} />
                                        {text}
                                    </span>
                                ))}
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Scroll Indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2 }}
                        className="absolute bottom-12 left-1/2 -translate-x-1/2"
                    >
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            className="flex flex-col items-center gap-3 text-white/40"
                        >
                            <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
                            <CaretDown size={20} />
                        </motion.div>
                    </motion.div>
                </section>

                {/* =========================================================
                    THREE CORE FEATURES
                    ========================================================= */}
                <AnimatedSection id="features" className="py-32 bg-white">
                    <div className="container max-w-7xl mx-auto px-6">
                        {/* Section Header */}
                        <div className="max-w-3xl mb-20">
                            <motion.span
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                className="text-sm font-medium tracking-widest uppercase"
                                style={{ color: COLORS.gold }}
                            >
                                Three Superpowers
                            </motion.span>
                            <h2
                                className="text-4xl md:text-6xl font-semibold tracking-tight mt-4 text-gray-900"
                                style={{ fontFamily: "'Playfair Display', serif" }}
                            >
                                What makes YULA
                                <br />
                                <span className="text-gray-400">different</span>
                            </h2>
                        </div>

                        {/* Feature Grid */}
                        <div className="grid lg:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: CloudArrowUp,
                                    color: ACCENTS.import,
                                    title: 'Import',
                                    subtitle: 'Bring Your History',
                                    description: "Don't lose your ChatGPT or Claude conversations. Import everything and keep your context alive across all AI models.",
                                    features: ['One-click ChatGPT export import', 'Claude conversation migration', 'Automatic memory extraction', 'Searchable archive'],
                                },
                                {
                                    icon: Bell,
                                    color: ACCENTS.pac,
                                    title: 'PAC',
                                    subtitle: 'Proactive AI Callbacks',
                                    description: 'AI that reaches out to you. YULA detects commitments in your conversations and sends intelligent reminders.',
                                    features: ['Detects commitments automatically', 'Smart reminder scheduling', 'Push & email notifications', 'Never forget follow-ups'],
                                },
                                {
                                    icon: UsersThree,
                                    color: ACCENTS.council,
                                    title: 'Council',
                                    subtitle: 'Multi-Model Wisdom',
                                    description: 'Ask 4 AI models the same question simultaneously. Get diverse perspectives, make better decisions.',
                                    features: ['4 AI personas respond in parallel', 'GPT-4, Claude, Gemini & more', 'Compare different perspectives', 'AI-generated synthesis'],
                                },
                            ].map((feature, i) => (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 40 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: i * 0.1 }}
                                    className="group"
                                >
                                    <div className="h-full p-8 md:p-10 rounded-3xl bg-gray-50 border border-gray-100 transition-all duration-500 hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-200">
                                        {/* Icon */}
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                                            style={{ backgroundColor: `${feature.color}15` }}
                                        >
                                            <feature.icon size={28} weight="duotone" style={{ color: feature.color }} />
                                        </div>

                                        {/* Label */}
                                        <span
                                            className="text-xs font-semibold tracking-widest uppercase"
                                            style={{ color: feature.color }}
                                        >
                                            {feature.subtitle}
                                        </span>

                                        {/* Title */}
                                        <h3
                                            className="text-3xl font-semibold mt-2 mb-4 text-gray-900"
                                            style={{ fontFamily: "'Playfair Display', serif" }}
                                        >
                                            {feature.title}
                                        </h3>

                                        {/* Description */}
                                        <p className="text-gray-500 leading-relaxed mb-8">
                                            {feature.description}
                                        </p>

                                        {/* Feature List */}
                                        <ul className="space-y-3">
                                            {feature.features.map((f, j) => (
                                                <li key={j} className="flex items-center gap-3 text-sm text-gray-600">
                                                    <div
                                                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                                        style={{ backgroundColor: `${feature.color}15` }}
                                                    >
                                                        <Check size={12} weight="bold" style={{ color: feature.color }} />
                                                    </div>
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* =========================================================
                    LIVE DEMO - Interactive Chat Terminal
                    ========================================================= */}
                <AnimatedSection id="demo" className="py-32" style={{ background: COLORS.navy }}>
                    <div className="container max-w-6xl mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            {/* Left: Text */}
                            <div>
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    className="text-sm font-medium tracking-widest uppercase"
                                    style={{ color: COLORS.gold }}
                                >
                                    Try It Live
                                </motion.span>
                                <h2
                                    className="text-4xl md:text-5xl font-semibold tracking-tight mt-4 text-white leading-tight"
                                    style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                    AI that remembers
                                    <br />
                                    <span className="text-white/40">everything</span>
                                </h2>
                                <p className="text-lg text-white/50 mt-6 leading-relaxed">
                                    Watch how YULA recalls your past conversations, schedules reminders, and queries multiple AI models. This isn't a mockup — it's how YULA actually works.
                                </p>
                                <div className="mt-8 space-y-3">
                                    {[
                                        'Ask about past conversations',
                                        'Set intelligent reminders',
                                        'Query 4 AI models at once',
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 text-white/60">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.gold }} />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Terminal Demo */}
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                            >
                                <ChatDemoASCII />
                            </motion.div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* =========================================================
                    IMPORT FLOW - ASCII Visualization
                    ========================================================= */}
                <AnimatedSection className="py-32 bg-white">
                    <div className="container max-w-6xl mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            {/* Left: ASCII */}
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                                className="order-2 lg:order-1 bg-gray-900 rounded-2xl p-8 overflow-x-auto"
                            >
                                <ImportFlowASCII />
                            </motion.div>

                            {/* Right: Text */}
                            <div className="order-1 lg:order-2">
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    className="text-sm font-medium tracking-widest uppercase"
                                    style={{ color: ACCENTS.import }}
                                >
                                    Import Feature
                                </motion.span>
                                <h2
                                    className="text-4xl md:text-5xl font-semibold tracking-tight mt-4 text-gray-900 leading-tight"
                                    style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                    Your 847 chats.
                                    <br />
                                    <span className="text-gray-400">2 minutes.</span>
                                </h2>
                                <p className="text-lg text-gray-500 mt-6 leading-relaxed">
                                    Export your ChatGPT or Claude history with one click. Drop the file into YULA. We'll parse every conversation, extract memories, and make your entire AI history searchable.
                                </p>
                                <div className="mt-8 grid grid-cols-2 gap-4">
                                    {[
                                        { value: '847', label: 'Conversations imported' },
                                        { value: '156', label: 'Memories extracted' },
                                        { value: '23', label: 'Projects detected' },
                                        { value: '2:14', label: 'Minutes to import' },
                                    ].map((stat, i) => (
                                        <div key={i} className="p-4 rounded-xl bg-gray-50">
                                            <div className="text-2xl font-semibold" style={{ color: ACCENTS.import }}>
                                                {stat.value}
                                            </div>
                                            <div className="text-sm text-gray-500">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* =========================================================
                    PAC SHOWCASE - Proactive AI
                    ========================================================= */}
                <AnimatedSection className="py-32" style={{ background: COLORS.cream }}>
                    <div className="container max-w-6xl mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            {/* Left: Text */}
                            <div>
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    className="text-sm font-medium tracking-widest uppercase"
                                    style={{ color: ACCENTS.pac }}
                                >
                                    PAC Feature
                                </motion.span>
                                <h2
                                    className="text-4xl md:text-5xl font-semibold tracking-tight mt-4 text-gray-900 leading-tight"
                                    style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                    AI that texts
                                    <br />
                                    <span className="text-gray-400">you back</span>
                                </h2>
                                <p className="text-lg text-gray-500 mt-6 leading-relaxed">
                                    Proactive AI Callbacks detect commitments in your conversations. "I'll do it tomorrow" becomes a real reminder. YULA follows up so you never forget.
                                </p>
                                <div className="mt-8 space-y-4">
                                    {[
                                        { icon: '🎯', text: 'Detects "I\'ll do X by Y" automatically' },
                                        { icon: '📱', text: 'Push, email, or in-app notifications' },
                                        { icon: '🔄', text: 'Smart follow-ups after deadlines' },
                                        { icon: '⏰', text: 'Snooze or reschedule with one tap' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <span className="text-2xl">{item.icon}</span>
                                            <span className="text-gray-600">{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: ASCII */}
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                                className="bg-gray-900 rounded-2xl p-8 overflow-x-auto"
                            >
                                <PACNotificationASCII />
                            </motion.div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* =========================================================
                    COUNCIL MODE - Multi-Model
                    ========================================================= */}
                <AnimatedSection className="py-32 bg-white">
                    <div className="container max-w-6xl mx-auto px-6">
                        {/* Header */}
                        <div className="text-center mb-16">
                            <motion.span
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                className="text-sm font-medium tracking-widest uppercase"
                                style={{ color: ACCENTS.council }}
                            >
                                Council Feature
                            </motion.span>
                            <h2
                                className="text-4xl md:text-5xl font-semibold tracking-tight mt-4 text-gray-900"
                                style={{ fontFamily: "'Playfair Display', serif" }}
                            >
                                4 minds. One answer.
                            </h2>
                            <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">
                                Why ask one AI when you can ask four? Council queries GPT-4, Claude, Gemini, and Llama simultaneously, then synthesizes their perspectives.
                            </p>
                        </div>

                        {/* ASCII Visual */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="bg-gray-900 rounded-2xl p-8 overflow-x-auto max-w-4xl mx-auto"
                        >
                            <CouncilASCII />
                        </motion.div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-4xl mx-auto">
                            {[
                                { value: '4', label: 'AI Models' },
                                { value: '<3s', label: 'Total Response' },
                                { value: '∞', label: 'Perspectives' },
                                { value: '1', label: 'Synthesized Answer' },
                            ].map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div
                                        className="text-4xl font-semibold"
                                        style={{ color: ACCENTS.council, fontFamily: "'Playfair Display', serif" }}
                                    >
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* =========================================================
                    HOW IT WORKS
                    ========================================================= */}
                <AnimatedSection id="how-it-works" className="py-32" style={{ background: COLORS.cream }}>
                    <div className="container max-w-6xl mx-auto px-6">
                        {/* Section Header */}
                        <div className="text-center mb-20">
                            <motion.span
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                className="text-sm font-medium tracking-widest uppercase"
                                style={{ color: COLORS.gold }}
                            >
                                Simple Setup
                            </motion.span>
                            <h2
                                className="text-4xl md:text-6xl font-semibold tracking-tight mt-4 text-gray-900"
                                style={{ fontFamily: "'Playfair Display', serif" }}
                            >
                                Up and running
                                <br />
                                <span className="text-gray-400">in minutes</span>
                            </h2>
                        </div>

                        {/* Steps */}
                        <div className="grid md:grid-cols-4 gap-8">
                            {[
                                { step: '01', title: 'Sign Up', description: 'Create your free account. No credit card needed.', icon: Sparkle },
                                { step: '02', title: 'Import', description: 'Upload your ChatGPT or Claude export files.', icon: CloudArrowUp },
                                { step: '03', title: 'Chat', description: 'Continue conversations with full context.', icon: Lightning },
                                { step: '04', title: 'Evolve', description: 'Get proactive reminders and multi-model insights.', icon: Brain },
                            ].map((item, i) => (
                                <motion.div
                                    key={item.step}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                    className="relative"
                                >
                                    {/* Connector Line */}
                                    {i < 3 && (
                                        <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-40px)] h-px bg-gradient-to-r from-gray-300 to-transparent" />
                                    )}

                                    <div className="text-center">
                                        {/* Step Number */}
                                        <span
                                            className="text-6xl font-light"
                                            style={{ color: COLORS.gold, fontFamily: "'Playfair Display', serif" }}
                                        >
                                            {item.step}
                                        </span>

                                        {/* Icon */}
                                        <div className="w-16 h-16 mx-auto mt-4 mb-4 rounded-2xl bg-white shadow-lg shadow-gray-200/50 flex items-center justify-center">
                                            <item.icon size={28} weight="duotone" className="text-gray-700" />
                                        </div>

                                        {/* Content */}
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                                        <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* =========================================================
                    COMPARISON SECTION
                    ========================================================= */}
                <AnimatedSection className="py-32 bg-white">
                    <div className="container max-w-4xl mx-auto px-6">
                        {/* Section Header */}
                        <div className="text-center mb-16">
                            <motion.span
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                className="text-sm font-medium tracking-widest uppercase"
                                style={{ color: COLORS.gold }}
                            >
                                Why Switch
                            </motion.span>
                            <h2
                                className="text-4xl md:text-6xl font-semibold tracking-tight mt-4 text-gray-900"
                                style={{ fontFamily: "'Playfair Display', serif" }}
                            >
                                YULA vs. others
                            </h2>
                        </div>

                        {/* Comparison Table */}
                        <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="py-5 px-6 text-left text-sm font-medium text-gray-500">Feature</th>
                                        <th className="py-5 px-6 text-center">
                                            <span
                                                className="text-lg font-semibold"
                                                style={{ color: COLORS.gold, fontFamily: "'Playfair Display', serif" }}
                                            >
                                                YULA
                                            </span>
                                        </th>
                                        <th className="py-5 px-6 text-center text-sm font-medium text-gray-400">Others</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { feature: 'Import ChatGPT/Claude history', yula: true, others: false },
                                        { feature: 'Proactive AI reminders', yula: true, others: false },
                                        { feature: 'Multi-model parallel queries', yula: '4 models', others: '1 model' },
                                        { feature: 'Persistent memory', yula: true, others: 'Limited' },
                                        { feature: 'Export your data', yula: true, others: 'Varies' },
                                        { feature: 'Model switching', yula: 'Instant', others: 'Per chat' },
                                    ].map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 last:border-0">
                                            <td className="py-5 px-6 text-sm font-medium text-gray-700">{row.feature}</td>
                                            <td className="py-5 px-6 text-center">
                                                {typeof row.yula === 'boolean' ? (
                                                    row.yula ? (
                                                        <div
                                                            className="w-6 h-6 rounded-full mx-auto flex items-center justify-center"
                                                            style={{ backgroundColor: `${COLORS.gold}20` }}
                                                        >
                                                            <Check size={14} weight="bold" style={{ color: COLORS.gold }} />
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )
                                                ) : (
                                                    <span className="text-sm font-medium" style={{ color: COLORS.gold }}>{row.yula}</span>
                                                )}
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                {typeof row.others === 'boolean' ? (
                                                    row.others ? (
                                                        <div className="w-6 h-6 rounded-full mx-auto bg-gray-100 flex items-center justify-center">
                                                            <Check size={14} weight="bold" className="text-gray-400" />
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )
                                                ) : (
                                                    <span className="text-sm text-gray-400">{row.others}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </AnimatedSection>

                {/* =========================================================
                    STATS SECTION
                    ========================================================= */}
                <AnimatedSection className="py-24" style={{ background: COLORS.navy }}>
                    <div className="container max-w-6xl mx-auto px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                            {[
                                { value: '12+', label: 'AI Models' },
                                { value: '<100ms', label: 'Response Time' },
                                { value: '99.9%', label: 'Uptime' },
                                { value: '5', label: 'Languages' },
                            ].map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                    className="text-center"
                                >
                                    <div
                                        className="text-4xl md:text-5xl font-semibold mb-2"
                                        style={{ color: COLORS.gold, fontFamily: "'Playfair Display', serif" }}
                                    >
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-white/40 font-medium tracking-wider uppercase">
                                        {stat.label}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* =========================================================
                    ADDITIONAL FEATURES
                    ========================================================= */}
                <AnimatedSection className="py-32 bg-white">
                    <div className="container max-w-6xl mx-auto px-6">
                        {/* Section Header */}
                        <div className="text-center mb-20">
                            <motion.span
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                className="text-sm font-medium tracking-widest uppercase"
                                style={{ color: COLORS.gold }}
                            >
                                And More
                            </motion.span>
                            <h2
                                className="text-4xl md:text-6xl font-semibold tracking-tight mt-4 text-gray-900"
                                style={{ fontFamily: "'Playfair Display', serif" }}
                            >
                                Everything you need
                            </h2>
                        </div>

                        {/* Features Grid */}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { icon: Brain, title: 'Persistent Memory', description: 'AI that remembers your preferences, projects, and context across all conversations.' },
                                { icon: Microphone, title: 'Voice Mode', description: 'Natural voice conversations with real-time transcription and synthesis.' },
                                { icon: Lightning, title: 'Model Switching', description: 'Switch between GPT-4, Claude, Gemini instantly without losing context.' },
                                { icon: ShieldCheck, title: 'Privacy First', description: 'Your data is encrypted and never used to train AI models.' },
                                { icon: ArrowUpRight, title: 'Export Anytime', description: 'Your conversations are yours. Export everything at any time.' },
                                { icon: Sparkle, title: 'Multilingual', description: 'Full support for English, Turkish, Spanish, French, and German.' },
                            ].map((feature, i) => (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: i * 0.05 }}
                                    className="group p-6 rounded-2xl hover:bg-gray-50 transition-colors duration-300 cursor-pointer"
                                >
                                    <feature.icon size={28} weight="duotone" className="text-gray-400 mb-4 transition-colors group-hover:text-gray-700" />
                                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
                                    <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* =========================================================
                    PRICING SECTION
                    ========================================================= */}
                <AnimatedSection id="pricing" className="py-32" style={{ background: COLORS.cream }}>
                    <div className="container max-w-5xl mx-auto px-6">
                        {/* Section Header */}
                        <div className="text-center mb-20">
                            <motion.span
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                className="text-sm font-medium tracking-widest uppercase"
                                style={{ color: COLORS.gold }}
                            >
                                Simple Pricing
                            </motion.span>
                            <h2
                                className="text-4xl md:text-6xl font-semibold tracking-tight mt-4 text-gray-900"
                                style={{ fontFamily: "'Playfair Display', serif" }}
                            >
                                Start free, scale
                                <br />
                                <span className="text-gray-400">as you grow</span>
                            </h2>
                        </div>

                        {/* Pricing Cards */}
                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Starter */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="p-8 rounded-3xl bg-white border border-gray-200"
                            >
                                <div className="mb-8">
                                    <h3 className="text-xl font-semibold text-gray-900">Starter</h3>
                                    <p className="text-sm text-gray-500 mt-1">For trying YULA</p>
                                    <div className="mt-6">
                                        <span
                                            className="text-5xl font-semibold text-gray-900"
                                            style={{ fontFamily: "'Playfair Display', serif" }}
                                        >
                                            $0
                                        </span>
                                        <span className="text-gray-400 ml-2">/mo</span>
                                    </div>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    {['100 chats/month', '1 AI model', 'Basic memory', 'Import up to 50 chats'].map((f) => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                                            <Check size={16} weight="bold" className="text-gray-400" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/signup"
                                    className="block w-full py-3.5 text-center rounded-full border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Get Started
                                </Link>
                            </motion.div>

                            {/* Pro - Featured */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="relative p-8 rounded-3xl text-white md:-translate-y-4"
                                style={{ background: COLORS.navy }}
                            >
                                {/* Popular Badge */}
                                <div
                                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase"
                                    style={{ background: COLORS.gold, color: COLORS.navy }}
                                >
                                    Most Popular
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-xl font-semibold">Pro</h3>
                                    <p className="text-sm text-white/50 mt-1">Your daily AI companion</p>
                                    <div className="mt-6">
                                        <span
                                            className="text-5xl font-semibold"
                                            style={{ fontFamily: "'Playfair Display', serif" }}
                                        >
                                            $20
                                        </span>
                                        <span className="text-white/40 ml-2">/mo</span>
                                    </div>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    {['1,500 chats/month', 'All AI models', 'Advanced memory', 'Unlimited import', 'PAC reminders', 'Council (2 models)', 'Voice mode'].map((f) => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                                            <Check size={16} weight="bold" style={{ color: COLORS.gold }} />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/signup?tier=pro"
                                    className="block w-full py-3.5 text-center rounded-full font-semibold transition-all duration-300 hover:scale-[1.02]"
                                    style={{ background: COLORS.gold, color: COLORS.navy }}
                                >
                                    Upgrade to Pro
                                </Link>
                            </motion.div>

                            {/* Ultra */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 }}
                                className="p-8 rounded-3xl bg-white border border-gray-200"
                            >
                                <div className="mb-8">
                                    <h3 className="text-xl font-semibold text-gray-900">Ultra</h3>
                                    <p className="text-sm text-gray-500 mt-1">For power users</p>
                                    <div className="mt-6">
                                        <span
                                            className="text-5xl font-semibold text-gray-900"
                                            style={{ fontFamily: "'Playfair Display', serif" }}
                                        >
                                            $50
                                        </span>
                                        <span className="text-gray-400 ml-2">/mo</span>
                                    </div>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    {['5,000+ chats/month', 'All models + experimental', 'Council (4 models)', 'API access', 'Custom integrations', 'Priority support'].map((f) => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                                            <Check size={16} weight="bold" className="text-gray-400" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/signup?tier=ultra"
                                    className="block w-full py-3.5 text-center rounded-full border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Go Ultra
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* =========================================================
                    FAQ SECTION
                    ========================================================= */}
                <AnimatedSection id="faq" className="py-32 bg-white">
                    <div className="container max-w-3xl mx-auto px-6">
                        {/* Section Header */}
                        <div className="text-center mb-16">
                            <motion.span
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                className="text-sm font-medium tracking-widest uppercase"
                                style={{ color: COLORS.gold }}
                            >
                                FAQ
                            </motion.span>
                            <h2
                                className="text-4xl md:text-6xl font-semibold tracking-tight mt-4 text-gray-900"
                                style={{ fontFamily: "'Playfair Display', serif" }}
                            >
                                Common questions
                            </h2>
                        </div>

                        {/* FAQ Items */}
                        <div className="space-y-4">
                            {[
                                {
                                    q: 'How do I import my ChatGPT history?',
                                    a: "Go to ChatGPT Settings → Data Controls → Export Data. Download the ZIP file, then upload it to YULA's Import page. We'll automatically parse your conversations and extract memories.",
                                },
                                {
                                    q: 'What are PAC reminders?',
                                    a: 'PAC (Proactive AI Callbacks) automatically detects commitments in your conversations like "I\'ll do this tomorrow" and creates smart reminders. You\'ll get notifications via push, email, or in-app.',
                                },
                                {
                                    q: 'How does Council work?',
                                    a: 'Council lets you ask up to 4 AI models the same question simultaneously. Each responds with a different perspective. You can then choose the best response or get an AI-generated synthesis.',
                                },
                                {
                                    q: 'Is my data safe?',
                                    a: "Yes. All data is encrypted at rest and in transit. Your conversations are never used to train AI models. You can export or delete your data at any time. We're GDPR compliant.",
                                },
                                {
                                    q: 'Can I cancel anytime?',
                                    a: "Yes! You can cancel your subscription at any time. You'll keep access until the end of your billing period. No questions asked.",
                                },
                            ].map((item, i) => (
                                <motion.details
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group rounded-2xl border border-gray-200 overflow-hidden"
                                >
                                    <summary className="flex items-center justify-between p-6 cursor-pointer font-medium text-gray-900 hover:bg-gray-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                        <span>{item.q}</span>
                                        <CaretDown
                                            size={20}
                                            className="text-gray-400 transition-transform group-open:rotate-180"
                                        />
                                    </summary>
                                    <div className="px-6 pb-6 text-gray-500 leading-relaxed">
                                        {item.a}
                                    </div>
                                </motion.details>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* =========================================================
                    FINAL CTA SECTION
                    ========================================================= */}
                <AnimatedSection className="py-32 relative overflow-hidden" style={{ background: COLORS.navy }}>
                    <GradientMeshBackground />

                    <div className="container max-w-4xl mx-auto px-6 text-center relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-8"
                        >
                            <h2
                                className="text-4xl md:text-6xl font-semibold tracking-tight text-white"
                                style={{ fontFamily: "'Playfair Display', serif" }}
                            >
                                Ready to transform
                                <br />
                                your AI experience?
                            </h2>
                            <p className="text-xl text-white/50 max-w-xl mx-auto">
                                Join thousands who've upgraded from ChatGPT.
                                Start free, no credit card required.
                            </p>
                            <div className="pt-4">
                                <Link
                                    href="/signup"
                                    className="group inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-lg transition-all duration-300 hover:scale-[1.02]"
                                    style={{ background: COLORS.gold, color: COLORS.navy }}
                                >
                                    Get Started Free
                                    <ArrowRight size={22} weight="bold" className="transition-transform group-hover:translate-x-1" />
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </AnimatedSection>
            </main>

            {/* =========================================================
                FOOTER
                ========================================================= */}
            <footer className="py-20 bg-white border-t border-gray-100">
                <div className="container max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-5 gap-12 mb-16">
                        {/* Brand */}
                        <div className="md:col-span-2">
                            <Link href="/" className="flex items-center gap-3 mb-6">
                                <YulaMonogram className="w-10 h-10" variant="dark" />
                                <span
                                    className="text-2xl font-semibold tracking-tight text-gray-900"
                                    style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                    YULA
                                </span>
                            </Link>
                            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                                Your Universal Learning Assistant.
                                AI that remembers, anticipates, and evolves with you.
                            </p>
                        </div>

                        {/* Links */}
                        {[
                            { title: 'Product', links: ['Features', 'Pricing', 'Import', 'Chat'] },
                            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
                            { title: 'Legal', links: ['Privacy', 'Terms', 'Cookies'] },
                        ].map((section) => (
                            <div key={section.title}>
                                <h4 className="font-semibold text-gray-900 mb-4">{section.title}</h4>
                                <ul className="space-y-3">
                                    {section.links.map((link) => (
                                        <li key={link}>
                                            <Link
                                                href={`/${link.toLowerCase()}`}
                                                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                                            >
                                                {link}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Bottom */}
                    <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-gray-100">
                        <p className="text-sm text-gray-400">
                            © 2026 YULA. All rights reserved.
                        </p>
                        <div className="flex items-center gap-4 mt-4 md:mt-0">
                            {['GitHub', 'X', 'LinkedIn'].map((social) => (
                                <Link
                                    key={social}
                                    href="#"
                                    className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    {social}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
