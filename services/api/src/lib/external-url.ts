function isBlockedHostname(hostname: string) {
    const host = hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost')) return true;
    if (host === 'metadata.google.internal') return true;
    if (
        host === '::1' ||
        host.startsWith('fc') ||
        host.startsWith('fd') ||
        host.startsWith('fe80')
    ) {
        return true;
    }

    const match = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return false;

    const first = Number(match[1]);
    const second = Number(match[2]);
    return (
        first === 0 ||
        first === 10 ||
        first === 127 ||
        (first === 169 && second === 254) ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168)
    );
}

export function validateExternalUrl(rawUrl: string) {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new Error('URL is invalid');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('URL must use http or https');
    }

    if (isBlockedHostname(url.hostname)) {
        throw new Error('URL targets a blocked internal or private host');
    }
}
