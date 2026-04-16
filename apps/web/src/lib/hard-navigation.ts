'use client';

export function hardNavigate(url: string, mode: 'assign' | 'replace' = 'assign') {
    if (typeof window === 'undefined') {
        return;
    }

    if (mode === 'replace') {
        window.location.replace(url);
        return;
    }

    window.location.assign(url);
}
