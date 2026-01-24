/**
 * YULA OS Design Tokens v2.0
 *
 * Philosophy: Monolith Aesthetic
 * Linear's precision + Claude's warmth + Notion's flexibility + Perplexity's clarity
 *
 * Core Principles:
 * - Purposeful Density: Every pixel serves a function
 * - Intentional Space: Whitespace is a design element
 * - Quiet Confidence: Premium feels subtle, not loud
 * - Fluid Transitions: Motion guides attention
 * - Adaptive Context: Interface responds to user focus
 *
 * Last Updated: January 2026
 */

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // ---------------------------------------------------------------------------
  // Gray Scale (Neutral palette for both themes)
  // ---------------------------------------------------------------------------
  gray: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },

  // ---------------------------------------------------------------------------
  // Semantic Colors
  // ---------------------------------------------------------------------------
  semantic: {
    success: {
      light: '#16A34A',
      dark: '#22C55E',
    },
    warning: {
      light: '#CA8A04',
      dark: '#EAB308',
    },
    error: {
      light: '#DC2626',
      dark: '#EF4444',
    },
    info: {
      light: '#2563EB',
      dark: '#3B82F6',
    },
  },

  // ---------------------------------------------------------------------------
  // Feature Accent Colors (YULA 3 Hooks + Extensions)
  // ---------------------------------------------------------------------------
  feature: {
    import: {
      light: '#2563EB', // Electric Blue
      dark: '#3B82F6',
    },
    pac: {
      light: '#D97706', // Electric Amber
      dark: '#F59E0B',
    },
    council: {
      light: '#7C3AED', // Electric Violet
      dark: '#8B5CF6',
    },
    personas: {
      light: '#059669', // Electric Emerald
      dark: '#10B981',
    },
    memory: {
      light: '#DB2777', // Electric Rose
      dark: '#EC4899',
    },
  },

  // ---------------------------------------------------------------------------
  // Model Colors (Subtle indicators only - 2px border or dot)
  // ---------------------------------------------------------------------------
  models: {
    gpt4o: '#10B981', // Sage Green
    claude: '#F97316', // Coral
    gemini: '#0EA5E9', // Sky Blue
    llama: '#A855F7', // Purple
    mistral: '#F59E0B', // Amber
  },

  // ---------------------------------------------------------------------------
  // Theme-Specific Mappings
  // ---------------------------------------------------------------------------
  light: {
    background: '#FFFFFF',
    backgroundSubtle: '#FAFAFA',
    backgroundMuted: '#F5F5F5',
    foreground: '#171717',
    foregroundMuted: '#737373',
    border: '#E5E5E5',
    borderSubtle: '#F5F5F5',
    card: '#FFFFFF',
    cardForeground: '#171717',
    popover: '#FFFFFF',
    popoverForeground: '#171717',
    primary: '#171717',
    primaryForeground: '#FAFAFA',
    secondary: '#F5F5F5',
    secondaryForeground: '#171717',
    muted: '#F5F5F5',
    mutedForeground: '#737373',
    accent: '#F5F5F5',
    accentForeground: '#171717',
  },
  dark: {
    background: '#0A0A0A',
    backgroundSubtle: '#141414',
    backgroundMuted: '#1C1C1C',
    foreground: '#F5F5F5',
    foregroundMuted: '#A3A3A3',
    border: '#262626',
    borderSubtle: '#333333',
    card: '#141414',
    cardForeground: '#F5F5F5',
    popover: '#141414',
    popoverForeground: '#F5F5F5',
    primary: '#FAFAFA',
    primaryForeground: '#171717',
    secondary: '#262626',
    secondaryForeground: '#FAFAFA',
    muted: '#262626',
    mutedForeground: '#A3A3A3',
    accent: '#262626',
    accentForeground: '#FAFAFA',
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // ---------------------------------------------------------------------------
  // Font Families (Geist family from Vercel)
  // ---------------------------------------------------------------------------
  fontFamily: {
    sans: "'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'Geist Mono', ui-monospace, 'SF Mono', Consolas, monospace",
    fallback: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
  // Type Scale (1.25 Major Second)
  // ---------------------------------------------------------------------------
  fontSize: {
    xs: '0.6875rem', // 11px
    sm: '0.8125rem', // 13px
    base: '1rem', // 16px
    lg: '1.25rem', // 20px
    xl: '1.5625rem', // 25px
    '2xl': '1.9375rem', // 31px
    '3xl': '2.4375rem', // 39px
    '4xl': '3.0625rem', // 49px
  },

  // ---------------------------------------------------------------------------
  // Line Heights
  // ---------------------------------------------------------------------------
  lineHeight: {
    xs: '1rem', // 16px
    sm: '1.25rem', // 20px
    base: '1.5rem', // 24px
    lg: '1.75rem', // 28px
    xl: '2rem', // 32px
    '2xl': '2.5rem', // 40px
    '3xl': '3rem', // 48px
    '4xl': '3.5rem', // 56px
  },

  // ---------------------------------------------------------------------------
  // Letter Spacing
  // ---------------------------------------------------------------------------
  letterSpacing: {
    tighter: '-0.02em', // Headings xl+
    normal: '0', // Body
    wider: '0.01em', // Small text
  },

  // ---------------------------------------------------------------------------
  // Complete Text Styles
  // ---------------------------------------------------------------------------
  textStyles: {
    'text-xs': {
      fontSize: '0.6875rem',
      lineHeight: '1rem',
      fontWeight: 400,
      letterSpacing: '0.01em',
    },
    'text-sm': {
      fontSize: '0.8125rem',
      lineHeight: '1.25rem',
      fontWeight: 400,
    },
    'text-base': {
      fontSize: '1rem',
      lineHeight: '1.5rem',
      fontWeight: 400,
    },
    'text-lg': {
      fontSize: '1.25rem',
      lineHeight: '1.75rem',
      fontWeight: 500,
    },
    'text-xl': {
      fontSize: '1.5625rem',
      lineHeight: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    'text-2xl': {
      fontSize: '1.9375rem',
      lineHeight: '2.5rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    'text-3xl': {
      fontSize: '2.4375rem',
      lineHeight: '3rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    'text-4xl': {
      fontSize: '3.0625rem',
      lineHeight: '3.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
  },
} as const;

// =============================================================================
// SPACING (4px base unit)
// =============================================================================

export const spacing = {
  0: '0px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
} as const;

// Layout-specific spacing
export const layoutSpacing = {
  page: {
    desktop: { horizontal: '48px', vertical: '32px' },
    tablet: { horizontal: '32px', vertical: '24px' },
    mobile: { horizontal: '16px', vertical: '16px' },
  },
  card: {
    padding: '20px',
  },
  section: {
    gap: '48px',
  },
  form: {
    fieldGap: '16px',
  },
  list: {
    itemGap: '8px',
  },
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  none: '0px',
  sm: '4px', // Small buttons, badges
  DEFAULT: '6px', // Inputs, form elements
  md: '8px', // Standard components
  lg: '12px', // Cards, dialogs
  xl: '16px', // Large cards, modals
  '2xl': '20px', // Hero sections
  '3xl': '24px', // Feature cards
  full: '9999px', // Avatars, pills
} as const;

// Component-specific radii
export const componentRadius = {
  button: '6px',
  input: '6px',
  card: '12px',
  modal: '16px',
  chatBubble: '16px',
  chatBubbleInner: '12px',
  avatar: '9999px',
  tooltip: '8px',
  dropdown: '8px',
  chatInput: '12px',
} as const;

// =============================================================================
// SHADOWS & ELEVATION
// =============================================================================

export const shadows = {
  light: {
    xs: '0 1px 2px rgba(0,0,0,0.05)',
    sm: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    DEFAULT: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
    md: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
    lg: '0 20px 25px rgba(0,0,0,0.1), 0 8px 10px rgba(0,0,0,0.04)',
    xl: '0 25px 50px rgba(0,0,0,0.25)',
  },
  dark: {
    xs: '0 1px 2px rgba(0,0,0,0.3)',
    sm: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
    DEFAULT: '0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)',
    md: '0 10px 15px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.3)',
    lg: '0 20px 25px rgba(0,0,0,0.6), 0 8px 10px rgba(0,0,0,0.4)',
    xl: '0 25px 50px rgba(0,0,0,0.7)',
  },
} as const;

// Elevation levels
export const elevation = {
  0: 'base', // Background surfaces
  1: 'cards', // Cards, list items
  2: 'popovers', // Popovers, dropdowns
  3: 'modals', // Modals, dialogs
  4: 'toasts', // Toasts, notifications
} as const;

// =============================================================================
// ICONS (HugeIcons + Isocons)
// =============================================================================

export const iconSize = {
  xs: 14, // Inline indicators
  sm: 16, // Secondary actions
  md: 20, // Standard icons
  lg: 24, // Primary navigation
  xl: 32, // Feature icons
  '2xl': 48, // Empty states
} as const;

// =============================================================================
// MOTION & ANIMATION
// =============================================================================

export const animation = {
  // Duration scale
  duration: {
    75: '75ms', // Micro-feedback
    100: '100ms', // Quick transitions
    150: '150ms', // Standard hovers
    200: '200ms', // Component transitions
    300: '300ms', // Modal/panel open
    500: '500ms', // Page transitions
    700: '700ms', // Stagger animations
  },

  // Easing functions
  easing: {
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)', // Entrances
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)', // Exits
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)', // State changes
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Playful bounces
  },

  // Pre-composed transitions
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors: 'color 200ms, background-color 200ms, border-color 200ms',
    opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
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
// COMPONENT TOKENS
// =============================================================================

export const components = {
  button: {
    size: {
      sm: { height: '32px', paddingX: '12px', fontSize: '13px' },
      md: { height: '40px', paddingX: '16px', fontSize: '14px' },
      lg: { height: '48px', paddingX: '20px', fontSize: '16px' },
    },
    borderRadius: '6px',
  },
  input: {
    height: '40px',
    paddingX: '12px',
    borderRadius: '6px',
    fontSize: '14px',
  },
  card: {
    padding: '20px',
    borderRadius: '12px',
    borderWidth: '1px',
  },
  modal: {
    padding: { desktop: '24px', mobile: '16px' },
    borderRadius: '16px',
    maxWidth: { sm: '400px', md: '500px', lg: '720px', xl: '1000px' },
  },
  sidebar: {
    collapsed: '56px', // 14 * 4 = 56px (icons only)
    expanded: '224px', // 56 * 4 = 224px
  },
  header: {
    height: '64px',
  },
  chatBubble: {
    maxWidth: '70%',
    borderRadius: '16px',
    innerBorderRadius: '12px',
    paddingX: '16px',
    paddingY: '12px',
  },
  toast: {
    maxWidth: '420px',
    borderRadius: '8px',
  },
} as const;

// =============================================================================
// ACCESSIBILITY
// =============================================================================

export const accessibility = {
  focusRing: {
    width: '2px',
    offset: '2px',
    style: 'solid',
  },
  touchTarget: {
    minimum: '44px',
  },
  contrast: {
    normalText: 4.5, // WCAG AA
    largeText: 3,
    interactive: 3,
  },
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export type ColorKey = keyof typeof colors.gray;
export type FeatureColorKey = keyof typeof colors.feature;
export type SpacingKey = keyof typeof spacing;
export type BreakpointKey = keyof typeof breakpoints;
export type TextStyleKey = keyof typeof typography.textStyles;

const designTokens = {
  colors,
  typography,
  spacing,
  layoutSpacing,
  borderRadius,
  componentRadius,
  shadows,
  elevation,
  iconSize,
  animation,
  breakpoints,
  zIndex,
  components,
  accessibility,
} as const;

export default designTokens;
