export interface NemoClawContext {
    sandboxId: string;
    userId: string;
    networkPolicy?: string;
    securityProfile?: string;
}

export interface GovernedResult {
    status: 'executed' | 'blocked' | 'awaiting_approval';
    commitHash: string;
    reversibilityClass: string;
    badge: string;
    sandboxId: string;
    result?: unknown;
    error?: string;
}
