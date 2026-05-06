const SAFE_PATH_ROOTS = ['/home/daytona', '/home/user', '/tmp', '/workspace'];
const BLOCKED_COMMAND_PATTERNS = [
    /\brm\s+-rf\s+(?:\/|\*)/i,
    /\b(?:mkfs|shutdown|reboot|halt|poweroff)\b/i,
    /\bdd\s+if=/i,
    /:\s*\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}/,
    /\bcurl\b.*\|\s*(?:sh|bash|zsh)\b/i,
    /\bwget\b.*\|\s*(?:sh|bash|zsh)\b/i,
    /\b(?:169\.254\.169\.254|metadata\.google\.internal)\b/i,
];
const BLOCKED_PATH_PATTERNS = [
    /(^|\/)\.env(?:$|\.)/i,
    /\.(?:pem|key|p12|pfx)$/i,
    /(^|\/)(?:id_rsa|id_ed25519|credentials|secrets?)(?:$|\.)/i,
];

export function validateSandboxPath(path: string) {
    if (!path.startsWith('/')) {
        throw new Error('Sandbox path must be absolute');
    }
    if (path.includes('\0') || path.split('/').includes('..')) {
        throw new Error('Sandbox path contains unsafe traversal');
    }
    if (!SAFE_PATH_ROOTS.some((root) => path === root || path.startsWith(`${root}/`))) {
        throw new Error(`Sandbox path must be under ${SAFE_PATH_ROOTS.join(', ')}`);
    }
    for (const pattern of BLOCKED_PATH_PATTERNS) {
        if (pattern.test(path)) {
            throw new Error('Sandbox path targets a blocked sensitive file');
        }
    }
}

export function validateSandboxCommand(cmd: string) {
    if (cmd.length > 4000) {
        throw new Error('Sandbox command is too long');
    }
    for (const pattern of BLOCKED_COMMAND_PATTERNS) {
        if (pattern.test(cmd)) {
            throw new Error('Sandbox command matches a blocked destructive pattern');
        }
    }
}
