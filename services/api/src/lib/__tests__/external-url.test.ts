import { describe, expect, it } from 'vitest';
import { validateExternalUrl } from '../external-url';

describe('api external URL safety', () => {
    it('allows public http and https URLs', () => {
        expect(() => validateExternalUrl('https://example.com/docs')).not.toThrow();
        expect(() => validateExternalUrl('http://example.com')).not.toThrow();
    });

    it.each([
        'file:///etc/passwd',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://10.0.0.1',
        'http://172.31.0.1',
        'http://192.168.1.1',
        'http://169.254.169.254/latest/meta-data',
        'http://metadata.google.internal',
    ])('blocks internal or non-http URL: %s', (url) => {
        expect(() => validateExternalUrl(url)).toThrow();
    });
});
