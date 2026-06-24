import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../utils/logger.js';

export const validateInput = (schema: Joi.Schema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[source];
    const { error, value } = schema.validate(data, { abortEarly: false });
    
    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, '')
      }));

      logger.warn('Validation failed', { url: req.url, method: req.method, errors: validationErrors, body: req.body });

      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check the following fields and try again',
        validation_errors: validationErrors
      });
    }
    
    // Replace request data with validated data.
    // In Express 5, reassigning req.query can throw because it may be getter-backed.
    if (source === 'body') {
      req.body = value;
    } else {
      const target = req[source] as Record<string, any>;
      if (target && typeof target === 'object') {
        Object.keys(target).forEach((key) => {
          delete target[key];
        });
        Object.assign(target, value);
      }
    }

    next();
  };
};
