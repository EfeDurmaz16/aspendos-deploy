import type { SandboxService } from './types';
import { DaytonaSandboxService } from './daytona';
import { E2BSandboxService } from './e2b';

let instance: SandboxService | null = null;

export function getSandboxService(): SandboxService {
    if (instance) return instance;

    const daytona = new DaytonaSandboxService();
    if (daytona.isConfigured()) {
        instance = daytona;
        return instance;
    }

    const e2b = new E2BSandboxService();
    if (e2b.isConfigured()) {
        instance = e2b;
        return instance;
    }

    throw new Error('No sandbox provider configured. Set DAYTONA_API_KEY or E2B_API_KEY.');
}

export function isSandboxConfigured(): boolean {
    return !!process.env.DAYTONA_API_KEY || !!process.env.E2B_API_KEY;
}

export type { SandboxService, SandboxOpts, ExecResult } from './types';
