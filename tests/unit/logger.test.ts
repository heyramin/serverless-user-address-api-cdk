import { Logger, createLogger, LogLevel } from '../../src/utils/logger';

describe('Logger Utility', () => {
  let consoleSpy: jest.SpyInstance;
  let logOutput: string[];

  beforeEach(() => {
    logOutput = [];
    consoleSpy = jest.spyOn(console, 'log').mockImplementation((msg) => {
      logOutput.push(msg);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Basic Logging', () => {
    it('should log info message with correct structure', () => {
      const logger = new Logger('test-function', 'request-123');
      logger.info('Test message');

      expect(logOutput).toHaveLength(1);
      const entry = JSON.parse(logOutput[0]);

      expect(entry.level).toBe('INFO');
      expect(entry.message).toBe('Test message');
      expect(entry.timestamp).toBeDefined();
      expect(entry.context.functionName).toBe('test-function');
      expect(entry.context.requestId).toBe('request-123');
    });

    it('should log warn message with correct level', () => {
      const logger = new Logger('test-function');
      logger.warn('Warning message');

      expect(logOutput).toHaveLength(1);
      const entry = JSON.parse(logOutput[0]);
      expect(entry.level).toBe('WARN');
      expect(entry.message).toBe('Warning message');
    });

    it('should log debug message with correct level', () => {
      const logger = new Logger('test-function');
      logger.debug('Debug message');

      expect(logOutput).toHaveLength(1);
      const entry = JSON.parse(logOutput[0]);
      expect(entry.level).toBe('DEBUG');
      expect(entry.message).toBe('Debug message');
    });

    it('should log error message with Error object', () => {
      const logger = new Logger('test-function');
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(logOutput).toHaveLength(1);
      const entry = JSON.parse(logOutput[0]);

      expect(entry.level).toBe('ERROR');
      expect(entry.message).toBe('Error occurred');
      expect(entry.context.errorMessage).toBe('Test error');
      expect(entry.context.errorType).toBe('Error');
      expect(entry.context.stack).toBeDefined();
    });

    it('should log error message with string error', () => {
      const logger = new Logger('test-function');
      logger.error('Error occurred', 'String error message');

      expect(logOutput).toHaveLength(1);
      const entry = JSON.parse(logOutput[0]);

      expect(entry.level).toBe('ERROR');
      expect(entry.context.errorMessage).toBe('String error message');
    });
  });

  describe('Context Handling', () => {
    it('should include context in log entries', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { userId: 'user123', action: 'create' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.userId).toBe('user123');
      expect(entry.context.action).toBe('create');
    });

    it('should handle nested context objects', () => {
      const logger = new Logger('test-function');
      logger.info('Message', {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.user.id).toBe('user123');
      expect(entry.context.user.email).toBe('test@example.com');
    });

    it('should handle array context values', () => {
      const logger = new Logger('test-function');
      logger.info('Message', {
        items: ['item1', 'item2', 'item3'],
      });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.items).toEqual(['item1', 'item2', 'item3']);
    });
  });

  describe('PII Sanitization', () => {
    it('should redact password field', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { password: 'secret123' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.password).toBe('[REDACTED]');
    });

    it('should redact secret field', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { secret: 'api-secret-key' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.secret).toBe('[REDACTED]');
    });

    it('should redact token field', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { token: 'jwt-token-xyz' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.token).toBe('[REDACTED]');
    });

    it('should redact authorization header', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { authorization: 'Bearer token123' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.authorization).toBe('[REDACTED]');
    });

    it('should redact clientSecret', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { clientSecret: 'secret-value' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.clientSecret).toBe('[REDACTED]');
    });

    it('should redact hashedSecret', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { hashedSecret: 'hash-value' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.hashedSecret).toBe('[REDACTED]');
    });

    it('should redact apiKey', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { apiKey: 'key-123' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.apiKey).toBe('[REDACTED]');
    });

    it('should redact accessKey', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { accessKey: 'access-key-123' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.accessKey).toBe('[REDACTED]');
    });

    it('should redact privateKey', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { privateKey: 'private-key-data' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.privateKey).toBe('[REDACTED]');
    });

    it('should redact creditCard', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { creditCard: '4111-1111-1111-1111' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.creditCard).toBe('[REDACTED]');
    });

    it('should redact ssn', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { ssn: '123-45-6789' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.ssn).toBe('[REDACTED]');
    });

    it('should redact apiKeyId', () => {
      const logger = new Logger('test-function');
      logger.info('Message', { apiKeyId: 'key-id-xyz' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.apiKeyId).toBe('[REDACTED]');
    });

    it('should handle case-insensitive sensitive keys', () => {
      const logger = new Logger('test-function');
      logger.info('Message', {
        Password: 'secret1',
        SECRET: 'secret2',
        Token: 'secret3',
      });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.Password).toBe('[REDACTED]');
      expect(entry.context.SECRET).toBe('[REDACTED]');
      expect(entry.context.Token).toBe('[REDACTED]');
    });

    it('should preserve non-sensitive fields', () => {
      const logger = new Logger('test-function');
      logger.info('Message', {
        userId: 'user123',
        action: 'create',
        resource: 'address',
      });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.userId).toBe('user123');
      expect(entry.context.action).toBe('create');
      expect(entry.context.resource).toBe('address');
    });

    it('should redact nested sensitive data', () => {
      const logger = new Logger('test-function');
      logger.info('Message', {
        user: {
          id: 'user123',
          password: 'secret123',
          email: 'test@example.com',
        },
      });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.user.id).toBe('user123');
      expect(entry.context.user.password).toBe('[REDACTED]');
      expect(entry.context.user.email).toBe('test@example.com');
    });

    it('should redact sensitive data in array of objects', () => {
      const logger = new Logger('test-function');
      logger.info('Message', {
        users: [
          { id: 'user1', token: 'token1' },
          { id: 'user2', secret: 'secret2' },
        ],
      });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.users[0].id).toBe('user1');
      expect(entry.context.users[0].token).toBe('[REDACTED]');
      expect(entry.context.users[1].id).toBe('user2');
      expect(entry.context.users[1].secret).toBe('[REDACTED]');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null context gracefully', () => {
      const logger = new Logger('test-function');
      logger.info('Message', null as any);

      const entry = JSON.parse(logOutput[0]);
      expect(entry.message).toBe('Message');
      expect(entry.context).toBeDefined();
    });

    it('should handle undefined context gracefully', () => {
      const logger = new Logger('test-function');
      logger.info('Message', undefined);

      const entry = JSON.parse(logOutput[0]);
      expect(entry.message).toBe('Message');
      expect(entry.context).toBeDefined();
    });

    it('should handle empty object context', () => {
      const logger = new Logger('test-function');
      logger.info('Message', {});

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.functionName).toBe('test-function');
    });

    it('should handle primitive values in context', () => {
      const logger = new Logger('test-function');
      logger.info('Message', {
        count: 42,
        active: true,
        ratio: 3.14,
        value: null,
      });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.count).toBe(42);
      expect(entry.context.active).toBe(true);
      expect(entry.context.ratio).toBe(3.14);
      expect(entry.context.value).toBe(null);
    });

    it('should handle deeply nested objects', () => {
      const logger = new Logger('test-function');
      logger.info('Message', {
        level1: {
          level2: {
            level3: {
              data: 'value',
              password: 'secret',
            },
          },
        },
      });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.level1.level2.level3.data).toBe('value');
      expect(entry.context.level1.level2.level3.password).toBe('[REDACTED]');
    });

    it('should handle special characters in values', () => {
      const logger = new Logger('test-function');
      logger.info('Message', {
        data: 'value with "quotes" and \\ backslash',
        json: '{"key": "value"}',
      });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.data).toContain('quotes');
      expect(entry.context.json).toContain('key');
    });
  });

  describe('withContext Method', () => {
    it('should merge additional context into all log entries', () => {
      const baseLogger = new Logger('test-function');
      const childLogger = baseLogger.withContext({ userId: 'user123' });
      childLogger.info('Test message');

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.userId).toBe('user123');
      expect(entry.message).toBe('Test message');
    });

    it('should override base context with method context', () => {
      const baseLogger = new Logger('test-function');
      const childLogger = baseLogger.withContext({ userId: 'base-user' });
      childLogger.info('Test message', { userId: 'override-user' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.userId).toBe('override-user');
    });

    it('should preserve base context when not overridden', () => {
      const baseLogger = new Logger('test-function');
      const childLogger = baseLogger.withContext({ userId: 'user123', role: 'admin' });
      childLogger.info('Test message', { action: 'create' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.userId).toBe('user123');
      expect(entry.context.role).toBe('admin');
      expect(entry.context.action).toBe('create');
    });

    it('should chain withContext calls', () => {
      const logger = new Logger('test-function');
      const childLogger1 = logger.withContext({ userId: 'user123' });
      const childLogger2 = childLogger1.withContext({ role: 'admin' });
      childLogger2.info('Test message');

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.userId).toBe('user123');
      expect(entry.context.role).toBe('admin');
    });

    it('should work with error logging', () => {
      const baseLogger = new Logger('test-function');
      const childLogger = baseLogger.withContext({ userId: 'user123' });
      const error = new Error('Test error');
      childLogger.error('Error occurred', error);

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.userId).toBe('user123');
      expect(entry.context.errorMessage).toBe('Test error');
    });

    it('should sanitize additional context', () => {
      const baseLogger = new Logger('test-function');
      const childLogger = baseLogger.withContext({ password: 'secret123', userId: 'user1' });
      childLogger.info('Test message');

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.password).toBe('[REDACTED]');
      expect(entry.context.userId).toBe('user1');
    });
  });

  describe('createLogger Function', () => {
    it('should create logger with Lambda context', () => {
      const context = {
        functionName: 'my-function',
        requestId: 'request-id-123',
      };
      const logger = createLogger(context);
      logger.info('Test message');

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.functionName).toBe('my-function');
      expect(entry.context.requestId).toBe('request-id-123');
    });

    it('should use environment variables as fallback', () => {
      process.env.AWS_LAMBDA_FUNCTION_NAME = 'env-function';
      process.env.AWS_REQUEST_ID = 'env-request-id';

      const logger = createLogger({});
      logger.info('Test message');

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.functionName).toBe('env-function');
      expect(entry.context.requestId).toBe('env-request-id');

      delete process.env.AWS_LAMBDA_FUNCTION_NAME;
      delete process.env.AWS_REQUEST_ID;
    });

    it('should use defaults when context and env vars missing', () => {
      const logger = createLogger({});
      logger.info('Test message');

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.functionName).toBe('unknown');
      expect(entry.context.requestId).toBe('unknown');
    });

    it('should handle undefined context', () => {
      const logger = createLogger(undefined);
      logger.info('Test message');

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.functionName).toBe('unknown');
    });
  });

  describe('Log Entry Format', () => {
    it('should have valid ISO timestamp', () => {
      const logger = new Logger('test-function');
      logger.info('Test message');

      const entry = JSON.parse(logOutput[0]);
      const timestamp = new Date(entry.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should include all required fields', () => {
      const logger = new Logger('test-function');
      logger.info('Test message', { custom: 'value' });

      const entry = JSON.parse(logOutput[0]);
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('level');
      expect(entry).toHaveProperty('message');
      expect(entry).toHaveProperty('context');
    });

    it('should always include functionName and requestId', () => {
      const logger = new Logger('test-function', 'req-123');
      logger.info('Test message');

      const entry = JSON.parse(logOutput[0]);
      expect(entry.context.functionName).toBe('test-function');
      expect(entry.context.requestId).toBe('req-123');
    });
  });

  describe('Different Log Levels Across Methods', () => {
    it('should produce correct output for all log levels', () => {
      const logger = new Logger('test-function');

      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');
      logger.debug('Debug message');

      expect(logOutput).toHaveLength(4);

      const info = JSON.parse(logOutput[0]);
      const warn = JSON.parse(logOutput[1]);
      const error = JSON.parse(logOutput[2]);
      const debug = JSON.parse(logOutput[3]);

      expect(info.level).toBe('INFO');
      expect(warn.level).toBe('WARN');
      expect(error.level).toBe('ERROR');
      expect(debug.level).toBe('DEBUG');
    });
  });
});
