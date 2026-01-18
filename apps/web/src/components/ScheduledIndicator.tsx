'use client';

import { useState } from 'react';
import { Clock, X, Edit2, Check } from 'lucide-react';

interface ScheduledTask {
    id: string;
    chatId: string;
    triggerAt: string;
    triggerAtFormatted: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELED';
    intent: string;
    topic?: string;
    tone?: string;
}

interface ScheduledIndicatorProps {
    task: ScheduledTask;
    onCancel?: (taskId: string) => Promise<void>;
    onReschedule?: (taskId: string, newTime: string) => Promise<void>;
    minimal?: boolean;
}

/**
 * ScheduledIndicator - Shows when a follow-up is scheduled
 *
 * Displays a toast-like indicator when the AI has scheduled a proactive follow-up.
 * Allows the user to cancel or reschedule the task.
 */
export function ScheduledIndicator({
    task,
    onCancel,
    onReschedule,
    minimal = false,
}: ScheduledIndicatorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newTime, setNewTime] = useState('');

    const handleCancel = async () => {
        if (!onCancel) return;
        setIsLoading(true);
        try {
            await onCancel(task.id);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReschedule = async () => {
        if (!onReschedule || !newTime) return;
        setIsLoading(true);
        try {
            await onReschedule(task.id, newTime);
            setIsEditing(false);
            setNewTime('');
        } finally {
            setIsLoading(false);
        }
    };

    if (task.status !== 'PENDING') {
        return null;
    }

    // Minimal view for inline display
    if (minimal) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <Clock className="w-3 h-3" />
                <span>Follow-up {task.triggerAtFormatted}</span>
            </span>
        );
    }

    return (
        <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            {/* Icon */}
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-full">
                <Clock className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Follow-up scheduled
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {task.triggerAtFormatted}
                    {task.topic && <span className="ml-1">- {task.topic}</span>}
                </p>
                {task.intent && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-1">
                        {task.intent}
                    </p>
                )}

                {/* Edit time input */}
                {isEditing && (
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="text"
                            placeholder="e.g., tomorrow, in 3 days"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            className="flex-1 px-2 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleReschedule}
                            disabled={isLoading || !newTime}
                            className="p-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                {onReschedule && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        disabled={isLoading}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                        title="Reschedule"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}
                {onCancel && (
                    <button
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                        title="Cancel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * ScheduledTasksList - Shows all scheduled tasks for a chat
 */
interface ScheduledTasksListProps {
    tasks: ScheduledTask[];
    onCancel?: (taskId: string) => Promise<void>;
    onReschedule?: (taskId: string, newTime: string) => Promise<void>;
}

export function ScheduledTasksList({
    tasks,
    onCancel,
    onReschedule,
}: ScheduledTasksListProps) {
    const pendingTasks = tasks.filter((t) => t.status === 'PENDING');

    if (pendingTasks.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            {pendingTasks.map((task) => (
                <ScheduledIndicator
                    key={task.id}
                    task={task}
                    onCancel={onCancel}
                    onReschedule={onReschedule}
                />
            ))}
        </div>
    );
}

/**
 * ScheduledToast - Toast notification for newly scheduled tasks
 */
interface ScheduledToastProps {
    task: ScheduledTask;
    onDismiss?: () => void;
    onCancel?: (taskId: string) => Promise<void>;
}

export function ScheduledToast({ task, onDismiss, onCancel }: ScheduledToastProps) {
    const handleCancel = async () => {
        if (onCancel) {
            await onCancel(task.id);
        }
        onDismiss?.();
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg max-w-sm">
                <Clock className="w-5 h-5 text-zinc-500" />
                <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Follow-up scheduled for {task.triggerAtFormatted}
                    </p>
                    {task.topic && (
                        <p className="text-xs text-zinc-500 mt-0.5">{task.topic}</p>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {onCancel && (
                        <button
                            onClick={handleCancel}
                            className="text-xs text-zinc-500 hover:text-red-500 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={onDismiss}
                        className="p-1 text-zinc-400 hover:text-zinc-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ScheduledIndicator;
