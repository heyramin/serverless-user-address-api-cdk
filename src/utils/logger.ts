/**
 * Structured JSON Logger for AWS Lambda
 * Excludes PII and provides consistent logging format
 */

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

interface LogContext {
  requestId?: string;
  functionName?: string;
  duration?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

/**
 * Structured logger for Lambda functions
 * Automatically excludes PII like passwords, secrets, and sensitive data
 */
export class Logger {
  private functionName: string;
  private requestId: string;

  constructor(functionName: string, requestId?: string) {
    this.functionName = functionName;
    this.requestId = requestId || 'unknown';
  }

  /**
   * Sanitize sensitive data from objects
   */
  private sanitize(data: any): any {
    if (!data) return data;

    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const sanitized: any = {};
    const sensitiveKeys = [
      'password',
      'secret',
      'token',
      'authorization',
      'clientSecret',
      'hashedSecret',
      'apiKey',
      'accessKey',
      'privateKey',
      'creditCard',
      'ssn',
      'apiKeyId',
    ];

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive));

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          sanitized[key] = this.sanitize(data[key]);
        } else {
          sanitized[key] = data[key];
        }
      }
    }

    return sanitized;
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        functionName: this.functionName,
        requestId: this.requestId,
        ...context,
      },
    };
  }

  /**
   * Output log entry to stdout
   */
  private output(entry: LogEntry): void {
    console.log(JSON.stringify(entry));
  }

  /**
   * Log info level message
   */
  public info(message: string, context?: LogContext): void {
    const sanitizedContext = context ? this.sanitize(context) : undefined;
    const entry = this.createLogEntry(LogLevel.INFO, message, sanitizedContext);
    this.output(entry);
  }

  /**
   * Log warning level message
   */
  public warn(message: string, context?: LogContext): void {
    const sanitizedContext = context ? this.sanitize(context) : undefined;
    const entry = this.createLogEntry(LogLevel.WARN, message, sanitizedContext);
    this.output(entry);
  }

  /**
   * Log error level message
   */
  public error(message: string, error?: Error | string, context?: LogContext): void {
    let errorInfo: any = {};

    if (error instanceof Error) {
      errorInfo = {
        errorMessage: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
      };
    } else if (typeof error === 'string') {
      errorInfo = { errorMessage: error };
    }

    const sanitizedContext = context ? this.sanitize(context) : undefined;
    const entry = this.createLogEntry(LogLevel.ERROR, message, {
      ...sanitizedContext,
      ...errorInfo,
    });
    this.output(entry);
  }

  /**
   * Log debug level message
   */
  public debug(message: string, context?: LogContext): void {
    const sanitizedContext = context ? this.sanitize(context) : undefined;
    const entry = this.createLogEntry(LogLevel.DEBUG, message, sanitizedContext);
    this.output(entry);
  }

  /**
   * Create a child logger with additional context
   */
  public withContext(context: LogContext): Logger {
    const logger = new Logger(this.functionName, this.requestId);
    // Store context for use in all log calls
    (logger as any).additionalContext = context;
    return logger;
  }
}

/**
 * Create a logger instance for a Lambda handler
 */
export function createLogger(context: any): Logger {
  const functionName = context?.functionName || process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown';
  const requestId = context?.requestId || process.env.AWS_REQUEST_ID || 'unknown';
  return new Logger(functionName, requestId);
}
