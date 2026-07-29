// ================================================================
// LOGGER ESTRUCTURADO - Reemplaza console.log para producción
// ================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  source?: string;
}

class Logger {
  private static instance: Logger;
  private logs: Array<{
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, unknown>;
    source?: string;
  }> = [];
  private maxLogs = 1000;
  private isDevelopment = import.meta.env.DEV;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>, source?: string) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      source
    };
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>, source?: string): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      source
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    if (this.isDevelopment) {
      const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]${source ? ` [${source}]` : ''}`;
      
      // Format context for console output
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      
      switch (level) {
        case 'debug': console.debug(`${prefix} ${message}${contextStr}`); break;
        case 'info': console.info(`${prefix} ${message}${contextStr}`); break;
        case 'warn': console.warn(`${prefix} ${message}${contextStr}`); break;
        case 'error': console.error(`${prefix} ${message}${contextStr}`); break;
      }
    }
  }

  debug(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log('debug', message, context, source);
  }

  info(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log('info', message, context, source);
  }

  warn(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log('warn', message, context, source);
  }

  error(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log('error', message, context, source);
  }

  getLogs(level?: 'debug' | 'info' | 'warn' | 'error'): Array<{
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, unknown>;
    source?: string;
  }> {
    if (!level) return [...this.logs];
    return this.logs.filter(l => l.level === level);
  }

  clear(): void {
    this.logs = [];
  }
}

export const logger = new Logger();

// Convenience exports
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);

// Helper for component-specific loggers
export function createLogger(source: string) {
  return {
    debug: (msg: string, ctx?: Record<string, unknown>) => logger.debug(msg, ctx, source),
    info: (msg: string, ctx?: Record<string, unknown>) => logger.info(msg, ctx, source),
    warn: (msg: string, ctx?: Record<string, unknown>) => logger.warn(msg, ctx, source),
    error: (msg: string, ctx?: Record<string, unknown>) => logger.error(msg, ctx, source),
  };
}