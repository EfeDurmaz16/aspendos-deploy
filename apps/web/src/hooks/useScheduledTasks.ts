'use client';

import { useCallback, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface ScheduledTask {
    id: string;
    chatId: string;
    triggerAt: string;
    triggerAtFormatted: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELED';
    intent: string;
    topic?: string;
    tone?: string;
    channelPref?: string;
    contextSummary?: string;
    resultMessage?: string;
    executedAt?: string;
    createdAt: string;
}

interface UseScheduledTasksOptions {
    chatId?: string;
    status?: ScheduledTask['status'];
    autoRefresh?: boolean;
    refreshInterval?: number;
}

/**
 * Hook to manage scheduled tasks for proactive follow-ups
 */
export function useScheduledTasks(options: UseScheduledTasksOptions = {}) {
    const [tasks, setTasks] = useState<ScheduledTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (options.chatId) params.set('chatId', options.chatId);
            if (options.status) params.set('status', options.status);

            const response = await fetch(`${API_URL}/api/scheduler/tasks?${params}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch scheduled tasks');
            }

            const data = await response.json();
            setTasks(data.tasks || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [options.chatId, options.status]);

    // Initial fetch
    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Auto-refresh
    useEffect(() => {
        if (!options.autoRefresh) return;

        const interval = setInterval(fetchTasks, options.refreshInterval || 30000);
        return () => clearInterval(interval);
    }, [fetchTasks, options.autoRefresh, options.refreshInterval]);

    /**
     * Create a new scheduled task
     */
    const createTask = useCallback(
        async (input: {
            chatId: string;
            triggerAt: string;
            intent: string;
            contextSummary?: string;
            topic?: string;
            tone?: 'friendly' | 'professional' | 'encouraging';
            channelPref?: 'auto' | 'push' | 'email' | 'in_app';
            metadata?: Record<string, unknown>;
        }): Promise<ScheduledTask | null> => {
            try {
                const response = await fetch(`${API_URL}/api/scheduler/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(input),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create task');
                }

                const task = await response.json();

                // Add to local state
                setTasks((prev) =>
                    [...prev, task].sort(
                        (a, b) => new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime()
                    )
                );

                return task;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                return null;
            }
        },
        []
    );

    /**
     * Cancel a scheduled task
     */
    const cancelTask = useCallback(async (taskId: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/api/scheduler/tasks/${taskId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to cancel task');
            }

            // Remove from local state
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            return false;
        }
    }, []);

    /**
     * Reschedule a task
     */
    const rescheduleTask = useCallback(
        async (taskId: string, newTriggerAt: string): Promise<ScheduledTask | null> => {
            try {
                const response = await fetch(`${API_URL}/api/scheduler/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ triggerAt: newTriggerAt }),
                });

                if (!response.ok) {
                    throw new Error('Failed to reschedule task');
                }

                const updatedTask = await response.json();

                // Update local state
                setTasks((prev) =>
                    prev
                        .map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t))
                        .sort(
                            (a, b) =>
                                new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime()
                        )
                );

                return updatedTask;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                return null;
            }
        },
        []
    );

    /**
     * Get pending tasks for a specific chat
     */
    const getPendingTasksForChat = useCallback(
        (chatId: string): ScheduledTask[] => {
            return tasks.filter((t) => t.chatId === chatId && t.status === 'PENDING');
        },
        [tasks]
    );

    return {
        tasks,
        isLoading,
        error,
        fetchTasks,
        createTask,
        cancelTask,
        rescheduleTask,
        getPendingTasksForChat,
    };
}

export default useScheduledTasks;
