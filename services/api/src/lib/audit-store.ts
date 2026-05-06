/**
 * In-Memory Audit Store with Ring Buffer
 *
 * Stores audit trail entries in memory with a ring buffer (last 10,000 entries).
 * Provides query, export, and statistics capabilities for audit compliance.
 */

export interface AuditEntry {
    id: string;
    userId: string | null;
    action: string;
    resource: string;
    method: string;
    path: string;
    statusCode?: number;
    timestamp: Date;
    ip?: string;
    userAgent?: string;
    duration?: number;
    requestId?: string;
}

export interface AuditFilters {
    userId?: string;
    action?: string;
    resource?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
}

export interface AuditStats {
    totalEntries: number;
    entriesByAction: Record<string, number>;
    entriesByResource: Record<string, number>;
    uniqueUsers: number;
    oldestEntry?: Date;
    newestEntry?: Date;
}

class AuditStore {
    private readonly MAX_ENTRIES = 10_000;
    private entries: AuditEntry[] = [];
    private nextIndex = 0;
    private isFull = false;

    /**
     * Record an audit entry
     */
    recordAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
        const auditEntry: AuditEntry = {
            ...entry,
            id: crypto.randomUUID(),
            timestamp: new Date(),
        };

        if (this.isFull) {
            // Overwrite oldest entry (ring buffer)
            this.entries[this.nextIndex] = auditEntry;
        } else {
            this.entries.push(auditEntry);
        }

        this.nextIndex = (this.nextIndex + 1) % this.MAX_ENTRIES;
        if (this.nextIndex === 0) {
            this.isFull = true;
        }
    }

    /**
     * Get audit log with optional filters and pagination
     */
    getAuditLog(filters?: AuditFilters): AuditEntry[] {
        let filtered = [...this.entries];

        // Apply filters
        if (filters?.userId) {
            filtered = filtered.filter((e) => e.userId === filters.userId);
        }

        if (filters?.action) {
            filtered = filtered.filter((e) => e.action === filters.action);
        }

        if (filters?.resource) {
            filtered = filtered.filter((e) => e.resource === filters.resource);
        }

        if (filters?.fromDate) {
            filtered = filtered.filter((e) => e.timestamp >= filters.fromDate!);
        }

        if (filters?.toDate) {
            filtered = filtered.filter((e) => e.timestamp <= filters.toDate!);
        }

        // Sort by timestamp descending (newest first)
        filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Apply pagination
        const offset = filters?.offset || 0;
        const limit = filters?.limit || 50;
        return filtered.slice(offset, offset + limit);
    }

    /**
     * Get audit statistics
     */
    getAuditStats(): AuditStats {
        const entriesByAction: Record<string, number> = {};
        const entriesByResource: Record<string, number> = {};
        const uniqueUserIds = new Set<string>();

        let oldestEntry: Date | undefined;
        let newestEntry: Date | undefined;

        for (const entry of this.entries) {
            // Count by action
            entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;

            // Count by resource
            entriesByResource[entry.resource] = (entriesByResource[entry.resource] || 0) + 1;

            // Track unique users
            if (entry.userId) {
                uniqueUserIds.add(entry.userId);
            }

            // Track oldest/newest
            if (!oldestEntry || entry.timestamp < oldestEntry) {
                oldestEntry = entry.timestamp;
            }
            if (!newestEntry || entry.timestamp > newestEntry) {
                newestEntry = entry.timestamp;
            }
        }

        return {
            totalEntries: this.entries.length,
            entriesByAction,
            entriesByResource,
            uniqueUsers: uniqueUserIds.size,
            oldestEntry,
            newestEntry,
        };
    }

    /**
     * Export all audit entries for a specific user (GDPR compliance)
     */
    exportAudit(userId: string): AuditEntry[] {
        return this.entries
            .filter((e) => e.userId === userId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Clear all audit entries (for testing only)
     */
    clearAudit_forTesting(): void {
        this.entries = [];
        this.nextIndex = 0;
        this.isFull = false;
    }

    /**
     * Get total count of entries matching filters
     */
    getCount(filters?: AuditFilters): number {
        let filtered = [...this.entries];

        if (filters?.userId) {
            filtered = filtered.filter((e) => e.userId === filters.userId);
        }

        if (filters?.action) {
            filtered = filtered.filter((e) => e.action === filters.action);
        }

        if (filters?.resource) {
            filtered = filtered.filter((e) => e.resource === filters.resource);
        }

        if (filters?.fromDate) {
            filtered = filtered.filter((e) => e.timestamp >= filters.fromDate!);
        }

        if (filters?.toDate) {
            filtered = filtered.filter((e) => e.timestamp <= filters.toDate!);
        }

        return filtered.length;
    }
}

// Singleton instance
export const auditStore = new AuditStore();
