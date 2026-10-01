/**
 * The Council - Structured Logger with Request Tracking & Log Rotation
 *
 * Provides JSON-formatted structured logging for server processes with
 * automated secret redaction, request/session contextualization, and
 * rotating file output under ./logs.
 */

import fs from 'node:fs';
import path from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface LogContext {
  requestId?: string;
  sessionId?: string;
  workerId?: string;
  [key: string]: any;
}

export class Logger {
  private baseContext: LogContext;
  private minLevel: LogLevel;
  private logDir: string;
  private logFilePath: string;
  private maxFileSize = 5 * 1024 * 1024; // 5 MB
  private maxBackups = 3;

  constructor(context: LogContext = {}, minLevel: LogLevel = 'info') {
    this.baseContext = context;
    this.minLevel = minLevel;
    this.logDir = path.resolve(process.cwd(), 'logs');
    this.logFilePath = path.join(this.logDir, 'council.log');
  }

  public child(extraContext: LogContext): Logger {
    return new Logger({ ...this.baseContext, ...extraContext }, this.minLevel);
  }

  public setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_SEVERITY[level] >= LEVEL_SEVERITY[this.minLevel];
  }

  private redact(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return this.redactString(obj);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redact(item));
    }

    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('key') ||
        lower.includes('secret') ||
        lower.includes('token') ||
        lower.includes('password') ||
        lower.includes('pin')
      ) {
        cleaned[key] = '[REDACTED]';
      } else {
        cleaned[key] = this.redact(value);
      }
    }
    return cleaned;
  }

  private redactString(str: string): string {
    return str
      .replace(/(AIzaSy[A-Za-z0-9_-]{33})/g, '[REDACTED_API_KEY]')
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
  }

  private write(level: LogLevel, message: string, data?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...this.baseContext,
      ...(data ? this.redact(data) : {}),
    };

    const serialized = JSON.stringify(entry);

    // Console output
    if (level === 'error') {
      console.error(serialized);
    } else if (level === 'warn') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }

    // Persist to file
    this.appendToFile(serialized);
  }

  private appendToFile(line: string): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      this.rotateIfNeeded();
      fs.appendFileSync(this.logFilePath, line + '\n', 'utf8');
    } catch {
      // Non-fatal if disk write fails
    }
  }

  private rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logFilePath)) return;
      const stats = fs.statSync(this.logFilePath);
      if (stats.size < this.maxFileSize) return;

      // Rotate existing backups
      for (let i = this.maxBackups - 1; i >= 1; i--) {
        const oldFile = `${this.logFilePath}.${i}`;
        const nextFile = `${this.logFilePath}.${i + 1}`;
        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, nextFile);
        }
      }

      // Rename current to .1
      fs.renameSync(this.logFilePath, `${this.logFilePath}.1`);
    } catch {
      // Ignore rotation error
    }
  }

  public debug(message: string, data?: Record<string, any>): void {
    this.write('debug', message, data);
  }

  public info(message: string, data?: Record<string, any>): void {
    this.write('info', message, data);
  }

  public warn(message: string, data?: Record<string, any>): void {
    this.write('warn', message, data);
  }

  public error(message: string, data?: Record<string, any>): void {
    this.write('error', message, data);
  }
}

export const logger = new Logger();
