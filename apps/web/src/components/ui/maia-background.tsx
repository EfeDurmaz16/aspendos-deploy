import React from 'react';

/**
 * YULA Monolith Background
 * Uses subtle amber glow - no purple/blue gradients
 */
export const MaiaBackground = () => {
    return (
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-amber-100/10 to-transparent dark:from-amber-900/10 rounded-full blur-3xl" />
            <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-gradient-to-bl from-amber-50/8 to-transparent dark:from-amber-800/8 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 w-[700px] h-[700px] bg-gradient-to-t from-emerald-100/10 to-transparent dark:from-emerald-900/5 rounded-full blur-3xl" />
        </div>
    );
};
