'use client';

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface DockProps {
    className?: string
    items: {
        icon: React.ElementType
        label: string
        onClick?: () => void
        href?: string
    }[]
}

interface DockIconButtonProps {
    icon: React.ElementType
    label: string
    onClick?: () => void
    className?: string
}

const floatingAnimation = {
    initial: { y: 0 },
    animate: {
        y: [-2, 2, -2],
        transition: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut" as const
        }
    }
} satisfies import("framer-motion").Variants;

const DockIconButton = React.forwardRef<HTMLButtonElement, DockIconButtonProps>(
    ({ icon: Icon, label, onClick, className }, ref) => {
        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClick}
                className={cn(
                    "relative group p-3 rounded-lg",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    className
                )}
            >
                <Icon className="w-6 h-6 text-foreground/80 group-hover:text-foreground" weight="duotone" />
                <span className={cn(
                    "absolute -top-10 left-1/2 -translate-x-1/2",
                    "px-2 py-1 rounded text-xs",
                    "bg-popover text-popover-foreground border shadow-sm",
                    "opacity-0 group-hover:opacity-100",
                    "transition-opacity whitespace-nowrap pointer-events-none"
                )}>
                    {label}
                </span>
            </motion.button>
        )
    }
)
DockIconButton.displayName = "DockIconButton"

const Dock = React.forwardRef<HTMLDivElement, DockProps & { children?: React.ReactNode }>(
    ({ items, className, children }, ref) => {
        const [isVisible, setIsVisible] = React.useState(true);

        React.useEffect(() => {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.metaKey && e.key === 'd') {
                    e.preventDefault();
                    setIsVisible((prev) => !prev);
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, []);

        return (
            <>
                {/* Mouse trigger area for when dock is hidden */}
                {!isVisible && (
                    <div
                        className="fixed bottom-0 left-0 right-0 h-4 z-50 bg-transparent"
                        onMouseEnter={() => setIsVisible(true)}
                    />
                )}

                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                        opacity: isVisible ? 1 : 0,
                        y: isVisible ? 0 : 20,
                        pointerEvents: isVisible ? 'auto' : 'none'
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className={cn(
                        "fixed bottom-6 left-0 right-0 z-50 flex items-center justify-center pointer-events-none",
                        className
                    )}
                >
                    <div className="pointer-events-auto">
                        <motion.div
                            initial="initial"
                            animate="animate"
                            variants={floatingAnimation}
                            className={cn(
                                "flex items-center gap-2 p-3 rounded-2xl",
                                "backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl",
                                "bg-white/40 dark:bg-black/40",
                                "hover:shadow-3xl transition-shadow duration-300 ring-1 ring-black/5"
                            )}
                        >
                            {items.map((item) => (
                                <DockIconButton key={item.label} {...item} />
                            ))}
                            {children && (
                                <>
                                    <div className="w-px h-6 bg-white/20 dark:bg-white/10 mx-1" />
                                    {children}
                                </>
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            </>
        )
    }
)
Dock.displayName = "Dock"

export { Dock }
