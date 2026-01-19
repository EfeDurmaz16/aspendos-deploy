import {
    animation,
    borderRadius,
    breakpoints,
    colors,
    iconSize,
    shadows,
    spacing,
    typography,
} from '@/styles/design-tokens';

export const metadata = {
    title: 'Aspendos Design System | Styleguide',
    description: 'Visual reference for the Aspendos design system tokens.',
};

// Helper component for color swatches
function ColorSwatch({
    name,
    value,
    textDark = false,
}: {
    name: string;
    value: string;
    textDark?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1">
            <div
                className="h-16 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-end p-2"
                style={{ backgroundColor: value }}
            >
                <span className={`font-mono text-xs ${textDark ? 'text-zinc-900' : 'text-white'}`}>
                    {value}
                </span>
            </div>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">{name}</span>
        </div>
    );
}

// Section wrapper component
function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="py-12 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-serif text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                {title}
            </h2>
            {description && (
                <p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl">{description}</p>
            )}
            {children}
        </section>
    );
}

export default function StyleguidePage() {
    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Hero Header */}
            <header className="bg-zinc-900 dark:bg-zinc-950 text-white py-16 px-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
                        Aspendos Design System
                    </h1>
                    <p className="text-zinc-400 text-lg max-w-2xl">
                        Visual reference for all design tokens. No gradients, no pure black/white,
                        grayscale-first with zinc palette.
                    </p>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6">
                {/* =================================================================== */}
                {/* COLORS SECTION */}
                {/* =================================================================== */}
                <Section
                    title="Colors"
                    description="Zinc-based neutral palette with semantic and model provider accents. Light theme first approach."
                >
                    {/* Zinc Grayscale */}
                    <div className="mb-10">
                        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                            Zinc Grayscale
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-3">
                            {Object.entries(colors.zinc).map(([name, value]) => (
                                <ColorSwatch
                                    key={name}
                                    name={name}
                                    value={value}
                                    textDark={parseInt(name, 10) < 500}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Semantic Colors */}
                    <div className="mb-10">
                        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                            Semantic Colors
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {Object.entries(colors.semantic).map(([category, shades]) => {
                                if (typeof shades === 'string') {
                                    return (
                                        <div key={category}>
                                            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 capitalize">
                                                {category}
                                            </h4>
                                            <ColorSwatch name="primary" value={shades} />
                                        </div>
                                    );
                                }
                                return (
                                    <div key={category}>
                                        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 capitalize">
                                            {category}
                                        </h4>
                                        <div className="flex gap-2">
                                            {Object.entries(shades).map(([shade, val]) => (
                                                <ColorSwatch
                                                    key={shade}
                                                    name={shade}
                                                    value={val}
                                                    textDark={shade === 'light'}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Model Provider Colors */}
                    <div>
                        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                            Model Provider Accents
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                            {Object.entries(colors.modelProviders).map(([provider, vals]) => (
                                <div key={provider} className="flex flex-col gap-2">
                                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 capitalize">
                                        {provider}
                                    </span>
                                    <div
                                        className="h-12 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: vals.background }}
                                    >
                                        <div
                                            className="w-6 h-6 rounded-full"
                                            style={{ backgroundColor: vals.primary }}
                                        />
                                    </div>
                                    <span className="font-mono text-xs text-zinc-500">
                                        {vals.primary}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* =================================================================== */}
                {/* TYPOGRAPHY SECTION */}
                {/* =================================================================== */}
                <Section
                    title="Typography"
                    description="Instrument Serif for headings, Inter for body, Berkeley Mono (JetBrains Mono fallback) for code."
                >
                    {/* Font Families */}
                    <div className="mb-10">
                        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                            Font Families
                        </h3>
                        <div className="grid gap-4">
                            {Object.entries(typography.fontFamily).map(([name, value]) => (
                                <div
                                    key={name}
                                    className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4"
                                >
                                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 w-20 shrink-0 uppercase">
                                        {name}
                                    </span>
                                    <span
                                        className="text-xl text-zinc-900 dark:text-zinc-50"
                                        style={{ fontFamily: value }}
                                    >
                                        The quick brown fox jumps over the lazy dog
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Type Scale */}
                    <div className="mb-10">
                        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                            Type Scale
                        </h3>
                        <div className="space-y-6">
                            {Object.entries(typography.textStyles).map(([name, style]) => (
                                <div
                                    key={name}
                                    className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-6 pb-4 border-b border-zinc-100 dark:border-zinc-800"
                                >
                                    <div className="w-24 shrink-0">
                                        <span className="font-mono text-xs text-zinc-500 uppercase">
                                            {name}
                                        </span>
                                        <span className="block text-xs text-zinc-400">
                                            {style.fontSize} / {style.fontWeight}
                                        </span>
                                    </div>
                                    <span
                                        className="text-zinc-900 dark:text-zinc-50"
                                        style={{
                                            fontFamily: style.fontFamily,
                                            fontSize: style.fontSize,
                                            fontWeight: style.fontWeight,
                                            lineHeight: (style as { lineHeight?: number }).lineHeight,
                                            letterSpacing: (style as { letterSpacing?: string }).letterSpacing,
                                        }}
                                    >
                                        {name.includes('code')
                                            ? 'const example = "Code sample";'
                                            : 'The quick brown fox'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Font Weights */}
                    <div>
                        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                            Font Weights
                        </h3>
                        <div className="flex flex-wrap gap-6">
                            {Object.entries(typography.fontWeight).map(([name, weight]) => (
                                <div key={name} className="flex flex-col gap-1">
                                    <span
                                        className="text-2xl text-zinc-900 dark:text-zinc-50"
                                        style={{ fontWeight: weight }}
                                    >
                                        Aa
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                        {name} ({weight})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* =================================================================== */}
                {/* SPACING SECTION */}
                {/* =================================================================== */}
                <Section
                    title="Spacing"
                    description="8px base unit following Tailwind conventions. Used for margins, padding, and gaps."
                >
                    <div className="flex flex-wrap gap-4 items-end">
                        {Object.entries(spacing)
                            .filter(([key]) =>
                                [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24].includes(Number(key))
                            )
                            .map(([name, value]) => (
                                <div key={name} className="flex flex-col items-center gap-2">
                                    <div
                                        className="bg-zinc-900 dark:bg-zinc-50 rounded"
                                        style={{ width: value, height: value }}
                                    />
                                    <div className="text-center">
                                        <span className="block font-mono text-xs text-zinc-700 dark:text-zinc-300">
                                            {name}
                                        </span>
                                        <span className="block text-xs text-zinc-400">{value}</span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </Section>

                {/* =================================================================== */}
                {/* BORDER RADIUS SECTION */}
                {/* =================================================================== */}
                <Section
                    title="Border Radius"
                    description="Consistent corner rounding from subtle to pill shapes."
                >
                    <div className="flex flex-wrap gap-6">
                        {Object.entries(borderRadius).map(([name, value]) => (
                            <div key={name} className="flex flex-col items-center gap-2">
                                <div
                                    className="w-16 h-16 bg-zinc-200 dark:bg-zinc-700 border-2 border-zinc-400 dark:border-zinc-500"
                                    style={{ borderRadius: value }}
                                />
                                <div className="text-center">
                                    <span className="block font-mono text-xs text-zinc-700 dark:text-zinc-300">
                                        {name}
                                    </span>
                                    <span className="block text-xs text-zinc-400">{value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* =================================================================== */}
                {/* SHADOWS SECTION */}
                {/* =================================================================== */}
                <Section
                    title="Shadows"
                    description="Light mode shadows are subtle; dark mode shadows are more prominent."
                >
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                        {Object.entries(shadows.light)
                            .filter(([name]) => !['none', 'inner'].includes(name))
                            .map(([name, value]) => (
                                <div key={name} className="flex flex-col items-center gap-3">
                                    <div
                                        className="w-24 h-24 bg-white dark:bg-zinc-800 rounded-lg"
                                        style={{ boxShadow: value }}
                                    />
                                    <div className="text-center">
                                        <span className="block font-mono text-xs text-zinc-700 dark:text-zinc-300">
                                            {name}
                                        </span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </Section>

                {/* =================================================================== */}
                {/* BREAKPOINTS SECTION */}
                {/* =================================================================== */}
                <Section
                    title="Breakpoints"
                    description="Responsive design breakpoints for mobile-first development."
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                    <th className="py-3 px-4 text-xs font-medium text-zinc-500 uppercase">
                                        Name
                                    </th>
                                    <th className="py-3 px-4 text-xs font-medium text-zinc-500 uppercase">
                                        Min Width
                                    </th>
                                    <th className="py-3 px-4 text-xs font-medium text-zinc-500 uppercase">
                                        Target
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(
                                    [
                                        { name: 'xs', target: 'Mobile portrait' },
                                        { name: 'sm', target: 'Mobile landscape' },
                                        { name: 'md', target: 'Tablet' },
                                        { name: 'lg', target: 'Small desktop' },
                                        { name: 'xl', target: 'Desktop' },
                                        { name: '2xl', target: 'Large desktop' },
                                    ] as const
                                ).map((bp) => (
                                    <tr
                                        key={bp.name}
                                        className="border-b border-zinc-100 dark:border-zinc-800"
                                    >
                                        <td className="py-3 px-4 font-mono text-sm text-zinc-900 dark:text-zinc-100">
                                            {bp.name}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-sm text-zinc-600 dark:text-zinc-400">
                                            {breakpoints[bp.name]}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400">
                                            {bp.target}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>

                {/* =================================================================== */}
                {/* ANIMATION SECTION */}
                {/* =================================================================== */}
                <Section
                    title="Animation & Transitions"
                    description="Purposeful motion respecting prefers-reduced-motion."
                >
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Durations */}
                        <div>
                            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                                Durations
                            </h3>
                            <div className="space-y-2">
                                {Object.entries(animation.duration).map(([name, value]) => (
                                    <div key={name} className="flex items-center gap-4">
                                        <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400 w-20">
                                            {name}
                                        </span>
                                        <span className="text-sm text-zinc-500">{value}</span>
                                        <div className="h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full flex-1 max-w-[200px]">
                                            <div
                                                className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                                                style={{
                                                    width: `${(parseInt(value, 10) / 500) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Easing */}
                        <div>
                            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                                Easing Functions
                            </h3>
                            <div className="space-y-2">
                                {Object.entries(animation.easing).map(([name, value]) => (
                                    <div key={name} className="flex items-center gap-4">
                                        <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400 w-24">
                                            {name}
                                        </span>
                                        <code className="text-xs text-zinc-500 truncate max-w-[200px]">
                                            {value}
                                        </code>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Section>

                {/* =================================================================== */}
                {/* ICON SIZES SECTION */}
                {/* =================================================================== */}
                <Section title="Icon Sizes" description="Consistent icon sizing for UI elements.">
                    <div className="flex flex-wrap gap-8 items-end">
                        {Object.entries(iconSize).map(([name, size]) => (
                            <div key={name} className="flex flex-col items-center gap-2">
                                <div
                                    className="bg-zinc-300 dark:bg-zinc-600 rounded flex items-center justify-center"
                                    style={{ width: size, height: size }}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 256 256"
                                        className="text-zinc-700 dark:text-zinc-200"
                                        style={{ width: size * 0.75, height: size * 0.75 }}
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8Z"
                                        />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <span className="block font-mono text-xs text-zinc-700 dark:text-zinc-300">
                                        {name}
                                    </span>
                                    <span className="block text-xs text-zinc-400">{size}px</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Footer */}
                <footer className="py-12 text-center">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Aspendos Design System v1.0 • Built with Instrument Serif, Inter, and
                        Berkeley Mono
                    </p>
                </footer>
            </div>
        </main>
    );
}
