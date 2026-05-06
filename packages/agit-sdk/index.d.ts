export interface AgitClientOptions {
    agentId?: string;
    forcePureTs?: boolean;
    requireNative?: boolean;
}

export interface CommitOptions {
    memory: unknown;
    world_state?: Record<string, unknown>;
    message: string;
    action_type?: string;
    cost?: number;
    metadata?: Record<string, unknown>;
}

export interface LogOptions {
    branch?: string;
    limit?: number;
}

export interface RepoStatus {
    head: string | null;
    current_branch: string | null;
    branches: string[];
}

export interface AgitCommit {
    hash: string;
    metadata?: Record<string, unknown>;
    timestamp?: number | string;
}

export declare class AgitClient {
    static open(repoPath: string, options?: AgitClientOptions): Promise<AgitClient>;
    commit(options: CommitOptions): Promise<string>;
    log(options?: LogOptions): Promise<AgitCommit[]>;
    getState(hash: string): Promise<unknown>;
    revert(hash: string): Promise<unknown>;
    status(): RepoStatus;
}
