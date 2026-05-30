import type winston from 'winston';
import type { Histogram, Counter } from 'prom-client';

export function attachSequelizeObservability(
  sequelize: { addHook: (name: string, fn: (...args: any[]) => void) => void },
  logger: winston.Logger,
  dbQueryDuration: Histogram<string>,
  dbQueryErrors: Counter<string>,
): void {
  const thresholdMs = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS ?? '500', 10);

  sequelize.addHook('beforeQuery', (_options: any, query: any) => {
    query._observabilityStartTime = Date.now();
  });

  sequelize.addHook('afterQuery', (options: any, query: any) => {
    const startTime = query._observabilityStartTime as number | undefined;
    if (startTime === undefined) return;

    const durationMs = Date.now() - startTime;
    const operation = options.type ?? 'UNKNOWN';
    const table = options.model ? String(options.model) : 'unknown';
    const success = !query._error;

    dbQueryDuration.observe(
      { operation, table, success: String(success) },
      durationMs / 1000,
    );

    if (!success) {
      dbQueryErrors.inc({
        operation,
        table,
        error_type: (query._error as Error)?.name ?? 'UnknownError',
      });
    }

    if (durationMs > thresholdMs) {
      logger.warn({
        msg: 'Slow query detected',
        duration_ms: durationMs,
        threshold_ms: thresholdMs,
        operation,
        table,
      });
    }
  });
}
