'use client';

import { motion } from 'framer-motion';
import { CheckIcon, CopyIcon, GiftIcon, ShareIcon, SparklesIcon, UsersIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ReferralCardProps {
    referralCode: string;
    totalReferrals: number;
    proDaysEarned: number;
    shareUrl?: string;
    className?: string;
}

export function ReferralCard({
    referralCode,
    totalReferrals,
    proDaysEarned,
    shareUrl,
    className,
}: ReferralCardProps) {
    const [copied, setCopied] = useState(false);

    const fullUrl = shareUrl || `https://yula.dev/signup?ref=${referralCode}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join me on YULA!',
                    text: "I've been using YULA for AI conversations. Join with my link and we both get free Pro days!",
                    url: fullUrl,
                });
            } catch (err) {
                // User cancelled or share failed
                console.error('Share failed:', err);
            }
        } else {
            handleCopy();
        }
    };

    return (
        <div
            className={cn(
                'p-6 rounded-xl border bg-gradient-to-br from-pink-500/5 to-violet-500/5 border-pink-500/20',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <GiftIcon className="w-5 h-5 text-pink-500" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">Invite Friends</h3>
                    <p className="text-xs text-muted-foreground">
                        Earn 7 Pro days for each friend who signs up
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-background/50 border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <UsersIcon className="w-4 h-4" />
                        <span className="text-xs">Friends Invited</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{totalReferrals}</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <SparklesIcon className="w-4 h-4" />
                        <span className="text-xs">Pro Days Earned</span>
                    </div>
                    <p className="text-2xl font-bold text-pink-500">{proDaysEarned}</p>
                </div>
            </div>

            {/* Referral Code */}
            <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1 block">
                    Your Referral Link
                </label>
                <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border text-sm font-mono truncate">
                        {fullUrl}
                    </div>
                    <motion.button
                        className={cn(
                            'flex-shrink-0 p-2 rounded-lg border transition-colors',
                            copied
                                ? 'bg-green-500/10 border-green-500/30 text-green-500'
                                : 'bg-background hover:bg-muted'
                        )}
                        onClick={handleCopy}
                        whileTap={{ scale: 0.95 }}
                    >
                        {copied ? (
                            <CheckIcon className="w-4 h-4" />
                        ) : (
                            <CopyIcon className="w-4 h-4" />
                        )}
                    </motion.button>
                </div>
            </div>

            {/* Share Button */}
            <motion.button
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 text-white font-medium flex items-center justify-center gap-2"
                onClick={handleShare}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <ShareIcon className="w-4 h-4" />
                Share with Friends
            </motion.button>

            {/* Rewards explanation */}
            <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                    You get <span className="text-pink-500 font-medium">7 days</span> of Pro when
                    friends sign up, and <span className="text-pink-500 font-medium">30 days</span>{' '}
                    when they upgrade to Pro!
                </p>
            </div>
        </div>
    );
}

interface ReferralInputProps {
    onSubmit: (code: string) => Promise<void>;
    isLoading?: boolean;
    error?: string;
    className?: string;
}

export function ReferralInput({
    onSubmit,
    isLoading = false,
    error,
    className,
}: ReferralInputProps) {
    const [code, setCode] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.trim()) {
            await onSubmit(code.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className={cn('', className)}>
            <label className="text-sm font-medium text-foreground mb-2 block">
                Have a referral code?
            </label>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    maxLength={8}
                    className={cn(
                        'flex-1 px-3 py-2 rounded-lg border bg-background text-sm font-mono uppercase',
                        'focus:outline-none focus:ring-2 focus:ring-violet-500/50',
                        error && 'border-red-500'
                    )}
                />
                <motion.button
                    type="submit"
                    disabled={isLoading || !code.trim()}
                    className={cn(
                        'px-4 py-2 rounded-lg font-medium text-sm',
                        'bg-violet-500 text-white',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {isLoading ? 'Applying...' : 'Apply'}
                </motion.button>
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </form>
    );
}

interface ReferralProgressProps {
    referrals: Array<{
        id: string;
        name?: string;
        email?: string;
        status: 'pending' | 'active' | 'converted';
        createdAt: string;
    }>;
    className?: string;
}

export function ReferralProgress({ referrals, className }: ReferralProgressProps) {
    const statusColors = {
        pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
        active: 'bg-green-500/10 text-green-500 border-green-500/30',
        converted: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
    };

    const statusLabels = {
        pending: 'Pending',
        active: 'Active',
        converted: 'Pro User',
    };

    if (referrals.length === 0) {
        return (
            <div className={cn('text-center py-8', className)}>
                <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                    No referrals yet. Share your link to get started!
                </p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-2', className)}>
            {referrals.map((referral) => (
                <div
                    key={referral.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background/50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                            {referral.name?.[0] || referral.email?.[0] || '?'}
                        </div>
                        <div>
                            <p className="font-medium text-foreground text-sm">
                                {referral.name || referral.email || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {new Date(referral.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <span
                        className={cn(
                            'px-2 py-1 rounded-md text-xs font-medium border',
                            statusColors[referral.status]
                        )}
                    >
                        {statusLabels[referral.status]}
                    </span>
                </div>
            ))}
        </div>
    );
}
