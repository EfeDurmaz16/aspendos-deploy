'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowRight,
    CheckCheck,
    ChevronDown,
    ChevronRight,
    Loader2,
    MessageSquare,
    Search,
    Square,
} from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * YULA OS Import Preview Component
 * Design System v2.0 - Monolith Aesthetic
 *
 * Feature color: Electric Blue (#2563EB)
 * Shows parsed conversations before import
 */

export interface ParsedConversation {
    id: string;
    externalId: string;
    title: string;
    messageCount: number;
    createdAt: Date;
    updatedAt: Date;
    source: 'CHATGPT' | 'CLAUDE';
    preview?: string;
    selected: boolean;
}

interface ImportPreviewProps {
    conversations: ParsedConversation[];
    onSelectionChange: (id: string, selected: boolean) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onImport: () => void;
    isImporting?: boolean;
    className?: string;
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

export function ImportPreview({
    conversations,
    onSelectionChange,
    onSelectAll,
    onDeselectAll,
    onImport,
    isImporting = false,
    className,
}: ImportPreviewProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    const selectedCount = conversations.filter((c) => c.selected).length;
    const totalCount = conversations.length;
    const allSelected = selectedCount === totalCount;

    const filteredConversations = React.useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        const query = searchQuery.toLowerCase();
        return conversations.filter(
            (c) => c.title.toLowerCase().includes(query) || c.preview?.toLowerCase().includes(query)
        );
    }, [conversations, searchQuery]);

    // Group by date
    const groupedConversations = React.useMemo(() => {
        const groups: Record<string, ParsedConversation[]> = {};
        for (const conv of filteredConversations) {
            const key = formatDate(conv.updatedAt);
            if (!groups[key]) groups[key] = [];
            groups[key].push(conv);
        }
        return groups;
    }, [filteredConversations]);

    const totalMessages = conversations.reduce((sum, c) => sum + c.messageCount, 0);
    const selectedMessages = conversations
        .filter((c) => c.selected)
        .reduce((sum, c) => sum + c.messageCount, 0);

    return (
        <div className={cn('flex flex-col', className)}>
            {/* Header Stats */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Preview Import
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {totalCount} conversations found with {totalMessages.toLocaleString()}{' '}
                        messages
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={allSelected ? onDeselectAll : onSelectAll}
                        disabled={isImporting}
                    >
                        {allSelected ? (
                            <>
                                <Square className="w-4 h-4 mr-2" />
                                Deselect All
                            </>
                        ) : (
                            <>
                                <CheckCheck className="w-4 h-4 mr-2" />
                                Select All
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="py-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                        disabled={isImporting}
                    />
                </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto max-h-[400px] space-y-4">
                {Object.entries(groupedConversations).map(([date, convs]) => (
                    <div key={date}>
                        <div className="sticky top-0 bg-white dark:bg-zinc-950 py-2 z-10">
                            <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                {date}
                            </h4>
                        </div>
                        <div className="space-y-2">
                            {convs.map((conversation) => (
                                <ConversationItem
                                    key={conversation.id}
                                    conversation={conversation}
                                    isExpanded={expandedId === conversation.id}
                                    onToggleExpand={() =>
                                        setExpandedId(
                                            expandedId === conversation.id ? null : conversation.id
                                        )
                                    }
                                    onSelectionChange={onSelectionChange}
                                    disabled={isImporting}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {filteredConversations.length === 0 && (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                        No conversations found matching "{searchQuery}"
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {selectedCount}
                    </span>{' '}
                    of {totalCount} selected ({selectedMessages.toLocaleString()} messages)
                </div>

                <Button
                    variant="import"
                    onClick={onImport}
                    disabled={selectedCount === 0 || isImporting}
                >
                    {isImporting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Importing...
                        </>
                    ) : (
                        <>
                            Import Selected
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

interface ConversationItemProps {
    conversation: ParsedConversation;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onSelectionChange: (id: string, selected: boolean) => void;
    disabled: boolean;
}

function ConversationItem({
    conversation,
    isExpanded,
    onToggleExpand,
    onSelectionChange,
    disabled,
}: ConversationItemProps) {
    const sourceColors = {
        CHATGPT:
            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50',
        CLAUDE: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50',
    };

    return (
        <motion.div
            layout
            className={cn(
                'rounded-[8px] border transition-colors',
                conversation.selected
                    ? 'border-feature-import/50 bg-feature-import/5'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50'
            )}
        >
            <div
                className="flex items-start gap-3 p-3 cursor-pointer"
                onClick={() =>
                    !disabled && onSelectionChange(conversation.id, !conversation.selected)
                }
            >
                {/* Checkbox */}
                <Checkbox
                    checked={conversation.selected}
                    onCheckedChange={(checked) =>
                        onSelectionChange(conversation.id, checked === true)
                    }
                    disabled={disabled}
                    className="mt-0.5 data-[state=checked]:bg-feature-import data-[state=checked]:border-feature-import"
                />

                {/* Icon */}
                <div
                    className={cn(
                        'w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0',
                        sourceColors[conversation.source]
                    )}
                >
                    <MessageSquare className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
                            {conversation.title || 'Untitled Conversation'}
                        </h4>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                            {formatRelativeDate(conversation.updatedAt)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{conversation.messageCount} messages</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        <span
                            className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                sourceColors[conversation.source]
                            )}
                        >
                            {conversation.source}
                        </span>
                    </div>
                </div>

                {/* Expand Button */}
                {conversation.preview && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        disabled={disabled}
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                        )}
                    </button>
                )}
            </div>

            {/* Preview */}
            <AnimatePresence>
                {isExpanded && conversation.preview && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3 pt-0">
                            <div className="ml-11 p-3 rounded-[6px] bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-300 line-clamp-3">
                                {conversation.preview}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default ImportPreview;
