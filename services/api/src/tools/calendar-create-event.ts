import type { ReversibilityMetadata, ReverseResult, ToolContext, ToolDefinition, ToolResult } from '../reversibility/types';

const createdEvents = new Map<string, { title: string; start: string; end: string }>();

export const calendarCreateEventTool: ToolDefinition = {
    name: 'calendar.create_event',
    description: 'Create a calendar event (compensatable via DELETE)',

    classify(_args: unknown): ReversibilityMetadata {
        return {
            reversibility_class: 'compensatable',
            approval_required: false,
            rollback_strategy: {
                kind: 'compensation',
                compensate_tool: 'calendar.delete_event',
                compensate_args: {},
            },
            human_explanation: 'Calendar event will be created. Can be deleted to compensate.',
        };
    },

    async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
        const { title, start, end, calendar_id } = args as {
            title: string;
            start: string;
            end: string;
            calendar_id?: string;
        };

        if (!title || !start || !end) {
            return { success: false, error: 'Missing title, start, or end' };
        }

        const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        createdEvents.set(eventId, { title, start, end });

        return {
            success: true,
            data: { eventId, title, start, end, calendar_id },
        };
    },

    async reverse(actionId: string, _ctx: ToolContext): Promise<ReverseResult> {
        const event = createdEvents.get(actionId);
        if (!event) {
            return { success: false, message: 'Event not found — may already be deleted' };
        }

        createdEvents.delete(actionId);
        return { success: true, message: `Deleted calendar event "${event.title}"` };
    },
};
