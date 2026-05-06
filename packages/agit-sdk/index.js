import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let nativeModule = null;
try {
    nativeModule = require('@agit/core');
} catch {
    nativeModule = null;
}

function canonicalize(value) {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item) => canonicalize(item));
    return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
            if (value[key] !== undefined) acc[key] = canonicalize(value[key]);
            return acc;
        }, {});
}

async function sha256Hex(value) {
    const data = new TextEncoder().encode(JSON.stringify(canonicalize(value)));
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

class PureTsRepository {
    constructor(agentId) {
        this.agentId = agentId;
        this.commits = new Map();
        this.headHash = null;
    }

    async commit(options) {
        const timestamp = Date.now();
        const parentHash = this.headHash;
        const hash = await sha256Hex({
            memory: options.memory,
            message: options.message,
            metadata: options.metadata,
            parent_hash: parentHash,
        });
        this.commits.set(hash, {
            hash,
            metadata: options.metadata ?? {},
            parent_hashes: parentHash ? [parentHash] : [],
            state: options.memory,
            timestamp,
        });
        this.headHash = hash;
        return hash;
    }

    async log(options = {}) {
        return [...this.commits.values()]
            .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
            .slice(0, options.limit ?? 50);
    }

    async getState(hash) {
        const commit = this.commits.get(hash);
        if (!commit) throw new Error(`Object not found: ${hash}`);
        return commit.state;
    }

    async revert(hash) {
        const state = await this.getState(hash);
        await this.commit({
            memory: state,
            message: `revert to ${hash.slice(0, 8)}`,
            metadata: { revertedHash: hash },
        });
        return state;
    }

    status() {
        return {
            head: this.headHash,
            current_branch: 'main',
            branches: ['main'],
        };
    }
}

export class AgitClient {
    constructor(repo) {
        this.repo = repo;
    }

    static async open(repoPath, options = {}) {
        const usePureTs = options.forcePureTs || nativeModule === null;
        if (usePureTs && options.requireNative) {
            throw new Error(
                '@agit/core native repository is required; refusing pure-TypeScript in-memory fallback'
            );
        }
        const repo = usePureTs
            ? new PureTsRepository(options.agentId ?? 'default')
            : await nativeModule.JsRepository.open(repoPath);
        return new AgitClient(repo);
    }

    async commit(options) {
        if (typeof this.repo.commit === 'function' && this.repo instanceof PureTsRepository) {
            return this.repo.commit(options);
        }
        return this.repo.commit(
            options.memory,
            options.world_state ?? {},
            options.message,
            options.action_type ?? 'checkpoint',
            options.cost,
            options.metadata
        );
    }

    async log(options = {}) {
        if (this.repo instanceof PureTsRepository) {
            return this.repo.log(options);
        }
        return this.repo.log(options.branch, options.limit);
    }

    async getState(hash) {
        return this.repo.getState(hash);
    }

    async revert(hash) {
        return this.repo.revert(hash);
    }

    status() {
        if (this.repo instanceof PureTsRepository) {
            return this.repo.status();
        }
        return {
            head: this.repo.head(),
            current_branch: this.repo.currentBranch(),
            branches: this.repo.listBranches(),
        };
    }
}
