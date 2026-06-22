import { redactString } from '../secrets/redactSecrets.js';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatMessage(level: LogLevel, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${redactString(message)}`;
}

export const logger = {
  info(message: string): void {
    console.log(formatMessage('info', message));
  },
  warn(message: string): void {
    console.warn(formatMessage('warn', message));
  },
  error(message: string): void {
    console.error(formatMessage('error', message));
  },
  debug(message: string): void {
    if (process.env.DEBUG === '1' || process.env.DEBUG === 'true') {
      console.log(formatMessage('debug', message));
    }
  },
};
