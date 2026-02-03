'use client';

/**
 * Skip Link Component
 *
 * Provides keyboard users a way to skip navigation and go directly to main content.
 * This is a critical accessibility feature for users who navigate with keyboard.
 *
 * WCAG 2.1 Success Criterion 2.4.1: Bypass Blocks (Level A)
 */
export function SkipLink() {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.focus();
            mainContent.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <a
            href="#main-content"
            onClick={handleClick}
            className="
                sr-only focus:not-sr-only
                focus:fixed focus:top-4 focus:left-4 focus:z-[9999]
                focus:px-4 focus:py-2
                focus:bg-primary focus:text-primary-foreground
                focus:rounded-md focus:shadow-lg
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                font-medium text-sm
                transition-all duration-200
            "
            aria-label="Skip to main content"
        >
            Skip to main content
        </a>
    );
}
