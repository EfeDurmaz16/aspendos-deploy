/**
 * Structured JSON Logger
 * Outputs structured logs for production monitoring and debugging.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    requestId?: string;
    userId?: string;
    action?: string;
    duration?: number;
    metadata?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
    return JSON.stringify(entry);
}

function createLogger(defaultMeta?: Partial<LogEntry>) {
    const log = (level: LogLevel, message: string, meta?: Partial<LogEntry>) => {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            ...defaultMeta,
            ...meta,
        };

        const formatted = formatLog(entry);

        switch (level) {
            case 'error':
                console.error(formatted);
                break;
            case 'warn':
                console.warn(formatted);
                break;
            case 'debug':
                if (process.env.NODE_ENV !== 'production') {
                    console.debug(formatted);
                }
                break;
            default:
                console.info(formatted);
        }
    };

    return {
        debug: (message: string, meta?: Partial<LogEntry>) => log('debug', message, meta),
        info: (message: string, meta?: Partial<LogEntry>) => log('info', message, meta),
        warn: (message: string, meta?: Partial<LogEntry>) => log('warn', message, meta),
        error: (message: string, meta?: Partial<LogEntry>) => log('error', message, meta),
        child: (childMeta: Partial<LogEntry>) => createLogger({ ...defaultMeta, ...childMeta }),
    };
}

export const logger = createLogger();
export type Logger = ReturnType<typeof createLogger>;
export { createLogger };
