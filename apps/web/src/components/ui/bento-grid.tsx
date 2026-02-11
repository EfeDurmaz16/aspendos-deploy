import type { ComponentType, ReactNode } from 'react';
import { ArrowRightIcon } from '@radix-ui/react-icons';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GlowingEffect } from '@/components/ui/glowing-effect';

const BentoGrid = ({ children, className }: { children: ReactNode; className?: string }) => {
    return (
        <div className={cn('grid w-full auto-rows-[22rem] grid-cols-3 gap-4', className)}>
            {children}
        </div>
    );
};

const BentoCard = ({
    name,
    className,
    background,
    Icon,
    description,
    href,
    cta,
}: {
    name: string;
    className: string;
    background: ReactNode;
    Icon: ComponentType<{ className?: string }>;
    description: string;
    href: string;
    cta: string;
}) => (
    <div
        key={name}
        className={cn(
            'group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl',
            // Maia Glass styles
            'bg-white/50 dark:bg-zinc-900/50 backdrop-blur border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-lg transition-all hover:border-zinc-300 dark:hover:border-zinc-700',
            className
        )}
    >
        <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
        />
        <div>{background}</div>
        <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
            <Icon className="h-12 w-12 origin-left transform-gpu text-zinc-700 dark:text-zinc-300 transition-all duration-300 ease-in-out group-hover:scale-75" />
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{name}</h3>
            <p className="max-w-lg text-zinc-600 dark:text-zinc-400">{description}</p>
        </div>

        <div
            className={cn(
                'pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100'
            )}
        >
            <Button variant="ghost" asChild size="sm" className="pointer-events-auto">
                <a href={href}>
                    {cta}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                </a>
            </Button>
        </div>
        <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
    </div>
);

export { BentoCard, BentoGrid };
