'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { MedalIcon, CrownIcon } from 'lucide-react';
import { LevelBadge } from './level-badge';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  image?: string;
  totalXp: number;
  level: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserRank?: number;
  className?: string;
}

export function Leaderboard({
  entries,
  currentUserRank,
  className,
}: LeaderboardProps) {
  // Top 3 for podium
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className={className}>
      {/* Podium for top 3 */}
      {top3.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8 px-4">
          {/* 2nd place */}
          <PodiumCard entry={top3[1]} position={2} />
          {/* 1st place */}
          <PodiumCard entry={top3[0]} position={1} />
          {/* 3rd place */}
          <PodiumCard entry={top3[2]} position={3} />
        </div>
      )}

      {/* Rest of leaderboard */}
      <div className="space-y-2">
        {rest.map((entry, index) => (
          <LeaderboardRow key={entry.userId} entry={entry} index={index + 4} />
        ))}
      </div>

      {/* Current user position if not in top 10 */}
      {currentUserRank && currentUserRank > entries.length && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Your rank:</span>
            <span className="font-bold text-violet-500">#{currentUserRank}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface PodiumCardProps {
  entry: LeaderboardEntry;
  position: 1 | 2 | 3;
}

function PodiumCard({ entry, position }: PodiumCardProps) {
  const positionConfig = {
    1: {
      height: 'h-32',
      bgColor: 'from-amber-400 to-amber-600',
      borderColor: 'border-amber-500/50',
      icon: CrownIcon,
      iconColor: 'text-amber-400',
    },
    2: {
      height: 'h-24',
      bgColor: 'from-slate-300 to-slate-500',
      borderColor: 'border-slate-400/50',
      icon: MedalIcon,
      iconColor: 'text-slate-300',
    },
    3: {
      height: 'h-20',
      bgColor: 'from-amber-600 to-amber-800',
      borderColor: 'border-amber-700/50',
      icon: MedalIcon,
      iconColor: 'text-amber-600',
    },
  };

  const config = positionConfig[position];
  const Icon = config.icon;

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center',
        position === 1 ? 'order-2' : position === 2 ? 'order-1' : 'order-3'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position === 1 ? 0 : position === 2 ? 0.1 : 0.2 }}
    >
      {/* Avatar */}
      <div className="relative mb-2">
        <div
          className={cn(
            'w-14 h-14 rounded-full border-2 overflow-hidden bg-muted',
            config.borderColor,
            entry.isCurrentUser && 'ring-2 ring-violet-500'
          )}
        >
          {entry.image ? (
            <img
              src={entry.image}
              alt={entry.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold">
              {entry.name[0]}
            </div>
          )}
        </div>
        <div
          className={cn(
            'absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center',
            `bg-gradient-to-br ${config.bgColor}`
          )}
        >
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {/* Name */}
      <p
        className={cn(
          'text-sm font-medium truncate max-w-[80px] text-center',
          entry.isCurrentUser && 'text-violet-500'
        )}
      >
        {entry.name}
      </p>

      {/* XP */}
      <p className="text-xs text-muted-foreground">
        {entry.totalXp.toLocaleString()} XP
      </p>

      {/* Podium */}
      <div
        className={cn(
          'w-20 rounded-t-lg mt-2 flex items-center justify-center',
          `bg-gradient-to-t ${config.bgColor}`,
          config.height
        )}
      >
        <span className="text-white font-bold text-xl">{position}</span>
      </div>
    </motion.div>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
}

function LeaderboardRow({ entry, index }: LeaderboardRowProps) {
  return (
    <motion.div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        entry.isCurrentUser
          ? 'bg-violet-500/10 border-violet-500/30'
          : 'bg-background/50 border-border'
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: (index - 4) * 0.05 }}
    >
      {/* Rank */}
      <div className="w-8 text-center">
        <span
          className={cn(
            'font-bold',
            entry.isCurrentUser ? 'text-violet-500' : 'text-muted-foreground'
          )}
        >
          {entry.rank}
        </span>
      </div>

      {/* Avatar */}
      <div
        className={cn(
          'w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0',
          entry.isCurrentUser && 'ring-2 ring-violet-500'
        )}
      >
        {entry.image ? (
          <img
            src={entry.image}
            alt={entry.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-medium">
            {entry.name[0]}
          </div>
        )}
      </div>

      {/* Name & Level */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium truncate',
            entry.isCurrentUser && 'text-violet-500'
          )}
        >
          {entry.name}
          {entry.isCurrentUser && (
            <span className="text-xs ml-1 text-muted-foreground">(You)</span>
          )}
        </p>
        <div className="flex items-center gap-1">
          <LevelBadge level={entry.level} size="sm" showLevel={false} />
          <span className="text-xs text-muted-foreground">Level {entry.level}</span>
        </div>
      </div>

      {/* XP */}
      <div className="text-right">
        <p className="font-semibold text-foreground">
          {entry.totalXp.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">XP</p>
      </div>
    </motion.div>
  );
}

interface LeaderboardTabsProps {
  activeTab: 'all-time' | 'monthly' | 'weekly';
  onChange: (tab: 'all-time' | 'monthly' | 'weekly') => void;
  className?: string;
}

export function LeaderboardTabs({
  activeTab,
  onChange,
  className,
}: LeaderboardTabsProps) {
  const tabs = [
    { id: 'weekly' as const, label: 'This Week' },
    { id: 'monthly' as const, label: 'This Month' },
    { id: 'all-time' as const, label: 'All Time' },
  ];

  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-muted', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
