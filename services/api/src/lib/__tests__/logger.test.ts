import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../logger';

describe('Logger', () => {
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createLogger', () => {
        it('should return an object with debug, info, warn, error, and child methods', () => {
            const logger = createLogger();

            expect(logger).toHaveProperty('debug');
            expect(logger).toHaveProperty('info');
            expect(logger).toHaveProperty('warn');
            expect(logger).toHaveProperty('error');
            expect(logger).toHaveProperty('child');

            expect(typeof logger.debug).toBe('function');
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.child).toBe('function');
        });

        it('should create logger with default metadata', () => {
            const logger = createLogger({ userId: 'user-123', action: 'test' });
            logger.info('Test message');

            expect(consoleInfoSpy).toHaveBeenCalledOnce();
            const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);

            expect(loggedData.userId).toBe('user-123');
            expect(loggedData.action).toBe('test');
        });
    });

    describe('info', () => {
        it('should log info messages to console.info', () => {
            const logger = createLogger();
            logger.info('Info message');

            expect(consoleInfoSpy).toHaveBeenCalledOnce();
        });

        it('should include level, message, and timestamp', () => {
            const logger = createLogger();
            logger.info('Info message');

            const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);

            expect(loggedData.level).toBe('info');
            expect(loggedData.message).toBe('Info message');
            expect(loggedData.timestamp).toBeDefined();
            expect(new Date(loggedData.timestamp).toString()).not.toBe('Invalid Date');
        });

        it('should include additional metadata', () => {
            const logger = createLogger();
            logger.info('Info message', { userId: 'user-123', duration: 150 });

            const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);

            expect(loggedData.userId).toBe('user-123');
            expect(loggedData.duration).toBe(150);
        });
    });

    describe('error', () => {
        it('should log error messages to console.error', () => {
            const logger = createLogger();
            logger.error('Error message');

            expect(consoleErrorSpy).toHaveBeenCalledOnce();
        });

        it('should include level, message, and timestamp', () => {
            const logger = createLogger();
            logger.error('Error occurred');

            const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

            expect(loggedData.level).toBe('error');
            expect(loggedData.message).toBe('Error occurred');
            expect(loggedData.timestamp).toBeDefined();
        });

        it('should include error metadata', () => {
            const logger = createLogger();
            logger.error('Database connection failed', {
                metadata: { reason: 'timeout', retries: 3 },
            });

            const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

            expect(loggedData.metadata.reason).toBe('timeout');
            expect(loggedData.metadata.retries).toBe(3);
        });
    });

    describe('warn', () => {
        it('should log warning messages to console.warn', () => {
            const logger = createLogger();
            logger.warn('Warning message');

            expect(consoleWarnSpy).toHaveBeenCalledOnce();
        });

        it('should include level, message, and timestamp', () => {
            const logger = createLogger();
            logger.warn('Rate limit approaching');

            const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);

            expect(loggedData.level).toBe('warn');
            expect(loggedData.message).toBe('Rate limit approaching');
            expect(loggedData.timestamp).toBeDefined();
        });
    });

    describe('debug', () => {
        it('should log debug messages in non-production environment', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const logger = createLogger();
            logger.debug('Debug message');

            expect(consoleDebugSpy).toHaveBeenCalledOnce();

            process.env.NODE_ENV = originalEnv;
        });

        it('should not log debug messages in production environment', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const logger = createLogger();
            logger.debug('Debug message');

            expect(consoleDebugSpy).not.toHaveBeenCalled();

            process.env.NODE_ENV = originalEnv;
        });

        it('should include level, message, and timestamp when logging', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const logger = createLogger();
            logger.debug('Debug info');

            const loggedData = JSON.parse(consoleDebugSpy.mock.calls[0][0]);

            expect(loggedData.level).toBe('debug');
            expect(loggedData.message).toBe('Debug info');
            expect(loggedData.timestamp).toBeDefined();

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('child', () => {
        it('should create a child logger with inherited metadata', () => {
            const parentLogger = createLogger({ requestId: 'req-123' });
            const childLogger = parentLogger.child({ userId: 'user-456' });

            childLogger.info('Child log');

            const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);

            expect(loggedData.requestId).toBe('req-123');
            expect(loggedData.userId).toBe('user-456');
        });

        it('should not mutate parent logger metadata', () => {
            const parentLogger = createLogger({ requestId: 'req-123' });
            const childLogger = parentLogger.child({ userId: 'user-456' });

            childLogger.info('Child log');
            parentLogger.info('Parent log');

            const childLog = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
            const parentLog = JSON.parse(consoleInfoSpy.mock.calls[1][0]);

            expect(childLog.userId).toBe('user-456');
            expect(parentLog.userId).toBeUndefined();
        });

        it('should override parent metadata with child metadata', () => {
            const parentLogger = createLogger({ action: 'parent-action' });
            const childLogger = parentLogger.child({ action: 'child-action' });

            childLogger.info('Overridden log');

            const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);

            expect(loggedData.action).toBe('child-action');
        });

        it('should support nested child loggers', () => {
            const logger = createLogger({ action: 'api' });
            const child1 = logger.child({ userId: 'auth-user' });
            const child2 = child1.child({ requestId: 'req-login' });

            child2.info('Nested log');

            const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);

            expect(loggedData.action).toBe('api');
            expect(loggedData.userId).toBe('auth-user');
            expect(loggedData.requestId).toBe('req-login');
        });
    });

    describe('JSON output format', () => {
        it('should output valid JSON', () => {
            const logger = createLogger();
            logger.info('Test message');

            const output = consoleInfoSpy.mock.calls[0][0];
            expect(() => JSON.parse(output)).not.toThrow();
        });

        it('should escape special characters in message', () => {
            const logger = createLogger();
            logger.info('Message with "quotes" and\nnewlines');

            const output = consoleInfoSpy.mock.calls[0][0];
            const loggedData = JSON.parse(output);

            expect(loggedData.message).toBe('Message with "quotes" and\nnewlines');
        });

        it('should handle metadata with nested objects', () => {
            const logger = createLogger();
            logger.info('Complex metadata', {
                metadata: {
                    nested: {
                        value: 123,
                        array: [1, 2, 3],
                    },
                },
            });

            const output = consoleInfoSpy.mock.calls[0][0];
            const loggedData = JSON.parse(output);

            expect(loggedData.metadata.nested.value).toBe(123);
            expect(loggedData.metadata.nested.array).toEqual([1, 2, 3]);
        });
    });

    describe('Timestamp format', () => {
        it('should use ISO 8601 timestamp format', () => {
            const logger = createLogger();
            logger.info('Timestamp test');

            const loggedData = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
            const timestamp = loggedData.timestamp;

            // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
            expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });

        it('should have different timestamps for sequential logs', async () => {
            const logger = createLogger();
            logger.info('First log');

            // Wait a bit to ensure different timestamp
            await new Promise((resolve) => setTimeout(resolve, 10));

            logger.info('Second log');

            const firstLog = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
            const secondLog = JSON.parse(consoleInfoSpy.mock.calls[1][0]);

            expect(firstLog.timestamp).not.toBe(secondLog.timestamp);
        });
    });
});
