export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[ChessClockVoice]';

function debugEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem('ccv:debug') === '1';
  } catch {
    return false;
  }
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export function createLogger(scope: string): Logger {
  const write = (level: LogLevel, message: string, args: unknown[]): void => {
    if (level === 'debug' && !debugEnabled()) return;
    const line = `${PREFIX}[${scope}] ${message}`;
    if (level === 'error') console.error(line, ...args);
    else if (level === 'warn') console.warn(line, ...args);
    else if (level === 'debug') console.debug(line, ...args);
    else console.info(line, ...args);
  };

  return {
    debug: (message, ...args) => write('debug', message, args),
    info: (message, ...args) => write('info', message, args),
    warn: (message, ...args) => write('warn', message, args),
    error: (message, ...args) => write('error', message, args),
  };
}
