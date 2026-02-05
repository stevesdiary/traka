import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

const safeStringify = (value: unknown) => {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (_key, val) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    },
    2
  );
};

// Custom format for development (human-readable)
const devFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    log += `\n${safeStringify(metadata)}`;
  }

  // Add stack trace for errors
  if (stack) {
    log += `\n${stack}`;
  }

  return log;
});

// Production format (JSON for log aggregation services)
const prodFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json()
);

// Development format (colorized, human-readable)
const developmentFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  devFormat
);

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Create logger instance
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: isProduction ? prodFormat : developmentFormat,
  defaultMeta: {
    service: 'traka-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [],
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Console transport (all environments except test)
if (!isTest) {
  logger.add(
    new winston.transports.Console({
      format: isProduction ? prodFormat : developmentFormat,
    })
  );
}

// File transports (production only)
if (isProduction) {
  // Error logs - daily rotation, keep for 14 days
  logger.add(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: prodFormat,
    })
  );

  // Combined logs - daily rotation, keep for 7 days
  logger.add(
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      format: prodFormat,
    })
  );
}

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({
    filename: 'logs/exceptions.log',
    format: prodFormat
  })
);

// Handle unhandled promise rejections
logger.rejections.handle(
  new winston.transports.File({
    filename: 'logs/rejections.log',
    format: prodFormat
  })
);

// Create convenience methods for common patterns
export const logWithContext = (level: string, message: string, context?: any) => {
  logger.log(level, message, context);
};

export const logError = (error: Error, context?: any) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context
  });
};

export const logRequest = (method: string, url: string, statusCode: number, duration: number) => {
  logger.info('HTTP Request', {
    method,
    url,
    statusCode,
    duration: `${duration}ms`
  });
};

export const logDatabaseQuery = (query: string, duration: number) => {
  logger.debug('Database Query', {
    query: query.substring(0, 200), // Truncate long queries
    duration: `${duration}ms`
  });
};

// Export default logger
export default logger;
