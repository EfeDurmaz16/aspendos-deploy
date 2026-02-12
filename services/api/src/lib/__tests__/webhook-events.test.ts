import { describe, expect, it } from 'vitest';
import { getWebhookCategories, getWebhookEventsCatalog } from '../webhook-events';

describe('webhook-events', () => {
    describe('getWebhookEventsCatalog', () => {
        it('returns all events when no category specified', () => {
            const events = getWebhookEventsCatalog();

            expect(Array.isArray(events)).toBe(true);
            expect(events.length).toBeGreaterThan(0);
        });

        it('filters by category - chat', () => {
            const chatEvents = getWebhookEventsCatalog('chat');

            expect(Array.isArray(chatEvents)).toBe(true);
            expect(chatEvents.length).toBeGreaterThan(0);

            for (const event of chatEvents) {
                expect(event.category).toBe('chat');
            }
        });

        it('filters by category - memory', () => {
            const memoryEvents = getWebhookEventsCatalog('memory');

            expect(Array.isArray(memoryEvents)).toBe(true);

            for (const event of memoryEvents) {
                expect(event.category).toBe('memory');
            }
        });

        it('filters by category - council', () => {
            const councilEvents = getWebhookEventsCatalog('council');

            expect(Array.isArray(councilEvents)).toBe(true);

            for (const event of councilEvents) {
                expect(event.category).toBe('council');
            }
        });

        it('filters by category - pac', () => {
            const pacEvents = getWebhookEventsCatalog('pac');

            expect(Array.isArray(pacEvents)).toBe(true);

            for (const event of pacEvents) {
                expect(event.category).toBe('pac');
            }
        });

        it('filters by category - billing', () => {
            const billingEvents = getWebhookEventsCatalog('billing');

            expect(Array.isArray(billingEvents)).toBe(true);

            for (const event of billingEvents) {
                expect(event.category).toBe('billing');
            }
        });

        it('filters by category - user', () => {
            const userEvents = getWebhookEventsCatalog('user');

            expect(Array.isArray(userEvents)).toBe(true);

            for (const event of userEvents) {
                expect(event.category).toBe('user');
            }
        });

        it('returns empty array for non-existent category', () => {
            const events = getWebhookEventsCatalog('non_existent_category');

            expect(Array.isArray(events)).toBe(true);
            expect(events.length).toBe(0);
        });

        it('events have required fields', () => {
            const events = getWebhookEventsCatalog();

            for (const event of events) {
                expect(event).toHaveProperty('event');
                expect(event).toHaveProperty('description');
                expect(event).toHaveProperty('category');
                expect(event).toHaveProperty('payloadExample');

                expect(typeof event.event).toBe('string');
                expect(typeof event.description).toBe('string');
                expect(typeof event.category).toBe('string');
                expect(typeof event.payloadExample).toBe('object');
            }
        });

        it('event names follow naming convention', () => {
            const events = getWebhookEventsCatalog();
            const eventNamePattern = /^[a-z]+\.[a-z]+(\.[a-z]+)?$/;

            for (const event of events) {
                expect(event.event).toMatch(eventNamePattern);
            }
        });

        it('descriptions are non-empty strings', () => {
            const events = getWebhookEventsCatalog();

            for (const event of events) {
                expect(event.description.length).toBeGreaterThan(0);
            }
        });

        it('payloadExample is a non-empty object', () => {
            const events = getWebhookEventsCatalog();

            for (const event of events) {
                expect(event.payloadExample).toBeTruthy();
                expect(Object.keys(event.payloadExample).length).toBeGreaterThan(0);
            }
        });

        it('includes specific known events', () => {
            const events = getWebhookEventsCatalog();
            const eventNames = events.map((e) => e.event);

            expect(eventNames).toContain('chat.created');
            expect(eventNames).toContain('chat.message.sent');
            expect(eventNames).toContain('memory.created');
            expect(eventNames).toContain('council.completed');
            expect(eventNames).toContain('pac.reminder.triggered');
            expect(eventNames).toContain('billing.subscription.created');
            expect(eventNames).toContain('user.import.completed');
        });
    });

    describe('getWebhookCategories', () => {
        it('returns array of unique categories', () => {
            const categories = getWebhookCategories();

            expect(Array.isArray(categories)).toBe(true);
            expect(categories.length).toBeGreaterThan(0);
        });

        it('returns unique values only', () => {
            const categories = getWebhookCategories();
            const uniqueCategories = [...new Set(categories)];

            expect(categories.length).toBe(uniqueCategories.length);
        });

        it('includes known categories', () => {
            const categories = getWebhookCategories();

            expect(categories).toContain('chat');
            expect(categories).toContain('memory');
            expect(categories).toContain('council');
            expect(categories).toContain('pac');
            expect(categories).toContain('billing');
            expect(categories).toContain('user');
        });

        it('all categories are strings', () => {
            const categories = getWebhookCategories();

            for (const category of categories) {
                expect(typeof category).toBe('string');
                expect(category.length).toBeGreaterThan(0);
            }
        });

        it('matches categories from event catalog', () => {
            const categories = getWebhookCategories();
            const allEvents = getWebhookEventsCatalog();
            const eventCategories = [...new Set(allEvents.map((e) => e.category))];

            expect(categories.sort()).toEqual(eventCategories.sort());
        });
    });
});
