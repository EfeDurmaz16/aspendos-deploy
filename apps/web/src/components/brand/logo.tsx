/**
 * YULA brand mark — inline SVG so it inherits `currentColor` and is styleable.
 * Source of truth: /brand/yula-mark.svg (keep in sync if geometry changes).
 *
 *   <LogoMark />             // 40×40 color mark
 *   <LogoMark size={24} />   // nav / small surfaces
 *   <LogoMark variant="mono" /> // no orange, pure currentColor
 *   <LogoWordmark size={32} /> // mark + "yula" lockup
 */
import type { SVGProps } from 'react';

export interface LogoMarkProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox'> {
    /** Rendered pixel size of the bounding box. Defaults to 40. */
    size?: number;
    /** 'color' keeps the orange inner tier, 'mono' uses currentColor everywhere. */
    variant?: 'color' | 'mono';
    /** Accent color for the filled inner tier. Only used when variant='color'. */
    accent?: string;
    className?: string;
}

const DEFAULT_ACCENT = '#FF8A3D';

export function LogoMark({
    size = 40,
    variant = 'color',
    accent = DEFAULT_ACCENT,
    className,
    ...rest
}: LogoMarkProps) {
    const innerFill = variant === 'color' ? accent : 'currentColor';
    // viewBox mirrors brand/yula-mark.svg — 64x48 Aspendos cavea silhouette.
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 48"
            width={size}
            height={(size * 48) / 64}
            fill="none"
            role="img"
            aria-label="YULA"
            className={className}
            {...rest}
        >
            <path
                d="M 4 40 A 28 28 0 0 1 60 40"
                stroke="currentColor"
                strokeWidth={4}
                strokeLinecap="round"
            />
            <path
                d="M 12 40 A 20 20 0 0 1 52 40"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                opacity={0.72}
            />
            <path d="M 20 40 A 12 12 0 0 1 44 40 Z" fill={innerFill} />
        </svg>
    );
}

export interface LogoWordmarkProps extends LogoMarkProps {
    /** Rendered height of the lockup in px. Width scales proportionally. */
    size?: number;
}

export function LogoWordmark({
    size = 40,
    variant = 'color',
    accent = DEFAULT_ACCENT,
    className,
    ...rest
}: LogoWordmarkProps) {
    const innerFill = variant === 'color' ? accent : 'currentColor';
    // viewBox 180x48 — mark + "yula" Manrope 800 lockup. Mirrors
    // brand/yula-wordmark.svg.
    const width = (size * 180) / 48;
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 180 48"
            width={width}
            height={size}
            fill="none"
            role="img"
            aria-label="YULA"
            className={className}
            {...rest}
        >
            <g>
                <path
                    d="M 4 40 A 28 28 0 0 1 60 40"
                    stroke="currentColor"
                    strokeWidth={4}
                    strokeLinecap="round"
                />
                <path
                    d="M 12 40 A 20 20 0 0 1 52 40"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.72}
                />
                <path d="M 20 40 A 12 12 0 0 1 44 40 Z" fill={innerFill} />
            </g>
            <text
                x={74}
                y={38}
                fontFamily="Manrope, -apple-system, sans-serif"
                fontWeight={800}
                fontSize={36}
                letterSpacing="-1.2"
                fill="currentColor"
            >
                yula
            </text>
        </svg>
    );
}

/** Default export: mark-only, for convenient `import Logo from '...'`. */
export const Logo = LogoMark;
export default LogoMark;
