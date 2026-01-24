import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

/**
 * Request logging middleware
 * Logs all HTTP requests with timing information
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log request start
  logger.debug('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture original end function
  const originalEnd = res.end.bind(res);

  // Override end function to log response
  res.end = function (...args: any[]): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Determine log level based on status code
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger.log(level, 'HTTP Response', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });

    // Call original end function
    return originalEnd(...args) as Response;
  } as any;

  next();
};

/**
 * Error logging middleware
 * Should be placed after all routes to catch errors
 */
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    headers: req.headers,
    ip: req.ip,
  });

  next(err);
};
