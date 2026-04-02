/**
 * Logger Utility
 * 
 * Kullanım:
 * - Development: Tüm loglar görünür
 * - Production: Sadece error ve warn görünür
 * 
 * Örnek:
 * import { logger } from '@/lib/logger';
 * logger.info('Bilgi mesajı');
 * logger.error('Hata mesajı');
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Production'da sadece error ve warn göster
const isProduction = process.env.NODE_ENV === 'production';
const MIN_LOG_LEVEL = isProduction ? 'warn' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatMessage(level: LogLevel, message: string, ...args: any[]): string {
  const timestamp = new Date().toLocaleTimeString('tr-TR');
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return `${prefix} ${message}`;
}

function log(level: LogLevel, message: string, ...args: any[]) {
  if (!shouldLog(level)) return;

  const formattedMessage = formatMessage(level, message, ...args);

  switch (level) {
    case 'debug':
      console.debug(formattedMessage, ...args);
      break;
    case 'info':
      console.info(formattedMessage, ...args);
      break;
    case 'warn':
      console.warn(formattedMessage, ...args);
      break;
    case 'error':
      console.error(formattedMessage, ...args);
      break;
  }
}

export const logger = {
  debug: (message: string, ...args: any[]) => log('debug', message, ...args),
  info: (message: string, ...args: any[]) => log('info', message, ...args),
  warn: (message: string, ...args: any[]) => log('warn', message, ...args),
  error: (message: string, ...args: any[]) => log('error', message, ...args),
  
  // Helper for grouping logs
  group: (label: string) => {
    if (!shouldLog('info')) return;
    console.group(`\n=== ${label} ===`);
  },
  groupEnd: () => {
    if (!shouldLog('info')) return;
    console.groupEnd();
  },
};

// Export for use in server actions
export function createLogger(context: string) {
  return {
    debug: (message: string, ...args: any[]) => logger.debug(`[${context}] ${message}`, ...args),
    info: (message: string, ...args: any[]) => logger.info(`[${context}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => logger.warn(`[${context}] ${message}`, ...args),
    error: (message: string, ...args: any[]) => logger.error(`[${context}] ${message}`, ...args),
  };
}
