/**
 * calendar-create — Compensatable tool
 *
 * Creates a Google Calendar event. To reverse, the event is deleted
 * via the calendar API (compensation action).
 *
 * Reversibility: compensatable (orange badge)
 * Rollback: compensation — DELETE the created event
 */

import type { ReversibleToolDef, AgitCommit } from '@/lib/reversibility/types';

export const calendarCreate: ReversibleToolDef = {
    name: 'calendar-create',
    description: 'Create a Google Calendar event. Reversible by deleting the event.',
    reversibility_class: 'compensatable',

    classify(args: Record<string, unknown>) {
        return {
            reversibility_class: 'compensatable' as const,
            rollback_strategy: {
                kind: 'compensation' as const,
                compensate_tool: 'calendar-delete',
                compensate_args: {
                    // event_id is filled after creation
                    event_id: (args.event_id as string) ?? 'pending',
                    calendar_id: (args.calendar_id as string) ?? 'primary',
                },
            },
            human_explanation: `Create calendar event "${args.title ?? args.summary ?? 'Untitled'}" on ${args.date ?? args.start ?? 'unspecified date'}. Can be deleted to reverse.`,
        };
    },

    async execute(args: Record<string, unknown>) {
        const title = (args.title ?? args.summary) as string;
        const start = args.start as string;
        const end = args.end as string;
        const calendarId = (args.calendar_id as string) ?? 'primary';
        const description = args.description as string | undefined;

        if (!title || !start) {
            return { success: false, error: 'Missing required args: title/summary, start' };
        }

        try {
            const res = await fetch('/api/calendar/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary: title,
                    start,
                    end: end ?? start,
                    calendar_id: calendarId,
                    description,
                }),
            });

            if (!res.ok) {
                return { success: false, error: `Calendar API error: ${res.statusText}` };
            }

            const data = await res.json();
            return {
                success: true,
                data: {
                    event_id: data.event_id ?? data.id,
                    calendar_id: calendarId,
                    summary: title,
                    html_link: data.htmlLink,
                },
            };
        } catch (err) {
            return {
                success: false,
                error: `Calendar error: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    },

    async rollback(commit: AgitCommit) {
        const strategy = commit.rollback_strategy;
        if (!strategy || strategy.kind !== 'compensation') {
            return { success: false, message: 'No compensation strategy found.' };
        }

        // Get the actual event_id from the execution result
        const result = commit.result as Record<string, unknown> | undefined;
        const eventId = (result?.event_id ?? strategy.compensate_args.event_id) as string;
        const calendarId = (strategy.compensate_args.calendar_id as string) ?? 'primary';

        if (!eventId || eventId === 'pending') {
            return {
                success: false,
                message: 'No event ID found — event may not have been created.',
            };
        }

        try {
            const res = await fetch('/api/calendar/events', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: eventId,
                    calendar_id: calendarId,
                }),
            });

            if (!res.ok) {
                return { success: false, message: `Failed to delete event: ${res.statusText}` };
            }

            return {
                success: true,
                message: `Calendar event ${eventId} deleted.`,
                reverted_commit_hash: commit.hash,
            };
        } catch (err) {
            return {
                success: false,
                message: `Delete error: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    },
};
