import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utility Functions', () => {
    describe('cn (className merger)', () => {
        it('should merge class names', () => {
            const result = cn('class1', 'class2');
            expect(result).toBe('class1 class2');
        });

        it('should handle undefined values', () => {
            const result = cn('class1', undefined, 'class2');
            expect(result).toBe('class1 class2');
        });

        it('should handle conditional classes', () => {
            const isActive = true;
            const result = cn('base', isActive && 'active');
            expect(result).toBe('base active');
        });

        it('should handle false conditional classes', () => {
            const isActive = false;
            const result = cn('base', isActive && 'active');
            expect(result).toBe('base');
        });

        it('should merge Tailwind classes correctly', () => {
            // tailwind-merge should resolve conflicts
            const result = cn('px-4 py-2', 'px-8');
            expect(result).toBe('py-2 px-8');
        });

        it('should handle array of classes', () => {
            const classes = ['class1', 'class2', 'class3'];
            const result = cn(...classes);
            expect(result).toBe('class1 class2 class3');
        });

        it('should handle empty input', () => {
            const result = cn();
            expect(result).toBe('');
        });

        it('should handle object syntax', () => {
            const result = cn({ 'bg-red-500': true, 'bg-blue-500': false });
            expect(result).toBe('bg-red-500');
        });
    });
});

describe('Format Utilities', () => {
    describe('formatNumber', () => {
        // These would test actual utility functions if implemented
        it('should format large numbers with K suffix', () => {
            const formatNumber = (n: number) => {
                if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
                if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
                return n.toString();
            };

            expect(formatNumber(1500)).toBe('1.5K');
            expect(formatNumber(1500000)).toBe('1.5M');
            expect(formatNumber(500)).toBe('500');
        });
    });

    describe('formatDate', () => {
        it('should format dates consistently', () => {
            const date = new Date('2026-01-25T10:30:00Z');
            const formatted = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
            expect(formatted).toContain('2026');
            expect(formatted).toContain('Jan');
            expect(formatted).toContain('25');
        });
    });

    describe('formatCurrency', () => {
        it('should format USD currency', () => {
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            });
            expect(formatter.format(12.45)).toBe('$12.45');
            expect(formatter.format(0.99)).toBe('$0.99');
            expect(formatter.format(1000)).toBe('$1,000.00');
        });
    });
});

describe('Validation Utilities', () => {
    describe('isValidEmail', () => {
        const isValidEmail = (email: string) => {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        };

        it('should validate correct emails', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(isValidEmail('user+tag@example.org')).toBe(true);
        });

        it('should reject invalid emails', () => {
            expect(isValidEmail('invalid')).toBe(false);
            expect(isValidEmail('invalid@')).toBe(false);
            expect(isValidEmail('@domain.com')).toBe(false);
            expect(isValidEmail('user@.com')).toBe(false);
        });
    });

    describe('isValidPassword', () => {
        const isValidPassword = (password: string) => {
            return password.length >= 8 &&
                /[A-Z]/.test(password) &&
                /[a-z]/.test(password) &&
                /[0-9]/.test(password);
        };

        it('should validate strong passwords', () => {
            expect(isValidPassword('Password123')).toBe(true);
            expect(isValidPassword('SecurePass1')).toBe(true);
        });

        it('should reject weak passwords', () => {
            expect(isValidPassword('short')).toBe(false);
            expect(isValidPassword('nouppercase1')).toBe(false);
            expect(isValidPassword('NOLOWERCASE1')).toBe(false);
            expect(isValidPassword('NoNumbers')).toBe(false);
        });
    });
});

describe('Array Utilities', () => {
    describe('groupBy', () => {
        const groupBy = <T, K extends string | number>(
            array: T[],
            keyFn: (item: T) => K
        ): Record<K, T[]> => {
            return array.reduce(
                (groups, item) => {
                    const key = keyFn(item);
                    (groups[key] = groups[key] || []).push(item);
                    return groups;
                },
                {} as Record<K, T[]>
            );
        };

        it('should group items by key', () => {
            const items = [
                { type: 'a', value: 1 },
                { type: 'b', value: 2 },
                { type: 'a', value: 3 },
            ];

            const grouped = groupBy(items, (item) => item.type);
            expect(grouped.a).toHaveLength(2);
            expect(grouped.b).toHaveLength(1);
        });
    });

    describe('unique', () => {
        const unique = <T>(array: T[]): T[] => [...new Set(array)];

        it('should return unique values', () => {
            expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
            expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
        });
    });
});
