/**
 * Aspendos Design Tokens
 *
 * Comprehensive design system extracted from aspendos_frontend.md
 *
 * Constraints:
 * - No gradients
 * - No pure #000000 or #ffffff
 * - Primary: grayscale / off-white / zinc / slate, light theme first
 * - Typography: Instrument Serif (headings), Inter (body), Berkeley Mono (code)
 * - Icons: Phosphor (UI), Isometric (hero/features)
 */

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
    // ---------------------------------------------------------------------------
    // Zinc Grayscale (Primary neutral palette)
    // ---------------------------------------------------------------------------
    zinc: {
        50: '#fafafa', // Lightest - backgrounds, empty states
        100: '#f4f4f5', // Card backgrounds, hover states
        200: '#e4e4e7', // Borders, dividers, disabled elements
        300: '#d4d4d8', // Subtle borders, secondary dividers
        400: '#a1a1a6', // Secondary text, inactive icons
        500: '#71717a', // Secondary headings, muted text
        600: '#52525b', // Body text, primary icons
        700: '#3f3f46', // Strong text, primary headings
        800: '#27272a', // Dark headings, emphasis
        900: '#18181b', // Darkest text - high contrast
        950: '#09090b', // Near-black (dark mode background)
    },

    // ---------------------------------------------------------------------------
    // Slate Tweaks (Accessibility adjustments)
    // ---------------------------------------------------------------------------
    slate: {
        50: '#f8fafc', // Very subtle warm white
        600: '#475569', // Slightly warmer than zinc-600
        900: '#0f172a', // Not pure black, slightly blue-tinted
    },

    // ---------------------------------------------------------------------------
    // Semantic Colors (Status, interaction, feedback - NO gradients, solid only)
    // ---------------------------------------------------------------------------
    semantic: {
        success: {
            primary: '#10b981', // emerald-500
            light: '#d1fae5', // emerald-100
            dark: '#059669', // emerald-600
        },
        warning: {
            primary: '#f59e0b', // amber-500
            light: '#fef3c7', // amber-100
            dark: '#d97706', // amber-600
        },
        error: {
            primary: '#ef4444', // red-500
            light: '#fee2e2', // red-100
            dark: '#dc2626', // red-600
        },
        info: {
            primary: '#3b82f6', // blue-500
            light: '#dbeafe', // blue-100
            dark: '#1d4ed8', // blue-600
        },
        focus: '#0ea5e9', // cyan-500 - focus states, interactive elements
    },

    // ---------------------------------------------------------------------------
    // Model Provider Accent Colors
    // ---------------------------------------------------------------------------
    modelProviders: {
        openai: {
            primary: '#10a37f', // Official teal
            background: '#f0fdf9',
        },
        anthropic: {
            primary: '#d4a574', // Warm brown, professional
            background: '#faf9f7',
        },
        google: {
            primary: '#3f3f46', // zinc-700, neutral
            background: '#f9fafb',
        },
        xai: {
            primary: '#52525b', // zinc-600, neutral
            background: '#f4f4f5',
        },
        openrouter: {
            primary: '#71717a', // zinc-500, neutral
            background: '#f9fafb',
        },
        meta: {
            primary: '#f59e0b', // amber-500, YULA brand
            background: '#fffbeb',
        },
        mistral: {
            primary: '#06b6d4', // cyan-500
            background: '#f0fdfa',
        },
    },

    // ---------------------------------------------------------------------------
    // Theme-Aware Semantic Tokens
    // ---------------------------------------------------------------------------
    light: {
        background: '#fafafa', // zinc-50
        surface: '#ffffff', // Off-white (not pure #fff in practice, use zinc-50)
        surfaceSecondary: '#f4f4f5', // zinc-100
        textPrimary: '#18181b', // zinc-900
        textSecondary: '#52525b', // zinc-600
        textMuted: '#71717a', // zinc-500
        border: '#e4e4e7', // zinc-200
        borderSubtle: '#f4f4f5', // zinc-100
        shadow: 'rgba(0, 0, 0, 0.1)',
    },
    dark: {
        background: '#09090b', // zinc-950
        surface: '#18181b', // zinc-900
        surfaceSecondary: '#27272a', // zinc-800
        textPrimary: '#fafafa', // zinc-50
        textSecondary: '#a1a1a6', // zinc-400
        textMuted: '#71717a', // zinc-500
        border: '#3f3f46', // zinc-700
        borderSubtle: '#27272a', // zinc-800
        shadow: 'rgba(0, 0, 0, 0.4)',
    },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
    // ---------------------------------------------------------------------------
    // Font Families
    // ---------------------------------------------------------------------------
    fontFamily: {
        serif: "'Instrument Serif', Georgia, serif",
        sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        mono: "'Berkeley Mono', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
        display: "'DM Sans', 'Satoshi', 'Inter', sans-serif", // Brand accents
    },

    // ---------------------------------------------------------------------------
    // Font Weights
    // ---------------------------------------------------------------------------
    fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },

    // ---------------------------------------------------------------------------
    // Type Scale (1.125x - minor third interval)
    // ---------------------------------------------------------------------------
    fontSize: {
        // Display sizes
        d1: '3.5rem', // 56px
        d2: '3rem', // 48px
        // Heading sizes
        h1: '2.25rem', // 36px
        h2: '1.75rem', // 28px
        h3: '1.5rem', // 24px
        h4: '1.25rem', // 20px
        // Body sizes
        bodyLg: '1.125rem', // 18px
        body: '1rem', // 16px
        bodySm: '0.875rem', // 14px
        // Label sizes
        labelLg: '0.875rem', // 14px
        label: '0.75rem', // 12px
        // Code sizes
        code: '0.8125rem', // 13px
        codeInline: '0.875rem', // 14px
    },

    // ---------------------------------------------------------------------------
    // Line Heights
    // ---------------------------------------------------------------------------
    lineHeight: {
        tight: 1.2, // Display, H1, H2
        snug: 1.3, // H3
        normal: 1.4, // H4, labels
        relaxed: 1.5, // Body small
        loose: 1.6, // Body, code
    },

    // ---------------------------------------------------------------------------
    // Letter Spacing
    // ---------------------------------------------------------------------------
    letterSpacing: {
        tighter: '-0.02em', // D1
        tight: '-0.015em', // D2
        normal: '-0.01em', // H1
        wide: '0.5px', // Labels (uppercase)
    },

    // ---------------------------------------------------------------------------
    // Complete Text Styles
    // ---------------------------------------------------------------------------
    textStyles: {
        d1: {
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: '3.5rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
        },
        d2: {
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: '3rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.015em',
        },
        h1: {
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: '2.25rem',
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
        },
        h2: {
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: '1.75rem',
            fontWeight: 600,
            lineHeight: 1.3,
        },
        h3: {
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: '1.5rem',
            fontWeight: 400,
            lineHeight: 1.3,
        },
        h4: {
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        bodyLarge: {
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.125rem',
            fontWeight: 400,
            lineHeight: 1.6,
        },
        body: {
            fontFamily: "'Inter', sans-serif",
            fontSize: '1rem',
            fontWeight: 400,
            lineHeight: 1.6,
        },
        bodySmall: {
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            fontWeight: 400,
            lineHeight: 1.5,
        },
        label: {
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            fontWeight: 500,
            lineHeight: 1.4,
            letterSpacing: '0.5px',
            textTransform: 'uppercase' as const,
        },
        labelSmall: {
            fontFamily: "'Berkeley Mono', monospace",
            fontSize: '0.75rem',
            fontWeight: 500,
            lineHeight: 1.4,
            letterSpacing: '0.5px',
        },
        code: {
            fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
            fontSize: '0.8125rem',
            fontWeight: 400,
            lineHeight: 1.6,
        },
        codeInline: {
            fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
            fontSize: '0.875rem',
            fontWeight: 400,
        },
    },
} as const;

// =============================================================================
// SPACING (Tailwind conventions, 8px base unit)
// =============================================================================

export const spacing = {
    0: '0px',
    0.5: '2px', // 0.125rem - micro-interactions
    1: '4px', // 0.25rem - tight
    1.5: '6px', // 0.375rem
    2: '8px', // 0.5rem - default small
    2.5: '10px', // 0.625rem
    3: '12px', // 0.75rem - component internal
    3.5: '14px', // 0.875rem
    4: '16px', // 1rem - primary spacing
    5: '20px', // 1.25rem - section spacing
    6: '24px', // 1.5rem - larger section
    7: '28px', // 1.75rem
    8: '32px', // 2rem - page sections
    9: '36px', // 2.25rem
    10: '40px', // 2.5rem - major sections
    11: '44px', // 2.75rem
    12: '48px', // 3rem - hero sections
    14: '56px', // 3.5rem
    16: '64px', // 4rem - page padding
    20: '80px', // 5rem - large breathing room
    24: '96px', // 6rem - hero padding
    28: '112px', // 7rem
    32: '128px', // 8rem
    36: '144px', // 9rem
    40: '160px', // 10rem
    44: '176px', // 11rem
    48: '192px', // 12rem
    52: '208px', // 13rem
    56: '224px', // 14rem
    60: '240px', // 15rem
    64: '256px', // 16rem
    72: '288px', // 18rem
    80: '320px', // 20rem
    96: '384px', // 24rem
} as const;

// Spacing as rem values
export const spacingRem = {
    0: '0rem',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    11: '2.75rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
    none: '0px',
    xs: '2px', // 0.125rem
    sm: '4px', // 0.25rem - inline code, small elements
    md: '6px', // 0.375rem - tags
    DEFAULT: '8px', // 0.5rem - buttons, inputs, cards
    lg: '12px', // 0.75rem - cards
    xl: '16px', // 1rem - modals, sheets
    '2xl': '24px', // 1.5rem - large cards
    full: '9999px', // Pill shapes, badges
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
    // Light mode shadows
    light: {
        none: 'none',
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        // Specific use-case shadows
        card: '0 1px 3px rgba(0, 0, 0, 0.1)',
        cardHover: '0 4px 12px rgba(0, 0, 0, 0.12)',
        elevated: '0 4px 12px rgba(0, 0, 0, 0.12)',
        elevatedHover: '0 6px 16px rgba(0, 0, 0, 0.15)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    },
    // Dark mode shadows (more prominent)
    dark: {
        none: 'none',
        sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
        DEFAULT: '0 2px 8px rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        card: '0 2px 8px rgba(0, 0, 0, 0.3)',
        cardHover: '0 4px 16px rgba(0, 0, 0, 0.4)',
        elevated: '0 4px 16px rgba(0, 0, 0, 0.35)',
        elevatedHover: '0 8px 24px rgba(0, 0, 0, 0.45)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
    },
} as const;

// =============================================================================
// BREAKPOINTS (Responsive design)
// =============================================================================

export const breakpoints = {
    xs: '375px', // Mobile portrait
    sm: '640px', // Mobile landscape
    md: '768px', // Tablet
    lg: '1024px', // Large tablet / smaller desktop
    xl: '1280px', // Desktop
    '2xl': '1536px', // Large desktop
} as const;

// Media query helpers
export const mediaQueries = {
    xs: `@media (min-width: ${breakpoints.xs})`,
    sm: `@media (min-width: ${breakpoints.sm})`,
    md: `@media (min-width: ${breakpoints.md})`,
    lg: `@media (min-width: ${breakpoints.lg})`,
    xl: `@media (min-width: ${breakpoints.xl})`,
    '2xl': `@media (min-width: ${breakpoints['2xl']})`,
    // Max-width queries
    xsMax: `@media (max-width: ${breakpoints.xs})`,
    smMax: `@media (max-width: ${breakpoints.sm})`,
    mdMax: `@media (max-width: ${breakpoints.md})`,
    lgMax: `@media (max-width: ${breakpoints.lg})`,
    xlMax: `@media (max-width: ${breakpoints.xl})`,
    // Special queries
    reducedMotion: '@media (prefers-reduced-motion: reduce)',
    dark: '@media (prefers-color-scheme: dark)',
    light: '@media (prefers-color-scheme: light)',
} as const;

// =============================================================================
// ANIMATION & TRANSITIONS
// =============================================================================

export const animation = {
    // Durations
    duration: {
        fastest: '75ms',
        faster: '100ms',
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
        slower: '400ms',
        slowest: '500ms',
    },
    // Easing functions
    easing: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material standard
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)', // Entrance
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)', // Exit
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)', // Continuous
        linear: 'linear',
    },
    // Pre-composed transitions
    transition: {
        fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
        slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
        colors: 'color 200ms, background-color 200ms, border-color 200ms',
        opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
} as const;

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

export const zIndex = {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
} as const;

// =============================================================================
// ICON SIZES
// =============================================================================

export const iconSize = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48,
    '2xl': 64,
} as const;

// =============================================================================
// COMPONENT TOKENS
// =============================================================================

export const components = {
    button: {
        padding: {
            sm: { x: '8px', y: '6px' },
            md: { x: '12px', y: '10px' },
            lg: { x: '16px', y: '14px' },
        },
        height: {
            sm: '32px',
            md: '40px',
            lg: '48px',
        },
        minTouchTarget: '44px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 500,
    },
    input: {
        height: '44px',
        padding: { x: '16px', y: '12px' },
        borderRadius: '8px',
        fontSize: '16px',
        borderWidth: '1px',
    },
    card: {
        padding: '24px',
        paddingMobile: '20px',
        borderRadius: '12px',
        borderWidth: '1px',
    },
    modal: {
        padding: { desktop: '32px', mobile: '24px' },
        borderRadius: '16px',
        maxWidth: { standard: '500px', wide: '720px', extraWide: '1000px' },
    },
    badge: {
        padding: { x: '12px', y: '4px' },
        borderRadius: '16px',
        fontSize: '12px',
        height: '24px',
    },
    toast: {
        maxWidth: '420px',
        padding: { x: '20px', y: '16px' },
        borderRadius: '8px',
        autoDismiss: 5000, // ms
    },
} as const;

// =============================================================================
// GRID SYSTEM
// =============================================================================

export const grid = {
    columns: 12,
    gutter: {
        xs: '12px',
        sm: '16px',
        md: '20px',
        lg: '24px',
    },
    margin: {
        xs: '12px',
        sm: '16px',
        md: '24px',
        lg: '32px',
        xl: '48px',
    },
    container: {
        maxWidth: '1200px',
        padding: {
            mobile: '16px',
            tablet: '24px',
            desktop: '48px',
        },
    },
} as const;

// =============================================================================
// EXPORTS - Convenience type exports
// =============================================================================

export type ColorKey = keyof typeof colors.zinc;
export type SemanticColorKey = keyof typeof colors.semantic;
export type SpacingKey = keyof typeof spacing;
export type BreakpointKey = keyof typeof breakpoints;
export type TextStyleKey = keyof typeof typography.textStyles;
export type ShadowKey = keyof typeof shadows.light;

// Default export
const designTokens = {
    colors,
    typography,
    spacing,
    spacingRem,
    borderRadius,
    shadows,
    breakpoints,
    mediaQueries,
    animation,
    zIndex,
    iconSize,
    components,
    grid,
} as const;

export default designTokens;
