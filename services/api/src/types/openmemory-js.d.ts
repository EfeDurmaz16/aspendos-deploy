/**
 * Type declarations for openmemory-js
 */
declare module 'openmemory-js' {
    export interface MemoryAddOptions {
        user_id: string;
        tags?: string[];
        metadata?: Record<string, unknown>;
    }

    export interface MemoryAddResult {
        id: string;
        content?: string;
        salience?: number;
        created_at?: string;
        metadata?: Record<string, unknown>;
    }

    export interface MemorySearchOptions {
        user_id: string;
        limit?: number;
        threshold?: number;
    }

    export interface MemoryListOptions {
        user_id: string;
        limit?: number;
        offset?: number;
    }

    export interface MemoryRecord {
        id: string;
        content: string;
        salience?: number;
        created_at?: string;
        metadata?: Record<string, unknown>;
        trace?: {
            recall_reason: string;
            waypoints?: string[];
        };
    }

    export class Memory {
        constructor();
        add(content: string, options: MemoryAddOptions): Promise<MemoryAddResult>;
        search(query: string, options: MemorySearchOptions): Promise<MemoryRecord[]>;
        list(options: MemoryListOptions): Promise<MemoryRecord[]>;
        delete(id: string): Promise<void>;
        reinforce(id: string): Promise<void>;
    }
}
