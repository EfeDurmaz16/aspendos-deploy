export interface DangerousPattern {
    tool: string;
    pattern: RegExp;
    reason: string;
}

export const DANGEROUS_PATTERNS: DangerousPattern[] = [
    { tool: 'stripe.charge', pattern: /amount.*[5-9]\d{3,}|amount.*\d{5,}/, reason: 'Charge exceeds $50 threshold' },
    { tool: 'db.execute', pattern: /DROP|TRUNCATE|DELETE\s+FROM\s+\w+\s*$/i, reason: 'Destructive SQL operation' },
    { tool: 'email.blast', pattern: /recipients.*\d{4,}/, reason: 'Mass email to >1000 recipients' },
    { tool: 'fs.delete', pattern: /recursive.*true|rm\s+-rf/i, reason: 'Recursive file deletion' },
    { tool: 'git.force_push', pattern: /main|master|production/i, reason: 'Force push to protected branch' },
    { tool: 'shell.exec', pattern: /rm\s+-rf\s+\/|mkfs|dd\s+if=/i, reason: 'Destructive shell command' },
    { tool: 'dns.update', pattern: /delete|remove/i, reason: 'DNS record deletion' },
    { tool: 'iam.delete', pattern: /role|user|policy/i, reason: 'IAM resource deletion' },
];

export function isDangerous(toolName: string, argsStr: string): DangerousPattern | null {
    for (const entry of DANGEROUS_PATTERNS) {
        if (toolName.startsWith(entry.tool) && entry.pattern.test(argsStr)) {
            return entry;
        }
    }
    return null;
}
