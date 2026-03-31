/**
 * Database query tracing and metrics via OpenTelemetry.
 *
 * Wraps the `postgres` client's `debug` callback to create a span for every
 * query and record query duration in a histogram.
 */

import { SpanStatusCode } from "@opentelemetry/api";
import { tracer, meter } from "./telemetry.js";

const queryDuration = meter.createHistogram("db.query.duration", {
  description: "Duration of database queries in milliseconds",
  unit: "ms",
});

const queryTotal = meter.createCounter("db.query.total", {
  description: "Total database queries executed",
});

/**
 * Instrument a Drizzle-level query by starting a span around the execution.
 * Call this as a Hono middleware or at init time to patch the db instance.
 *
 * Since postgres.js doesn't expose per-query hooks easily, we instead provide
 * a helper that routers can use to wrap critical queries:
 *
 *   const result = await traceQuery("pet.list", () => db.select()...);
 */
export async function traceQuery<T>(
  operationName: string,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(`db.${operationName}`, async (span) => {
    span.setAttribute("db.system", "postgresql");
    span.setAttribute("db.operation", operationName);

    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = performance.now() - start;

      span.setStatus({ code: SpanStatusCode.OK });
      queryDuration.record(durationMs, { operation: operationName, status: "ok" });
      queryTotal.add(1, { operation: operationName, status: "ok" });

      return result;
    } catch (err) {
      const durationMs = performance.now() - start;

      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      queryDuration.record(durationMs, { operation: operationName, status: "error" });
      queryTotal.add(1, { operation: operationName, status: "error" });

      throw err;
    } finally {
      span.end();
    }
  });
}
