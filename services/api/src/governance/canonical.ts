function normalize(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => normalize(item));

    const record = value as Record<string, unknown>;
    return Object.keys(record)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
            const item = record[key];
            if (item !== undefined) acc[key] = normalize(item);
            return acc;
        }, {});
}

export function canonicalJson(value: unknown): string {
    return JSON.stringify(normalize(value));
}

export async function sha256Hex(value: string): Promise<string> {
    const data = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

export function isProductionRuntime(): boolean {
    return process.env.NODE_ENV === 'production';
}
