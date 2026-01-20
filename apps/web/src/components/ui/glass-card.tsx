
import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
    padding?: "none" | "sm" | "md" | "lg";
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, children, padding = "md", ...props }, ref) => {
        const paddingStyles = {
            none: "p-0",
            sm: "p-4",
            md: "p-6",
            lg: "p-8",
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-[20px] shadow-2xl",
                    paddingStyles[padding],
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

GlassCard.displayName = "GlassCard";
