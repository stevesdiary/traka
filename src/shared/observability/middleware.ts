import type { Request, Response, NextFunction } from 'express';
import type { MetricsRegistry } from './metrics.js';

export function metricsMiddleware(metrics: MetricsRegistry) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
      const durationSec = (Date.now() - startTime) / 1000;
      const route = (req.route?.path as string | undefined) ?? req.path ?? 'unknown';
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };

      metrics.httpRequestDuration.observe(labels, durationSec);
      metrics.httpRequestTotal.inc(labels);
    });

    next();
  };
}
