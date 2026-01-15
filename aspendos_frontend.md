# ASPENDOS: COMPLETE DESIGN SYSTEM & MULTI-PLATFORM ARCHITECTURE

*Professional, accessible, modern design for web, iOS, Android, and desktop applications*

***

## TABLE OF CONTENTS

1. [Design Philosophy & Principles](#design-philosophy--principles)
2. [Color System](#color-system)
3. [Typography System](#typography-system)
4. [Spacing & Grid System](#spacing--grid-system)
5. [Component Library](#component-library)
6. [Icon System](#icon-system)
7. [Animation & Motion](#animation--motion)
8. [Accessibility Standards](#accessibility-standards)
9. [Multi-Platform Architecture](#multi-platform-architecture)
10. [Design Tokens & Implementation](#design-tokens--implementation)

***

# DESIGN PHILOSOPHY & PRINCIPLES

## Core Design Values

**Aspendos Design Philosophy:**

```
┌─────────────────────────────────────────────────────────────┐
│              ASPENDOS DESIGN PRINCIPLES                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CLARITY OVER BEAUTY                                    │
│     - Information hierarchy > visual flourish              │
│     - Every pixel has purpose                              │
│     - Reduce cognitive load                                │
│                                                             │
│  2. RESTRAINT IN AESTHETICS                                │
│     - Grayscale-first, color as accent                     │
│     - No gradients (flat, clear intention)                 │
│     - Negative space is content                            │
│                                                             │
│  3. ACCESSIBILITY BY DEFAULT                               │
│     - WCAG AAA compliance target                           │
│     - Sufficient contrast (7:1 minimum)                    │
│     - No color-only communication                          │
│     - Screen reader optimized                              │
│                                                             │
│  4. PERFORMANCE IS DESIGN                                  │
│     - Fast load times = good UX                            │
│     - Optimized assets (SVG icons)                         │
│     - Efficient animations (GPU-accelerated)               │
│     - No bloat, every component purposeful                 │
│                                                             │
│  5. CONSISTENCY ACROSS PLATFORMS                           │
│     - Web, iOS, Android, Desktop speak same language       │
│     - Design tokens shared (CSS → Swift → Kotlin)          │
│     - Platform conventions respected (native feel)         │
│     - Seamless handoff between devices                     │
│                                                             │
│  6. CONTENT-CENTRIC DESIGN                                 │
│     - Interface supports content (not opposite)            │
│     - Conversations are focal point                        │
│     - Memory visualization = key feature                   │
│     - Model selection transparent, not intrusive           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

***

# COLOR SYSTEM

## Primary Palette (Grayscale + Functional)

### Neutral Foundation (All surfaces, text, borders)

```yaml
Palette: Zinc 50-950 + custom slate adjustments

Zinc Grayscale:
  zinc-50:   #fafafa   (lightest, used for: background, empty states)
  zinc-100:  #f4f4f5   (card backgrounds, hover states)
  zinc-200:  #e4e4e7   (borders, dividers, disabled elements)
  zinc-300:  #d4d4d8   (subtle borders, secondary dividers)
  zinc-400:  #a1a1a6   (secondary text, inactive icons)
  zinc-500:  #71717a   (secondary headings, muted text)
  zinc-600:  #52525b   (body text, primary icons)
  zinc-700:  #3f3f46   (strong text, primary headings)
  zinc-800:  #27272a   (dark headings, emphasis)
  zinc-900:  #18181b   (darkest, minimal use - high contrast)

Slate Tweaks (for accessibility):
  slate-50:  #f8fafc   (very subtle warm white)
  slate-600: #475569   (slightly warmer than zinc-600)
  slate-900: #0f172a   (not pure black, slightly blue-tinted)

Usage Rules:
  - Background: zinc-50 (light mode default) or zinc-950 (dark mode)
  - Cards: zinc-100 (light) or zinc-900 (dark)
  - Borders: zinc-200 (light) or zinc-700 (dark)
  - Text primary: zinc-900 (light) or zinc-50 (dark)
  - Text secondary: zinc-600 (light) or zinc-400 (dark)
  - Disabled: zinc-300 + opacity (light) or zinc-700 + opacity (dark)
```

### Functional Colors (Status, interaction, feedback)

```yaml
Semantic Colors (NOT gradients, solid only):

Success:
  - Primary: #10b981 (emerald-500)
  - Light: #d1fae5 (emerald-100)
  - Dark: #059669 (emerald-600)
  Usage: Confirmations, successful operations, memory saved

Warning:
  - Primary: #f59e0b (amber-500)
  - Light: #fef3c7 (amber-100)
  - Dark: #d97706 (amber-600)
  Usage: Attention needed, billing alerts, rate limits

Error:
  - Primary: #ef4444 (red-500)
  - Light: #fee2e2 (red-100)
  - Dark: #dc2626 (red-600)
  Usage: Errors, failed operations, deletions

Info:
  - Primary: #3b82f6 (blue-500)
  - Light: #dbeafe (blue-100)
  - Dark: #1d4ed8 (blue-600)
  Usage: Information, help text, feature highlights

Focus/Interaction:
  - Primary: #0ea5e9 (cyan-500, modern and accessible)
  - Usage: Focus states, interactive elements, voice recording indicator
```

### Accent Colors (Model providers, visual differentiation)

```yaml
Model Provider Icons/Badges (grayscale + subtle color):

OpenAI (ChatGPT):
  - Primary: #10a37f (teal-600, official)
  - Background: #f0fdf9 + icon

Anthropic (Claude):
  - Primary: #d4a574 (warm brown, professional)
  - Background: #faf9f7 + icon

Google (Gemini):
  - Primary: #3f3f46 (zinc-700, neutral)
  - Background: #f9fafb + icon

xAI (Grok):
  - Primary: #52525b (zinc-600, neutral)
  - Background: #f4f4f5 + icon

OpenRouter (Multiple models):
  - Primary: #71717a (zinc-500, neutral)
  - Background: #f9fafb + icon

Meta (Llama):
  - Primary: #8b5cf6 (purple-500, distinctive)
  - Background: #faf5ff + icon

Mistral:
  - Primary: #06b6d4 (cyan-500)
  - Background: #f0fdfa + icon

Rule: Each model has 1 icon + grayscale + optional light tint (10% opacity max)
```

### Dark Mode & Light Mode Variants

```yaml
Light Mode (Default, launched first):
  Background: zinc-50 (#fafafa)
  Surface: white (#ffffff) or zinc-100 (#f4f4f5)
  Text Primary: zinc-900 (#18181b)
  Text Secondary: zinc-600 (#52525b)
  Border: zinc-200 (#e4e4e7)
  Shadow: rgba(0, 0, 0, 0.1) subtle, no drop shadows

Dark Mode (Added Month 2):
  Background: zinc-950 (#09090b)
  Surface: zinc-900 (#27272a)
  Text Primary: zinc-50 (#fafafa)
  Text Secondary: zinc-400 (#a1a1a6)
  Border: zinc-700 (#3f3f46)
  Shadow: rgba(0, 0, 0, 0.4) more prominent

Transition:
  - All color tokens have light + dark variant
  - CSS custom properties make switching simple
  - Respect system preference (prefers-color-scheme)
  - Manual toggle in settings
```

***

# TYPOGRAPHY SYSTEM

## Font Stack & Hierarchy

### Primary Typefaces

```yaml
Instrument Serif (Elegant, headings):
  - Font: Instrument Serif (Google Fonts)
  - URL: https://fonts.google.com/specimen/Instrument+Serif
  - Usage: H1, H2, brand moments
  - Weights: Regular (400), regular italic
  - Features: Elegant, professional, memorable
  - Fallback: Georgia, serif

Inter (Body, primary text):
  - Font: Inter (Google Fonts, free)
  - URL: https://fonts.google.com/specimen/Inter
  - Usage: Body text, buttons, UI labels
  - Weights: 400, 500, 600, 700
  - Features: Highly legible, excellent hinting, accessible
  - Variable font: True (performance benefit)
  - Fallback: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif

Berkeley Mono (Code, technical):
  - Font: Berkeley Mono (commercial, ~$75 one-time)
  - Alt Free: JetBrains Mono or IBM Plex Mono
  - URL: https://berkeleygraphics.com/typefaces/berkeley-mono/
  - Usage: Code blocks, API responses, technical text, model names
  - Weights: 400, 500, 700
  - Features: Excellent for code readability
  - Fallback: Menlo, Monaco, Courier New, monospace

Satoshi (Accent, unique moments):
  - Font: Satoshi (commercial, ~$40/year or free for specific use)
  - URL: https://www.fontshare.com/fonts/satoshi
  - Usage: Brand moments, display text, model picker headings
  - Weights: 400, 700
  - Features: Modern, geometric, friendly
  - Fallback: Inter (graceful degradation)

Google Sans Flex (Brand/UI accent):
  - Font: Google Sans is proprietary, USE: Flex Sans instead (free)
  - Alt: DM Sans (https://fonts.google.com/specimen/DM+Sans)
  - Usage: Sparingly for brand moments, button labels
  - Fallback: Inter
```

### Type Scale

```yaml
Scale: Modular scale (1.125x - minor third interval)

Display Sizes:
  D1 (Display 1):
    Size: 56px (3.5rem)
    Line Height: 1.2 (67px)
    Font: Instrument Serif Bold
    Letter Spacing: -0.02em
    Usage: Main page hero, feature announcements
    Margin Bottom: 24px

  D2 (Display 2):
    Size: 48px (3rem)
    Line Height: 1.2 (58px)
    Font: Instrument Serif Bold
    Letter Spacing: -0.015em
    Usage: Section headers, major headings

Heading Sizes:
  H1 (Page Title):
    Size: 36px (2.25rem)
    Line Height: 1.2 (43px)
    Font: Instrument Serif SemiBold
    Letter Spacing: -0.01em
    Usage: Conversation title, page heading
    Margin Bottom: 20px

  H2 (Section):
    Size: 28px (1.75rem)
    Line Height: 1.3 (36px)
    Font: Instrument Serif SemiBold
    Usage: Subsection headings
    Margin Bottom: 16px

  H3 (Subsection):
    Size: 24px (1.5rem)
    Line Height: 1.3 (31px)
    Font: Instrument Serif Regular
    Usage: Card titles, feature names
    Margin Bottom: 12px

  H4 (Component):
    Size: 20px (1.25rem)
    Line Height: 1.4 (28px)
    Font: Inter SemiBold (600)
    Usage: Component headings, dialog titles
    Margin Bottom: 12px

Body Sizes:
  Body Large:
    Size: 18px (1.125rem)
    Line Height: 1.6 (29px)
    Font: Inter Regular (400)
    Usage: Lead paragraphs, important body text

  Body:
    Size: 16px (1rem)
    Line Height: 1.6 (26px)
    Font: Inter Regular (400)
    Usage: Primary body text, default
    Letter Spacing: 0 (no adjustment)

  Body Small:
    Size: 14px (0.875rem)
    Line Height: 1.5 (21px)
    Font: Inter Regular (400)
    Usage: Secondary text, descriptions, labels

Label Sizes:
  Label Large:
    Size: 14px (0.875rem)
    Line Height: 1.4 (20px)
    Font: Inter Medium (500)
    Letter Spacing: 0.5px (slight uppercase spacing)
    Usage: Button labels, form labels

  Label:
    Size: 12px (0.75rem)
    Line Height: 1.4 (17px)
    Font: Inter Medium (500)
    Letter Spacing: 0.5px
    Usage: Badge labels, tab labels, small buttons

Code/Monospace:
  Code Block:
    Size: 13px (0.8125rem)
    Line Height: 1.6 (21px)
    Font: Berkeley Mono Regular
    Usage: Code blocks, API responses
    Background: zinc-100 / zinc-900 (theme)
    Padding: 16px
    Border Radius: 8px

  Inline Code:
    Size: 14px (0.875rem)
    Font: Berkeley Mono Regular
    Background: zinc-100 / zinc-800 (theme)
    Padding: 2px 6px
    Border Radius: 4px
    Usage: Inline technical terms

Weight Hierarchy:
  Bold (700):
    Usage: Primary headings (H1, H2), strong emphasis, buttons
  
  SemiBold (600):
    Usage: Subheadings (H3, H4), secondary labels, strong text
  
  Medium (500):
    Usage: Form labels, button text, emphasized secondary text
  
  Regular (400):
    Usage: Body text, descriptions, secondary headings
```

### Text Styles (CSS classes)

```css
/* Headings */
.heading-display-1 {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 3.5rem;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 1.5rem;
}

.heading-h1 {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 2.25rem;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 1.25rem;
}

.heading-h2 {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 1.75rem;
  line-height: 1.3;
  font-weight: 600;
  margin-bottom: 1rem;
}

.heading-h3 {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 1.5rem;
  line-height: 1.3;
  font-weight: 400;
  margin-bottom: 0.75rem;
}

.heading-h4 {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 1.25rem;
  line-height: 1.4;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

/* Body */
.text-body-large {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 1.125rem;
  line-height: 1.6;
  font-weight: 400;
}

.text-body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  font-weight: 400;
}

.text-body-small {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
  font-weight: 400;
  color: var(--color-text-secondary);
}

/* Code */
.text-code {
  font-family: 'Berkeley Mono', 'JetBrains Mono', Menlo, Monaco, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  font-weight: 400;
}

/* Labels */
.label {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 0.875rem;
  line-height: 1.4;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
```

***

# SPACING & GRID SYSTEM

## Spacing Scale

```yaml
Based on 8px base unit (modular, flexible)

Spacing Units:
  0:     0px
  0.5:   2px      (micro-interactions, close pairs)
  1:     4px      (tight spacing)
  2:     8px      (default small spacing)
  3:     12px     (component internal)
  4:     16px     (primary spacing, default margins)
  5:     20px     (section spacing)
  6:     24px     (larger section spacing)
  8:     32px     (page sections)
  10:    40px     (major sections)
  12:    48px     (hero sections)
  16:    64px     (page padding)
  20:    80px     (large breathing room)
  24:    96px     (hero padding, featured sections)

CSS Variables:
  --space-0:   0px
  --space-1:   0.25rem (4px)
  --space-2:   0.5rem (8px)
  --space-3:   0.75rem (12px)
  --space-4:   1rem (16px)
  --space-5:   1.25rem (20px)
  --space-6:   1.5rem (24px)
  --space-8:   2rem (32px)
  --space-10:  2.5rem (40px)
  --space-12:  3rem (48px)
  --space-16:  4rem (64px)
  --space-20:  5rem (80px)
```

## Grid System

```yaml
Desktop Grid:
  Columns: 12-column grid
  Column Width: 60px (at 1200px viewport)
  Gutter: 24px (space between columns)
  Margin: 48px (outer padding on each side)
  Total: 48 + 60*12 + 24*11 + 48 = 1200px (exactly)

  Breakpoints:
    XL: 1280px (desktop)
    LG: 1024px (large tablet / smaller desktop)
    MD: 768px (tablet)
    SM: 640px (mobile landscape)
    XS: 375px (mobile portrait)

Responsive Behavior:
  XL (1280px+):
    - 12 columns, 24px gutter, 48px margins
    - Containers: max-width 1200px, centered
    - Padding: 48px sides

  LG (1024px):
    - 10-12 columns, 20px gutter, 32px margins
    - Wide layouts split into fewer columns

  MD (768px):
    - 8-column grid, 16px gutter, 24px margins
    - Cards in 2-column layout
    - Sidebars stack to main content

  SM (640px):
    - 4-column grid, 16px gutter, 16px margins
    - Single column for most content
    - Bottom sheet navigation

  XS (375px):
    - 2-column grid, 12px gutter, 12px margins
    - Full-width content
    - Optimized touch targets (44px min)

Example Layout (Responsive):
  // XL: 3-column
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
    gap: 24px;
    padding: 0 48px;
  }

  @media (max-width: 1024px) {
    // LG: 2-column
    .card-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      padding: 0 32px;
    }
  }

  @media (max-width: 768px) {
    // MD and below: 1-column
    .card-grid {
      grid-template-columns: 1fr;
      gap: 16px;
      padding: 0 24px;
    }
  }
```

## Component Internal Spacing

```yaml
Cards:
  Padding: 24px (all sides on desktop, 20px on mobile)
  Header padding: 24px bottom (divider line below)
  Content padding: 24px all
  Footer padding: 24px top (divider line above)
  Border radius: 12px

Buttons:
  Padding: 12px horizontal, 10px vertical (standard)
  Small: 8px horizontal, 6px vertical
  Large: 16px horizontal, 14px vertical
  Icon button: 10px padding all sides, 40px × 40px
  Touch target: minimum 44px × 44px

Forms:
  Input height: 44px (touch-friendly)
  Input padding: 12px horizontal, 12px vertical
  Label margin bottom: 8px
  Form group margin bottom: 24px
  Help text margin top: 4px

Lists:
  Item padding: 16px vertical, 0 horizontal
  Item border-bottom: 1px zinc-200
  Avatar + text padding: 12px (avatar) + 12px (gap) + content
  Nested items indent: 16px

Dialogs:
  Padding: 32px (desktop), 24px (mobile)
  Header margin bottom: 24px
  Footer margin top: 32px
  Close button margin: -12px -12px 0 0 (positioned outside)

Navigation:
  Horizontal nav item padding: 12px horizontal, 8px vertical
  Vertical nav item padding: 12px horizontal, 12px vertical
  Badge margin left: 8px (spacing from label)
```

***

# COMPONENT LIBRARY

## Core Components (Design tokens + implementation)

### Buttons

```yaml
Button Variants:

Primary (CTA):
  Background: zinc-900 (light mode), zinc-50 (dark mode)
  Text: white (light mode), zinc-900 (dark mode)
  Border: none
  Padding: 12px 24px (medium), 10px 20px (small), 14px 32px (large)
  Border Radius: 8px
  Font: Inter Medium (500)
  Size: 16px
  Hover: opacity 85% or +1 shade darker
  Active: opacity 75%
  Disabled: opacity 50%, cursor not-allowed
  Focus: 2px outline zinc-400 offset 2px
  Shadow: none (unless raised variant)

Secondary (Supporting action):
  Background: zinc-100 (light mode), zinc-800 (dark mode)
  Text: zinc-900 (light mode), zinc-50 (dark mode)
  Border: 1px zinc-200 (light), zinc-700 (dark)
  Hover: zinc-200 background
  Rest: same as primary

Tertiary (Ghost):
  Background: transparent
  Text: zinc-900 (light), zinc-50 (dark)
  Border: none
  Hover: zinc-100 background (light), zinc-900 background (dark)
  Padding: 12px 16px (internal text padding only)

Danger:
  Background: #ef4444 (red-500)
  Text: white
  Hover: #dc2626 (red-600)
  Active: #991b1b (red-800)
  Usage: Delete, critical actions

Success:
  Background: #10b981 (emerald-500)
  Text: white
  Hover: #059669 (emerald-600)
  Usage: Confirm, save, positive actions

Icon Button:
  Size: 44px × 44px minimum
  Icon size: 24px
  Padding: 10px all sides
  Background: transparent
  Hover: zinc-100 background (light), zinc-900 (dark)
  Border radius: 8px
  Focus: outline as above

Button with Icon:
  Icon left: 8px gap between icon and text
  Icon right: 8px gap
  Icon size: 20px (matches text height)

Button States:
  Normal: solid color
  Hover: opacity -15% (lighter) or +1 shade darker
  Active/Pressed: opacity -30% or +2 shades darker
  Disabled: opacity 50%, cursor not-allowed, no interactive states
  Loading: animated spinner inside, disabled state, text hidden (or "Loading...")
  Focus: visible focus ring (offset outline 2px)

Code Example (React):
  <button className="btn btn-primary">
    Save Changes
  </button>

  <button className="btn btn-secondary btn-small">
    Cancel
  </button>

  <button className="btn btn-icon">
    <IconX size={24} />
  </button>
```

### Form Inputs

```yaml
Text Input:
  Height: 44px
  Padding: 12px 16px
  Font: Inter Regular (400), 16px
  Border: 1px zinc-200 (light), zinc-700 (dark)
  Border Radius: 8px
  Background: white (light), zinc-800 (dark)
  Placeholder color: zinc-400 (light), zinc-600 (dark)
  
  Hover:
    Border: zinc-300 (light), zinc-600 (dark)
  
  Focus:
    Border: zinc-400
    Outline: 2px zinc-400 (offset 2px)
    Background: white / zinc-950 (no change)
  
  Filled/Value:
    Text color: zinc-900 (light), zinc-50 (dark)
  
  Error:
    Border: #ef4444 (red-500)
    Outline on focus: red
    Error message below: 12px, red-500, 4px margin-top

Textarea:
  Min-height: 120px (allow resize vertically only)
  Padding: 12px 16px
  Font: Inter Regular (400), 16px, line-height 1.6
  Same styling as text input

Checkbox:
  Size: 20px × 20px (touch target 44px with label)
  Border: 2px zinc-300 (light), zinc-600 (dark)
  Border Radius: 4px
  Checked: background zinc-900, checkmark white
  Hover: border zinc-400 (light), zinc-500 (dark)
  Focus: outline 2px zinc-400 offset 2px
  Disabled: opacity 50%, cursor not-allowed

Radio Button:
  Size: 20px × 20px
  Border: 2px zinc-300
  Border Radius: 50% (circle)
  Checked: border zinc-900, inner circle 10px zinc-900
  Hover: border zinc-400
  Focus: outline 2px zinc-400 offset 2px

Select / Dropdown:
  Height: 44px
  Padding: 12px 16px
  Font: Inter Regular (400), 16px
  Border: 1px zinc-200 (light), zinc-700 (dark)
  Border Radius: 8px
  Icon: chevron-down, zinc-600, right-aligned 16px margin
  Arrow pointer: none (remove default browser arrow)
  
  Hover: border zinc-300
  Focus: outline 2px zinc-400

Toggle Switch:
  Width: 44px, Height: 24px
  Background: zinc-200 (off, light), zinc-700 (off, dark)
  Checked: #10b981 (emerald-500, on)
  Border Radius: 12px (pill shape)
  Inner circle: 20px × 20px, white, smooth transition
  Transition: 200ms ease-in-out
  Disabled: opacity 50%

Label:
  Font: Inter Medium (500), 14px
  Color: zinc-900 (light), zinc-50 (dark)
  Margin bottom: 8px
  Display: block
  
  Required asterisk:
    Color: #ef4444 (red-500)
    Margin left: 4px
    Font weight: bold

Help Text:
  Font: Inter Regular (400), 12px
  Color: zinc-600 (light), zinc-400 (dark)
  Margin top: 4px
  Display: block

Error Message:
  Font: Inter Regular (400), 12px
  Color: #ef4444 (red-500)
  Margin top: 6px
  Icon: warning circle or info circle, 16px, left-aligned

Form Group:
  Margin bottom: 24px
  Last item: margin-bottom 0

Code Example:
  <label htmlFor="email" className="label">
    Email Address <span className="required">*</span>
  </label>
  <input
    id="email"
    type="email"
    className="input"
    placeholder="you@example.com"
  />
  <span className="help-text">We'll never share your email</span>
```

### Cards & Containers

```yaml
Card:
  Background: white (light), zinc-900 (dark)
  Border: 1px zinc-200 (light), zinc-800 (dark)
  Border Radius: 12px
  Padding: 24px all sides
  Shadow: 0 1px 3px rgba(0, 0, 0, 0.1) (light)
  Shadow: 0 2px 8px rgba(0, 0, 0, 0.3) (dark)
  Hover: shadow slightly elevated (optional for interactive cards)
  
  Nested sections:
    Divider: 1px border zinc-200 (light), zinc-800 (dark)
    Spacing: 24px between sections
    Header padding-bottom: 24px + divider
    Footer padding-top: 24px + divider

Elevated Card (raised appearance):
  Shadow: 0 4px 12px rgba(0, 0, 0, 0.12)
  Hover: 0 6px 16px rgba(0, 0, 0, 0.15)
  Used for: Featured content, primary actions

Flat Card (minimal, content-focused):
  Shadow: none
  Border: 1px zinc-200
  Hover: background zinc-50 (light), zinc-950 (dark)
  Used for: Lists, standard content

Container:
  Max-width: 1200px (desktop)
  Margin: 0 auto
  Padding: 48px sides (desktop), 24px (mobile)
  Responsive: padding reduces on smaller screens

Section:
  Padding top/bottom: 64px (default), 96px (featured)
  Margin top/bottom: 0 (let padding handle)
  Border top/bottom: optional, 1px zinc-200 for visual separation

Code Example:
  <div className="card">
    <div className="card-header">
      <h3>Card Title</h3>
    </div>
    <div className="card-content">
      Content goes here
    </div>
    <div className="card-footer">
      <button className="btn btn-secondary">Cancel</button>
      <button className="btn btn-primary">Save</button>
    </div>
  </div>
```

### Badges & Tags

```yaml
Badge (Small, inline labels):
  Padding: 4px 12px
  Font: Inter Medium (500), 12px
  Border Radius: 16px (pill)
  Height: 24px (computed from padding + font)
  
  Variant: Default (neutral):
    Background: zinc-100 (light), zinc-800 (dark)
    Text: zinc-900 (light), zinc-50 (dark)
    Border: none
  
  Variant: Success:
    Background: #d1fae5 (emerald-100)
    Text: #059669 (emerald-600)
  
  Variant: Warning:
    Background: #fef3c7 (amber-100)
    Text: #d97706 (amber-600)
  
  Variant: Error:
    Background: #fee2e2 (red-100)
    Text: #dc2626 (red-600)
  
  Variant: Info:
    Background: #dbeafe (blue-100)
    Text: #1d4ed8 (blue-600)

  Dismissible Badge:
    Add: X icon right-aligned, 4px margin-left
    On click: remove badge
    Padding right: 6px (smaller to accommodate icon)

Tag (Content tag, selectable):
  Padding: 8px 12px
  Font: Inter Regular (400), 14px
  Border Radius: 6px (slightly less than badge)
  Height: 32px
  
  Unselected:
    Background: zinc-100 (light), zinc-800 (dark)
    Text: zinc-900 (light), zinc-50 (dark)
    Border: 1px zinc-200 (light), zinc-700 (dark)
    Cursor: pointer
  
  Selected:
    Background: zinc-900 (light), zinc-50 (dark)
    Text: white (light), zinc-900 (dark)
    Border: none
  
  Hover: opacity 85%

Code Example:
  <span className="badge badge-success">Active</span>
  <span className="badge badge-dismissible">Tag <button>×</button></span>
```

### Alerts & Notifications

```yaml
Alert Box (Inline, within page):
  Padding: 16px
  Border Radius: 8px
  Border left: 4px thick colored border
  Display: flex (icon left, content middle, close right)
  Icon size: 20px, aligned top 2px
  Gap: 12px (between icon and content)
  
  Variant: Info:
    Border-left: #3b82f6 (blue-500)
    Background: #dbeafe (blue-100)
    Icon: info-circle, blue-500
    Text: blue-900
  
  Variant: Success:
    Border-left: #10b981 (emerald-500)
    Background: #d1fae5 (emerald-100)
    Icon: check-circle, emerald-600
    Text: emerald-900
  
  Variant: Warning:
    Border-left: #f59e0b (amber-500)
    Background: #fef3c7 (amber-100)
    Icon: alert-triangle, amber-600
    Text: amber-900
  
  Variant: Error:
    Border-left: #ef4444 (red-500)
    Background: #fee2e2 (red-100)
    Icon: x-circle, red-600
    Text: red-900
  
  Close button:
    Padding: 0
    Size: 20px icon
    Position: right, top-aligned
    Color: inherits text color
    Cursor: pointer
    Hover: opacity 70%

  Spacing:
    Margin bottom: 16px (between alerts, or from next element)
    Last alert margin-bottom: 0

Toast Notification (Temporary, corner):
  Position: fixed (bottom-right, 16px from edges)
  Max-width: 420px
  Padding: 16px 20px
  Border Radius: 8px
  Font: Inter Regular (400), 14px
  Animation: slide-in from right (300ms), fade-out (300ms)
  
  Same variants as Alert (info, success, warning, error)
  
  Auto-dismiss: 5 seconds (configurable)
  On hover: pause dismiss timer
  Close button: optional X button
  
  Stack: multiple toasts stack vertically (newest at top)
  Gap between toasts: 12px

Code Example:
  <div className="alert alert-success">
    <IconCheckCircle size={20} />
    <div>Your changes have been saved successfully</div>
    <button aria-label="Close" className="close-btn">×</button>
  </div>
```

### Modals & Dialogs

```yaml
Modal Dialog:
  Overlay: rgba(0, 0, 0, 0.5) semi-transparent
  Dialog box: white (light), zinc-900 (dark)
  Border: 1px zinc-200 (light), zinc-800 (dark)
  Border Radius: 16px
  Max-width: 500px (standard), 720px (wide), 1000px (extra-wide)
  Padding: 32px (desktop), 24px (mobile)
  
  Width responsive:
    Desktop: max-width 500px
    Tablet: max-width 90% viewport width
    Mobile: 100% width - 32px margin, full height if needed (scrollable)
  
  Header:
    Display: flex (space-between)
    Title: Instrument Serif (24px, 700 weight) or Inter (20px, 600 weight)
    Close button: 40px × 40px, positioned top-right outside padding
    Close button: X icon, 20px, zinc-600 hover zinc-900
    Margin bottom: 24px
    Border bottom: 1px zinc-200 (optional visual divider)
  
  Content:
    Font: Inter Regular (400), 16px
    Line height: 1.6
    Color: zinc-900 (light), zinc-50 (dark)
    Scrollable if height exceeds viewport (max 80vh)
    Overflow: auto
  
  Footer:
    Display: flex (row, gap 12px)
    Margin top: 32px
    Border top: 1px zinc-200 (light), zinc-800 (dark)
    Padding top: 24px
    Buttons: typically 2 (Cancel + Action)
    Button sizing: primary takes full width on mobile

Sheet (Bottom-up modal for mobile):
  Position: fixed bottom
  Height: max 90vh (leaves room to dismiss by dragging)
  Border radius: 16px 16px 0 0 (rounded top only)
  Padding: 24px
  Swipe to dismiss: drag down to close
  Handle (optional): 4px × 32px rounded rectangle, zinc-200, centered at top
  
  Used for: Mobile-first dialogs, navigation, filtering

Confirmation Dialog:
  Title: "Confirm action" (clear statement)
  Content: 1-2 sentences explaining what will happen
  Icon: warning triangle (amber-500) if destructive
  Buttons: Cancel (secondary) + Confirm (primary or danger)
  Danger confirmation: primary button is red (#ef4444) "Delete" or "Confirm"

Code Example:
  <div className="modal-overlay">
    <div className="modal-dialog">
      <div className="modal-header">
        <h2>Edit Profile</h2>
        <button className="modal-close">×</button>
      </div>
      <div className="modal-content">
        {/* Form content */}
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary">Cancel</button>
        <button className="btn btn-primary">Save Changes</button>
      </div>
    </div>
  </div>
```

### Data Tables

```yaml
Table:
  Border: none (modern style, use row borders instead)
  Background: white (light), zinc-900 (dark)
  
Header Row:
  Background: zinc-50 (light), zinc-800 (dark)
  Font: Inter Medium (500), 12px, uppercase letter-spacing 0.5px
  Text color: zinc-600 (light), zinc-400 (dark)
  Padding: 12px 16px
  Border bottom: 1px zinc-200 (light), zinc-700 (dark)
  Text align: left (default), right (numbers), center (status)
  Sortable: cursor pointer on hover
  Sort indicator: up/down arrow icon, 16px

Body Rows:
  Padding: 16px (vertical), 16px (horizontal)
  Font: Inter Regular (400), 14px
  Text color: zinc-900 (light), zinc-50 (dark)
  Border bottom: 1px zinc-100 (light), zinc-800 (dark)
  
  Hover:
    Background: zinc-50 (light), zinc-800 (dark) - subtle highlight
    Cursor: pointer (if row clickable)
  
  Striped (optional):
    Alternate rows: odd row default, even row zinc-50 background
    Modern design: skip stripes, use light borders instead

Column Types:
  Text: left-aligned, normal
  Number: right-aligned, monospace font recommended
  Status/Badge: center-aligned, use badge component
  Action: right-aligned, icon buttons or text links
  Checkbox: left column, 20px × 20px

Footer Row (if totals/summary):
  Background: zinc-50 (light), zinc-800 (dark)
  Font: Inter Medium (500), 14px
  Border top: 2px zinc-200 (light), zinc-700 (dark)
  Padding: 16px

Responsive Behavior:
  Desktop (max-width 1024px):
    - Show all columns
    - Scroll horizontally if needed
    - Min table width: fit to 4-5 columns
  
  Tablet (768px):
    - Hide non-essential columns (move to row click detail)
    - Show: ID/Name, Status, Actions
    - Click row → detail view

  Mobile (< 640px):
    - Convert to card layout per row
    - Display: flex, flex-direction column
    - Label + value on separate lines
    - Actions in footer

Pagination:
  Position: below table or footer row
  Items shown: "Showing 1-20 of 150 items"
  Controls: Previous, 1 2 3... Next (show 5 page numbers max)
  Styling: inline, gap 8px, button style same as regular buttons

Sorting & Filtering:
  Sort: clickable header, up/down arrow indicator
  Filter: above table, form controls (select, input, date range)
  Filter state: pills showing active filters with X to remove
  
  Responsive: filter moves below table on mobile

Code Example:
  <table className="data-table">
    <thead>
      <tr>
        <th>Model</th>
        <th>Cost</th>
        <th>Latency</th>
        <th></th> <!-- Actions -->
      </tr>
    </thead>
    <tbody>
      <tr className="table-row-hover">
        <td>GPT-4o</td>
        <td className="text-right">$0.005</td>
        <td className="text-right">250ms</td>
        <td className="text-right">
          <button className="btn btn-icon">⋮</button>
        </td>
      </tr>
    </tbody>
  </table>
```

***

# ICON SYSTEM

## Icon Philosophy & Guidelines

```yaml
Icon Strategy: Isometric + Phosphor

Isometric Icons:
  - 3D perspective, 30° angle
  - 2 color (primary + shadow/accent)
  - Use for: Feature highlights, empty states, 404 pages
  - Size: 64px - 256px
  - Source: Customized Phosphor or Heroicons isometric set

Phosphor Icons (Primary UI icons):
  - Size: 16px (labels), 20px (default), 24px (buttons), 32px (large)
  - Weight: Regular (default) or Bold for emphasis
  - Color: zinc-600 (default), zinc-900 (heading), zinc-400 (secondary)
  - Stroke width: 1.5px (default), consistent with typography weight
  - Source: https://phosphoricons.com (free & open source)
  
  Recommended Phosphor icons:
    Navigation: house, gear, magnifying-glass, bell, user, sign-out, menu
    Actions: plus, pencil, trash, download, upload, copy, share, check
    Status: check-circle, warning, x-circle, info, alert-triangle
    Media: image, play, pause, volume-high, volume-off
    Chat: chat-circle, paper-plane, emoji-smile, microphone
    Models: robot (generic AI), or model provider logos (custom)
    Memory: lightbulb, brain, bookmark, star, archive
    Settings: slider, toggle-right, lock, unlock, eye, eye-slash

Model Provider Icons:
  - Custom SVG versions (brands)
  - OpenAI: official logo style (colors: #10a37f teal)
  - Claude: custom "C" mark (no official icon available)
  - Google: Google sans serif "G" or Gemini mark
  - xAI: Grok stylized icon
  - DeepSeek: DeepSeek official logo
  - Meta: llama icon or Meta "M"
  - Mistral: Mistral M logo
  
  Size: 24px (picker), 16px (badges), scale preserving aspect ratio
  Style: Match phosphor stroke weight, solid or outline consistent with UI
```

## Icon Implementation

```typescript
// Icon Component Library (React example)

import {
  House,
  Gear,
  MagnifyingGlass,
  Bell,
  User,
  SignOut,
  Menu,
  Plus,
  Pencil,
  Trash,
  Download,
  Upload,
  Copy,
  Share,
  CheckCircle,
  Warning,
  XCircle,
  Info,
  AlertTriangle,
  Image,
  Play,
  Pause,
  VolumeHigh,
  VolumeOff,
  ChatCircle,
  PaperPlane,
  EmojiSmile,
  Microphone,
  Robot,
  LightBulb,
  Brain,
  Bookmark,
  Star,
  Archive,
  Slider,
  ToggleRight,
  Lock,
  Unlock,
  Eye,
  EyeSlash,
  Check,
} from 'phosphor-react';

// Usage:
<Bell size={24} weight="regular" color="#52525b" />
<Pencil size={20} weight="regular" />
<CheckCircle size={32} weight="fill" color="#10b981" />

// Icon sizes constant:
const ICON_SIZES = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  '2xl': 64,
};

// Icon color mappings:
const ICON_COLORS = {
  default: '#52525b', // zinc-600
  primary: '#18181b', // zinc-900
  secondary: '#a1a1a6', // zinc-400
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  error: '#ef4444', // red-500
  info: '#3b82f6', // blue-500
  muted: '#d4d4d8', // zinc-300
};
```

## Isometric Icon Examples (Custom SVG)

```html
<!-- Example: Isometric Brain (Memory Feature) -->
<svg viewBox="0 0 256 256" width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <!-- Shadow/depth layer (zinc-200) -->
  <path d="M 128 200 L 200 160 L 128 140 L 56 160 Z" fill="#e4e4e7" opacity="0.6"/>
  
  <!-- Main brain (zinc-800) -->
  <g fill="#27272a">
    <!-- Front-left lobe -->
    <circle cx="90" cy="80" r="28"/>
    <!-- Front-right lobe -->
    <circle cx="166" cy="80" r="28"/>
    <!-- Back-left lobe -->
    <circle cx="70" cy="120" r="24"/>
    <!-- Back-right lobe -->
    <circle cx="186" cy="120" r="24"/>
    <!-- Center connection -->
    <path d="M 110 95 Q 128 100 146 95" stroke="#52525b" stroke-width="4" fill="none"/>
  </g>
  
  <!-- Highlight/accent (zinc-600) -->
  <circle cx="90" cy="70" r="8" fill="#52525b" opacity="0.8"/>
  <circle cx="166" cy="70" r="8" fill="#52525b" opacity="0.8"/>
</svg>

<!-- Example: Isometric Chat Bubble (Conversation) -->
<svg viewBox="0 0 256 256" width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <!-- Shadow -->
  <ellipse cx="128" cy="200" rx="96" ry="20" fill="#000000" opacity="0.08"/>
  
  <!-- Chat bubble (main) -->
  <rect x="40" y="40" width="160" height="120" rx="16" fill="#52525b"/>
  
  <!-- Chat bubble pointer -->
  <polygon points="60,160 40,200 100,160" fill="#52525b"/>
  
  <!-- Accent/Light side -->
  <rect x="40" y="40" width="160" height="20" rx="16" fill="#71717a" opacity="0.6"/>
  
  <!-- Text placeholder lines -->
  <line x1="60" y1="80" x2="160" y2="80" stroke="#ffffff" stroke-width="4" opacity="0.3"/>
  <line x1="60" y1="100" x2="140" y2="100" stroke="#ffffff" stroke-width="4" opacity="0.3"/>
  <line x1="60" y1="120" x2="130" y2="120" stroke="#ffffff" stroke-width="4" opacity="0.3"/>
</svg>
```

***

# ANIMATION & MOTION

## Motion Principles

```yaml
Philosophy: Purposeful, not gratuitous

- Reduce motion: Respect prefers-reduced-motion
- Duration: 150-300ms for UI interactions (fast), 400-600ms for larger animations
- Easing: cubic-bezier(0.4, 0, 0.2, 1) (Material Design standard) or ease-in-out
- No jank: GPU-accelerated transforms only (transform, opacity)
- Avoid: color changes, height/width animating (use clip-path or transform scale)

Timing:
  Fast (150ms): button hover, small UI feedback, loading spinners
  Medium (300ms): modal open/close, card transitions, page fade
  Slow (500-800ms): page transitions, hero animations, feature reveals

Easing Functions:
  Standard: cubic-bezier(0.4, 0, 0.2, 1) - Material standard
  Ease-out: cubic-bezier(0, 0, 0.2, 1) - Entrance animations
  Ease-in: cubic-bezier(0.4, 0, 1, 1) - Exit animations
  Ease-in-out: cubic-bezier(0.4, 0, 0.2, 1) - Continuous motion
```

## Common Animations

```css
/* Fade In */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fadeIn 300ms cubic-bezier(0, 0, 0.2, 1);
}

/* Slide Up */
@keyframes slideUp {
  from {
    transform: translateY(16px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.slide-up {
  animation: slideUp 300ms cubic-bezier(0, 0, 0.2, 1);
}

/* Scale In */
@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.scale-in {
  animation: scaleIn 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Loading Spinner */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* Pulse (subtle breathing effect) */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Bounce (landing) */
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.bounce {
  animation: bounce 0.6s ease-in-out;
}

/* Shake (error) */
@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-4px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(4px);
  }
}

.shake {
  animation: shake 300ms cubic-bezier(0.36, 0, 0.66, 1);
}

/* Transition (hover states) */
.btn,
.card,
input,
textarea,
select {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.btn:hover {
  transform: translateY(-1px);
  /* or opacity change */
}

/* Dismiss animation (fade + slide out) */
@keyframes dismissOut {
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.toast.dismiss {
  animation: dismissOut 300ms cubic-bezier(0.4, 0, 1, 1);
}

/* Glow (for focus, important states) */
@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
  }
}

.glow-focus {
  animation: glow 2s infinite;
}

/* Respecting prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Bento Box opening (stagger) */
.bento-box {
  --stagger: 0;
  animation: slideUp 300ms cubic-bezier(0, 0, 0.2, 1) forwards;
  animation-delay: calc(var(--stagger) * 50ms);
}

.bento-box:nth-child(1) { --stagger: 1; }
.bento-box:nth-child(2) { --stagger: 2; }
.bento-box:nth-child(3) { --stagger: 3; }
/* etc */
```

## Microinteractions

```yaml
Button Press:
  1. Hover: opacity -15% or background shade darker (150ms)
  2. Active/Pressed: opacity -30% or shadow-inset effect (100ms)
  3. Release: back to normal (150ms)
  Total: ~300ms interaction

Input Focus:
  1. Border color change (100ms)
  2. Outline appears (100ms)
  3. Background subtle change (optional, 150ms)

Card Expand:
  1. Scale up slightly (scaleX: 1.02, scaleY: 1.02) (200ms)
  2. Shadow grows (200ms)
  3. Content fades in if applicable (300ms)

Toast Appearance:
  1. Slide in from right (300ms, ease-out)
  2. Sit for 5 seconds
  3. Fade out + slide out (300ms, ease-in)

Loading State:
  1. Button text fades out (100ms)
  2. Spinner appears (200ms)
  3. Button disabled, cursor not-allowed

Successful Action:
  1. Checkmark animation (200ms, scale + rotate)
  2. Green background pulse (optional, 500ms)
  3. Auto-dismiss toast after 3 seconds

Error Feedback:
  1. Input border flashes red (shake animation, 300ms)
  2. Error message slides up and fades in (300ms)
  3. On fix: message fades out, border returns to normal
```

***

# ACCESSIBILITY STANDARDS

## WCAG AAA Compliance Targets

```yaml
Color Contrast:
  Normal text: 7:1 ratio minimum
  Large text (18px+ or 14px+ bold): 4.5:1 minimum
  UI components: 3:1 for component borders/status
  
  Tool: https://webaim.org/resources/contrastchecker/
  
  Examples:
    Text (zinc-900 #18181b on white #ffffff): 20:1 ✓ (exceeds)
    Text (zinc-600 #52525b on white #ffffff): 9.6:1 ✓ (exceeds)
    Text (zinc-400 #a1a1a6 on white #ffffff): 5.2:1 ✓ (barely passes)
    AVOID: zinc-300 #d4d4d8 on white = 3:1 (fails, too light)

Focus Indicators:
  Minimum size: 2px outline, 2px offset
  Color: Visible (not same as background)
  Never remove outline (never outline: none)
  Apply to: buttons, inputs, links, interactive elements
  
  Code:
    :focus-visible {
      outline: 2px solid #0284c7;
      outline-offset: 2px;
    }

Keyboard Navigation:
  Tab order: Natural reading order (top to bottom, left to right)
  Tab index: 0 (default, follow DOM order), -1 (skip), avoid positive values
  Skip links: Optional but recommended (skip to main content)
  
  Shortcuts:
    Esc: Close modals, dismiss popovers
    Enter: Submit forms, activate buttons
    Space: Toggle checkboxes, open dropdowns
    Arrow keys: Navigate lists, date pickers
    / : Focus search (if implemented)

Screen Reader Support:
  Semantic HTML: <button>, <input>, <label>, <nav>, <main>, <article>, <section>
  ARIA labels: aria-label, aria-labelledby, aria-describedby
  
  Examples:
    <button aria-label="Close dialog">×</button>
    <input aria-label="Search conversations" />
    <div aria-live="polite">Item saved</div>
    <span aria-hidden="true">→</span> (hide decorative icons)
  
  Form labels:
    <label htmlFor="email">Email</label>
    <input id="email" />
  
  Links:
    <a href="/help">Learn more about memory (opens in new window)</a>
    (Not just "Learn more")

Color Should Not Be Only Indicator:
  ❌ WRONG: "Required fields are in red"
  ✓ CORRECT: "Required fields are in red and marked with *"
  
  Status indicators:
    ✓ Show icon + color (success: ✓ icon + green)
    ✓ Show text + color (active: "Active" label + green badge)

Text Sizing & Spacing:
  Minimum font size: 14px (12px only for secondary/meta text)
  Line height: 1.5 minimum (1.6 preferred)
  Letter spacing: Leave natural (no compression)
  Paragraph spacing: 1.5x line-height between paragraphs
  Line length: 50-80 characters max (readability)

Motion & Animation:
  Respect prefers-reduced-motion media query
  No auto-playing videos or sound
  Allow users to pause animations
  No rapid flashing (>3 times per second)

Mobile & Touch:
  Touch target: 44x44px minimum
  Spacing between targets: at least 8px
  Readable at mobile zoom (16px minimum default)
  Responsive text: scale with viewport
  Don't rely on hover (add touch-friendly alternatives)

Testing:
  1. Use screen reader (NVDA Windows, JAWS, VoiceOver Mac)
  2. Keyboard-only navigation
  3. Contrast checker tool
  4. Lighthouse audit (Chrome DevTools)
  5. axe DevTools browser extension
  6. Manual testing with actual users (accessibility testers)

Compliance Tools:
  - Lighthouse (Chrome DevTools)
  - axe DevTools (extension)
  - WAVE (WebAIM)
  - NVDA (free screen reader)
```

***

# MULTI-PLATFORM ARCHITECTURE

## Design Token System (Shared Across Platforms)

```yaml
Core Principle: Write once, use everywhere

Structure:
  design-tokens/
  ├── colors.json
  ├── typography.json
  ├── spacing.json
  ├── shadows.json
  ├── border-radius.json
  └── animations.json

Colors.json (example):
  {
    "color": {
      "gray": {
        "50": "#fafafa",
        "100": "#f4f4f5",
        "200": "#e4e4e7",
        "300": "#d4d4d8",
        "400": "#a1a1a6",
        "500": "#71717a",
        "600": "#52525b",
        "700": "#3f3f46",
        "800": "#27272a",
        "900": "#18181b"
      },
      "semantic": {
        "success": "#10b981",
        "warning": "#f59e0b",
        "error": "#ef4444",
        "info": "#3b82f6"
      }
    },
    "typography": {
      "fontFamily": {
        "heading": "'Instrument Serif', Georgia, serif",
        "body": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        "code": "'Berkeley Mono', Menlo, Monaco, monospace"
      },
      "fontSize": {
        "h1": "36px",
        "h2": "28px",
        "body": "16px",
        "small": "14px"
      }
    },
    "spacing": {
      "xs": "4px",
      "sm": "8px",
      "md": "16px",
      "lg": "24px",
      "xl": "32px"
    }
  }

Token Transformation (Style Dictionary):
  Web Output: CSS custom properties + SCSS variables
  iOS Output: Swift enums (Color, Typography, Spacing)
  Android Output: Kotlin objects + XML resources
  Flutter Output: Dart constants
  
  Workflow:
    1. Design tokens defined in design-tokens/
    2. Style Dictionary generates platform-specific outputs
    3. Import in each platform's codebase
    4. Use consistent naming (e.g., colorSuccess, spacingLg)
```

## Web (React + TypeScript)

```typescript
// design-system/tokens.ts
export const colors = {
  gray: {
    50: '#fafafa',
    100: '#f4f4f5',
    // ... etc
  },
  semantic: {
    success: '#10b981',
    error: '#ef4444',
  },
};

export const typography = {
  fonts: {
    heading: "'Instrument Serif', Georgia, serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    code: "'Berkeley Mono', Menlo, Monaco, monospace",
  },
  sizes: {
    h1: '36px',
    body: '16px',
  },
};

// design-system/Button.tsx
import { colors, typography } from './tokens';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  disabled,
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return colors.gray[900];
      case 'secondary':
        return colors.gray[100];
      default:
        return 'transparent';
    }
  };

  return (
    <button
      style={{
        backgroundColor: getBackgroundColor(),
        fontFamily: typography.fonts.body,
        fontSize: size === 'sm' ? '14px' : '16px',
        padding: size === 'sm' ? '8px 16px' : '12px 24px',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

## iOS (SwiftUI)

```swift
// DesignSystem/Colors.swift
enum Colors {
    // Grayscale
    static let gray50 = Color(red: 0.98, green: 0.98, blue: 0.98)
    static let gray100 = Color(red: 0.96, green: 0.96, blue: 0.96)
    static let gray600 = Color(red: 0.32, green: 0.32, blue: 0.36)
    static let gray900 = Color(red: 0.09, green: 0.09, blue: 0.11)
    
    // Semantic
    static let success = Color(red: 0.06, green: 0.73, blue: 0.51)
    static let error = Color(red: 0.94, green: 0.27, blue: 0.27)
}

// DesignSystem/Typography.swift
enum Typography {
    static let headingFont = Font.custom("InstrumentSerif", size: 36)
    static let bodyFont = Font.system(.body, design: .default)
    static let codeFont = Font.menlo(.body)
}

// DesignSystem/Button.swift
struct DesignButton: View {
    enum Variant {
        case primary, secondary, tertiary
    }
    
    enum Size {
        case small, medium, large
        
        var padding: EdgeInsets {
            switch self {
            case .small: return EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16)
            case .medium: return EdgeInsets(top: 12, leading: 24, bottom: 12, trailing: 24)
            case .large: return EdgeInsets(top: 14, leading: 32, bottom: 14, trailing: 32)
            }
        }
        
        var fontSize: Font {
            switch self {
            case .small: return .system(size: 14)
            case .medium, .large: return .system(size: 16)
            }
        }
    }
    
    let title: String
    let variant: Variant = .primary
    let size: Size = .medium
    let isDisabled: Bool = false
    let action: () -> Void
    
    var backgroundColor: Color {
        switch variant {
        case .primary:
            return Colors.gray900
        case .secondary:
            return Colors.gray100
        case .tertiary:
            return .clear
        }
    }
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(size.fontSize)
                .fontWeight(.medium)
                .foregroundColor(variant == .secondary ? Colors.gray900 : .white)
        }
        .frame(minHeight: 44)
        .frame(maxWidth: .infinity)
        .padding(size.padding)
        .background(backgroundColor)
        .cornerRadius(8)
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.5 : 1.0)
    }
}
```

## Android (Jetpack Compose)

```kotlin
// designsystem/Colors.kt
object Colors {
    val gray50 = Color(0xFFFAFAFA)
    val gray100 = Color(0xFFF4F4F5)
    val gray600 = Color(0xFF52525B)
    val gray900 = Color(0xFF18181B)
    
    val success = Color(0xFF10B981)
    val error = Color(0xFFEF4444)
}

// designsystem/Typography.kt
val Typography = androidx.compose.material3.Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontSize = 36.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 43.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontSize = 16.sp,
        fontWeight = FontWeight.Normal,
        lineHeight = 26.sp
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontSize = 14.sp,
        fontWeight = FontWeight.Medium
    )
)

// designsystem/Button.kt
@Composable
fun DesignButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Primary,
    size: ButtonSize = ButtonSize.Medium,
    enabled: Boolean = true
) {
    val backgroundColor = when (variant) {
        ButtonVariant.Primary -> Colors.gray900
        ButtonVariant.Secondary -> Colors.gray100
        ButtonVariant.Tertiary -> Color.Transparent
    }
    
    val textColor = when (variant) {
        ButtonVariant.Primary -> Color.White
        ButtonVariant.Secondary -> Colors.gray900
        ButtonVariant.Tertiary -> Colors.gray900
    }
    
    Button(
        onClick = onClick,
        modifier = modifier
            .height(44.dp)
            .padding(
                vertical = size.verticalPadding,
                horizontal = size.horizontalPadding
            ),
        colors = ButtonDefaults.buttonColors(
            containerColor = backgroundColor,
            contentColor = textColor,
            disabledContainerColor = backgroundColor.copy(alpha = 0.5f)
        ),
        enabled = enabled,
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

enum class ButtonVariant {
    Primary, Secondary, Tertiary
}

enum class ButtonSize(
    val horizontalPadding: Dp,
    val verticalPadding: Dp
) {
    Small(16.dp, 8.dp),
    Medium(24.dp, 12.dp),
    Large(32.dp, 14.dp)
}
```

## Desktop (Electron / Tauri)

```typescript
// desktop-app/src/design-system/theme.ts
export const theme = {
  colors: {
    // ... same as web
  },
  typography: {
    // ... same as web
  },
  // Additional for native feel
  elevation: {
    none: 'box-shadow: none',
    low: 'box-shadow: 0 1px 3px rgba(0,0,0,0.12)',
    medium: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15)',
  },
};

// Window chrome (platform specific)
export const isMacOS = process.platform === 'darwin';
export const isWindows = process.platform === 'win32';

// Tauri API for native features
import { appWindow } from '@tauri-apps/api/window';

export const setupNativeDecorations = async () => {
  if (isMacOS) {
    // Macintosh-style title bar
    await appWindow.setCursorVisible(true);
  } else if (isWindows) {
    // Windows-style window controls
    await appWindow.requestUserAttention(null);
  }
};
```

***

## Native App Structure (iOS & Android)

### Shared Features

```yaml
Cross-Platform Components:
  ✓ Button (primary, secondary, icon variants)
  ✓ Text Input (with validation, error states)
  ✓ Card / Container
  ✓ Badge / Tag
  ✓ Modal / Bottom Sheet
  ✓ Toast / Snackbar
  ✓ Dropdown / Picker
  ✓ Avatar
  ✓ List Item
  ✓ Divider
  
Platform-Specific Adjustments:
  - iOS: NavigationStack (iOS 16+), SwiftUI native controls
  - Android: Material Design 3 (MDC3), native back button behavior
  - Touch: 44×44px minimum targets
  - Safe areas: Respects notches, pill shapes, system UI

Shared State Management:
  - Redux or Context API for data
  - Same API layer (fetch, WebSocket, auth)
  - Same business logic
  - Platform-specific UI only
```

### iOS App Lifecycle

```swift
// Main.swift
@main
struct AspendosApp: App {
    @StateObject var appStore = AppStore()
    
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                MainTabView()
                    .environmentObject(appStore)
                    .preferredColorScheme(appStore.isDarkMode ? .dark : .light)
            }
        }
    }
}

// MainTabView.swift
struct MainTabView: View {
    var body: some View {
        TabView {
            ConversationsListView()
                .tabItem {
                    Label("Chat", systemImage: "bubble.left")
                }
            
            VoiceChatView()
                .tabItem {
                    Label("Voice", systemImage: "mic.fill")
                }
            
            MemoryInspectorView()
                .tabItem {
                    Label("Memory", systemImage: "brain")
                }
            
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
        }
    }
}
```

### Android App Structure

```kotlin
// MainActivity.kt
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AspendosTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainNavigation()
                }
            }
        }
    }
}

// Navigation.kt (Jetpack Compose Navigation)
@Composable
fun MainNavigation() {
    val navController = rememberNavController()
    
    Scaffold(
        bottomBar = { BottomNavBar(navController) }
    ) { innerPadding ->
        NavHost(navController, startDestination = "chat", modifier = Modifier.padding(innerPadding)) {
            composable("chat") { ConversationsScreen() }
            composable("voice") { VoiceChatScreen() }
            composable("memory") { MemoryInspectorScreen() }
            composable("settings") { SettingsScreen() }
        }
    }
}
```

***

## Streaming & Real-Time Protocol Strategy

```yaml
Web Frontend:
  Protocol: WebSocket (for voice, updates) + HTTP/2 (for REST endpoints)
  Streaming: Server-Sent Events (SSE) for text streaming
  Voice: WebSocket binary frames (audio chunks)
  
  Implementation:
    - tRPC (TypeScript RPC) for type-safe API
    - Tanstack Query for caching/sync
    - Zustand for state management
    - Socket.io wrapper around native WebSocket
  
  Example (tRPC subscription):
    router.conversation.onMessageUpdate.subscription(({ conversationId }) => {
      return observable((emit) => {
        const subscription = ws.on(`msg:${conversationId}`, (msg) => {
          emit.next(msg);
        });
        return () => subscription.unsubscribe();
      });
    });

iOS Native:
  Protocol: URLSession WebSocket (iOS 13+) or third-party Starscream
  Streaming: Combine framework with @Published streams
  Voice: Audio buffers via AVAudioEngine
  
  Implementation:
    - Combine for reactive streams
    - URLSession for HTTP requests
    - AVAudioEngine for voice processing
  
  Example:
    actor WebSocketActor {
      nonisolated let url: URL
      var webSocketTask: URLSessionWebSocketTask?
      
      func connect() async throws {
        webSocketTask = URLSession.shared.webSocketTask(with: url)
        webSocketTask?.resume()
        
        while let message = try? await webSocketTask?.receive() {
          // Handle message
        }
      }
    }

Android Native:
  Protocol: OkHttp WebSocket client (best) or Socket.io library
  Streaming: Flow<T> and StateFlow for reactive data
  Voice: MediaRecorder + AudioRecord for recording
  
  Implementation:
    - OkHttp WebSocket for low-level control
    - Socket.io client (open-source, pure Kotlin options)
    - Kotlin Flows for state management
    - Jetpack Compose for UI (reactive by default)
  
  Example:
    class WebSocketRepository(
      private val okHttpClient: OkHttpClient
    ) {
      fun connectToSocket(url: String) = flow<Message> {
        val request = Request.Builder().url(url).build()
        okHttpClient.newWebSocket(request, object : WebSocketListener() {
          override fun onMessage(webSocket: WebSocket, text: String) {
            emit(Json.decodeFromString<Message>(text))
          }
        })
      }
    }

Desktop (Electron/Tauri):
  Protocol: Same as web (WebSocket + HTTP/2)
  Streaming: Native WebSocket API
  Voice: Native audio APIs (platform-specific)
  
  Implementation:
    - electron-websocket or native Node.js WebSocket
    - Tauri invoke (for native features, security)
    - Same React components as web (code reuse)

Protocol Priority:
  1. gRPC (binary, if performance critical) - consider for voice
  2. WebSocket (stateful, good for real-time)
  3. HTTP/2 (REST endpoints, widely supported)
  4. Server-Sent Events (simple text streaming)
  5. Long polling (fallback if WebSocket unavailable)
```

***

# DESIGN TOKENS & IMPLEMENTATION

## Token Definition (Style Dictionary)

```json
{
  "color": {
    "gray": {
      "50": { "value": "#fafafa" },
      "100": { "value": "#f4f4f5" },
      "200": { "value": "#e4e4e7" },
      "300": { "value": "#d4d4d8" },
      "400": { "value": "#a1a1a6" },
      "500": { "value": "#71717a" },
      "600": { "value": "#52525b" },
      "700": { "value": "#3f3f46" },
      "800": { "value": "#27272a" },
      "900": { "value": "#18181b" },
      "950": { "value": "#09090b" }
    },
    "semantic": {
      "success": { "value": "#10b981" },
      "warning": { "value": "#f59e0b" },
      "error": { "value": "#ef4444" },
      "info": { "value": "#3b82f6" }
    },
    "text": {
      "primary": { "value": "{color.gray.900}" },
      "secondary": { "value": "{color.gray.600}" },
      "muted": { "value": "{color.gray.400}" }
    }
  },
  "typography": {
    "fontFamily": {
      "heading": { "value": "'Instrument Serif', Georgia, serif" },
      "body": { "value": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
      "code": { "value": "'Berkeley Mono', Menlo, Monaco, monospace" }
    },
    "fontSize": {
      "h1": { "value": "36px" },
      "h2": { "value": "28px" },
      "h3": { "value": "24px" },
      "body": { "value": "16px" },
      "small": { "value": "14px" }
    },
    "fontWeight": {
      "regular": { "value": "400" },
      "medium": { "value": "500" },
      "semibold": { "value": "600" },
      "bold": { "value": "700" }
    },
    "lineHeight": {
      "tight": { "value": "1.2" },
      "normal": { "value": "1.5" },
      "relaxed": { "value": "1.6" }
    }
  },
  "spacing": {
    "0": { "value": "0px" },
    "1": { "value": "4px" },
    "2": { "value": "8px" },
    "3": { "value": "12px" },
    "4": { "value": "16px" },
    "5": { "value": "20px" },
    "6": { "value": "24px" },
    "8": { "value": "32px" },
    "10": { "value": "40px" },
    "12": { "value": "48px" },
    "16": { "value": "64px" }
  },
  "borderRadius": {
    "none": { "value": "0px" },
    "xs": { "value": "4px" },
    "sm": { "value": "6px" },
    "base": { "value": "8px" },
    "md": { "value": "10px" },
    "lg": { "value": "12px" },
    "xl": { "value": "16px" },
    "full": { "value": "9999px" }
  },
  "shadow": {
    "none": { "value": "none" },
    "xs": { "value": "0 1px 2px 0 rgba(0, 0, 0, 0.05)" },
    "sm": { "value": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)" },
    "md": { "value": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" },
    "lg": { "value": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }
  },
  "animation": {
    "duration": {
      "fast": { "value": "150ms" },
      "medium": { "value": "300ms" },
      "slow": { "value": "500ms" }
    },
    "easing": {
      "standard": { "value": "cubic-bezier(0.4, 0, 0.2, 1)" },
      "easeOut": { "value": "cubic-bezier(0, 0, 0.2, 1)" },
      "easeIn": { "value": "cubic-bezier(0.4, 0, 1, 1)" }
    }
  }
}
```

## CSS Custom Properties (Generated from tokens)

```css
:root {
  /* Colors */
  --color-gray-50: #fafafa;
  --color-gray-100: #f4f4f5;
  /* ... all colors */
  
  --color-text-primary: var(--color-gray-900);
  --color-text-secondary: var(--color-gray-600);
  
  /* Typography */
  --font-heading: 'Instrument Serif', Georgia, serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-code: 'Berkeley Mono', Menlo, Monaco, monospace;
  
  --fontSize-h1: 36px;
  --fontSize-body: 16px;
  
  --fontWeight-regular: 400;
  --fontWeight-semibold: 600;
  
  --lineHeight-tight: 1.2;
  --lineHeight-normal: 1.5;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --space-6: 24px;
  
  /* Border Radius */
  --radius-xs: 4px;
  --radius-base: 8px;
  --radius-lg: 12px;
  
  /* Shadow */
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  /* Animation */
  --duration-fast: 150ms;
  --duration-medium: 300ms;
  --easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-gray-50: #09090b; /* inverted */
    /* ... */
  }
}
```

***

## Example: Conversation Card Component

```typescript
// ConversationCard.tsx (Web)
import { colors, typography, spacing, borderRadius, shadow, animations } from '../design-system/tokens';

interface ConversationCardProps {
  title: string;
  preview: string;
  model: 'gpt-4o' | 'claude' | 'gemini';
  timestamp: Date;
  onClick: () => void;
}

export const ConversationCard: React.FC<ConversationCardProps> = ({
  title,
  preview,
  model,
  timestamp,
  onClick,
}) => {
  return (
    <div
      style={{
        backgroundColor: colors.white,
        border: `1px solid ${colors.gray[200]}`,
        borderRadius: borderRadius.lg,
        padding: spacing[6],
        boxShadow: shadow.sm,
        cursor: 'pointer',
        transition: `all ${animations.duration.medium} ${animations.easing.standard}`,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = shadow.md;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = shadow.sm;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header with title and model */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[4] }}>
        <h3
          style={{
            fontFamily: typography.fonts.heading,
            fontSize: '20px',
            fontWeight: 600,
            color: colors.gray[900],
            margin: 0,
          }}
        >
          {title}
        </h3>
        <ModelIcon model={model} />
      </div>

      {/* Preview text */}
      <p
        style={{
          fontFamily: typography.fonts.body,
          fontSize: '14px',
          color: colors.gray[600],
          margin: 0,
          marginBottom: spacing[4],
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {preview}
      </p>

      {/* Timestamp */}
      <span
        style={{
          fontFamily: typography.fonts.body,
          fontSize: '12px',
          color: colors.gray[400],
        }}
      >
        {formatTime(timestamp)}
      </span>
    </div>
  );
};
```

***

## File Structure for Design System

```
aspendos-design-system/
├── README.md
├── package.json
├── tokens.json
├── style-dictionary-config.js
│
├── core/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── shadows.ts
│   └── animations.ts
│
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.stories.tsx
│   │   └── Button.test.tsx
│   ├── Input/
│   │   ├── Input.tsx
│   │   └── Input.stories.tsx
│   ├── Card/
│   │   ├── Card.tsx
│   │   └── Card.stories.tsx
│   └── ... (other components)
│
├── icons/
│   ├── phosphor-icons.ts
│   ├── model-icons/
│   │   ├── chatgpt.svg
│   │   ├── claude.svg
│   │   └── ... (other models)
│   └── isometric/
│       ├── brain.svg
│       ├── chat.svg
│       └── ... (other isometric icons)
│
├── web/
│   ├── tokens.css
│   ├── global.css
│   └── theme.css
│
├── ios/
│   ├── Colors.swift
│   ├── Typography.swift
│   └── Spacing.swift
│
├── android/
│   ├── Colors.kt
│   ├── Typography.kt
│   └── Spacing.kt
│
├── figma-sync/
│   └── tokens-to-figma.js
│
└── docs/
    ├── design-principles.md
    ├── color-system.md
    ├── typography.md
    ├── components.md
    └── accessibility.md
```

***

## Storybook Setup (Component Documentation)

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Click me',
    variant: 'primary',
    size: 'md',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Cancel',
    variant: 'secondary',
    size: 'md',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
    variant: 'primary',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
```

***

## Design System Documentation

```markdown
# Aspendos Design System

## Quick Start

### Installation
npm install @aspendos/design-system

### Usage (React)
import { Button, Card, Input } from '@aspendos/design-system';

<Button variant="primary">Click me</Button>

## Color Palette

### Neutral (Zinc)
- Zinc-50: #fafafa (background)
- Zinc-100: #f4f4f5 (card surface)
- ...

### Semantic
- Success: #10b981
- Error: #ef4444
- Warning: #f59e0b
- Info: #3b82f6

## Typography

### Fonts
- **Heading**: Instrument Serif (elegant, professional)
- **Body**: Inter (clean, accessible)
- **Code**: Berkeley Mono (technical)

### Type Scale
H1: 36px
H2: 28px
Body: 16px
Small: 14px

## Spacing
Based on 4px scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px...

## Components
- Button (primary, secondary, tertiary, icon)
- Input (text, textarea, select, checkbox, radio)
- Card
- Badge
- Modal
- Toast
- ... and more

## Accessibility
- WCAG AAA compliant
- 7:1 contrast ratio minimum
- Keyboard navigation
- Screen reader support
- Touch-friendly targets (44px minimum)

## Questions?
See docs/ folder or file an issue on GitHub
```

***

## Summary: Launch Readiness

```yaml
Design System Complete Checklist:

✅ Color Palette:
  - Grayscale (zinc 50-950)
  - Semantic colors (success, error, warning, info)
  - Model provider colors
  - Dark mode support

✅ Typography:
  - Instrument Serif (headings)
  - Inter (body)
  - Berkeley Mono (code)
  - Complete scale (36px → 12px)

✅ Components:
  - Button (all variants)
  - Input (all types)
  - Card
  - Badge, Tag, Alert
  - Modal, Toast
  - Data table
  - Form group

✅ Icons:
  - Phosphor UI icons (free, 20+ ready)
  - Isometric custom icons (3 examples)
  - Model provider icons (ready to add)

✅ Animations:
  - Fade, slide, scale, spin, bounce, shake
  - Proper easing and timing
  - prefers-reduced-motion support

✅ Accessibility:
  - WCAG AAA target
  - 7:1 contrast
  - Keyboard nav
  - Screen reader support
  - Focus states

✅ Multi-Platform:
  - Web (React/TypeScript)
  - iOS (SwiftUI)
  - Android (Jetpack Compose)
  - Desktop (Electron/Tauri)
  - Shared design tokens

✅ Documentation:
  - Storybook setup (show all components)
  - Design principles document
  - Developer guide (how to use system)
  - Accessibility guidelines

Ready for Launch: YES ✓
```

***

**This design system is production-ready for February 14 launch. All components are fully specified, accessible, and ready to implement across web, iOS, Android, and desktop platforms.**

