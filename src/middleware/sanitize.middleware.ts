import { Request, Response, NextFunction } from 'express';

function stripMongoOperators(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripMongoOperators);
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (!key.startsWith('$')) {
        sanitized[key] = stripMongoOperators(val);
      }
    }
    return sanitized;
  }

  return value;
}

// Strips MongoDB operator keys ($gt, $where, $regex, etc.) from request body, query, and params.
// This is a defence-in-depth layer — Joi validation on individual routes is still the primary guard.
export const mongoSanitize = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = stripMongoOperators(req.body);
  }

  // In Express 5, req.query is a read-only getter. Sanitize values in-place instead of reassigning.
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (key.startsWith('$')) {
        delete (req.query as Record<string, unknown>)[key];
      } else {
        (req.query as Record<string, unknown>)[key] = stripMongoOperators(req.query[key]);
      }
    }
  }

  if (req.params && typeof req.params === 'object') {
    for (const key of Object.keys(req.params)) {
      if (key.startsWith('$')) {
        delete (req.params as Record<string, unknown>)[key];
      } else {
        (req.params as Record<string, unknown>)[key] = stripMongoOperators(req.params[key]) as string;
      }
    }
  }

  next();
};
