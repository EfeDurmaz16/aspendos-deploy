import { isSandboxConfigured } from '../../sandbox';

interface DoctorReport {
    surface: string;
    checks: { name: string; status: 'ok' | 'warn' | 'fail'; detail: string }[];
}

export function runDoctorChecks(): DoctorReport {
    const checks: DoctorReport['checks'] = [];

    checks.push({
        name: 'AI Gateway',
        status: process.env.AI_GATEWAY_API_KEY ? 'ok' : 'fail',
        detail: process.env.AI_GATEWAY_API_KEY ? 'Connected' : 'AI_GATEWAY_API_KEY missing',
    });

    checks.push({
        name: 'SuperMemory',
        status: process.env.SUPERMEMORY_API_KEY ? 'ok' : 'warn',
        detail: process.env.SUPERMEMORY_API_KEY ? 'Connected' : 'SUPERMEMORY_API_KEY missing — memory disabled',
    });

    checks.push({
        name: 'Convex',
        status: process.env.NEXT_PUBLIC_CONVEX_URL ? 'ok' : 'fail',
        detail: process.env.NEXT_PUBLIC_CONVEX_URL ? 'Connected' : 'NEXT_PUBLIC_CONVEX_URL missing',
    });

    checks.push({
        name: 'Sandbox',
        status: isSandboxConfigured() ? 'ok' : 'warn',
        detail: isSandboxConfigured()
            ? `Provider: ${process.env.DAYTONA_API_KEY ? 'Daytona' : 'E2B'}`
            : 'No sandbox — DAYTONA_API_KEY and E2B_API_KEY missing',
    });

    checks.push({
        name: 'Stripe',
        status: process.env.STRIPE_SECRET_KEY ? 'ok' : 'warn',
        detail: process.env.STRIPE_SECRET_KEY ? 'Connected' : 'STRIPE_SECRET_KEY missing — billing disabled',
    });

    checks.push({
        name: 'Steel (browser)',
        status: process.env.STEEL_API_KEY ? 'ok' : 'warn',
        detail: process.env.STEEL_API_KEY ? 'Connected' : 'STEEL_API_KEY missing — browser tool disabled',
    });

    return { surface: 'doctor', checks };
}

export function formatDoctorText(report: DoctorReport): string {
    const statusIcon = { ok: '✅', warn: '⚠️', fail: '❌' };
    const lines = report.checks.map(
        (c) => `${statusIcon[c.status]} ${c.name}: ${c.detail}`,
    );
    return `🩺 *YULA Doctor*\n\n${lines.join('\n')}`;
}
