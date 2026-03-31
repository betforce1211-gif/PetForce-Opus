/**
 * tRPC middleware that records an OpenTelemetry span and Prometheus metrics
 * for every procedure call.
 *
 * Metrics emitted:
 *  - `trpc.request.duration` (histogram, ms) — latency per procedure
 *  - `trpc.request.total`    (counter)       — total calls, labelled by status
 *  - `trpc.error.total`      (counter)       — errors, labelled by code
 */

import { SpanStatusCode } from "@opentelemetry/api";
import { TRPCError } from "@trpc/server";
import { tracer, meter } from "./telemetry.js";

// ── Metrics instruments ──────────────────────────────────────────────
const requestDuration = meter.createHistogram("trpc.request.duration", {
  description: "Duration of tRPC procedure calls in milliseconds",
  unit: "ms",
});

const requestTotal = meter.createCounter("trpc.request.total", {
  description: "Total tRPC procedure calls",
});

const errorTotal = meter.createCounter("trpc.error.total", {
  description: "Total tRPC procedure errors",
});

/**
 * tRPC middleware function — attach via `t.procedure.use(telemetryMiddleware)`.
 *
 * Uses a plain function signature compatible with tRPC's middleware types.
 */
export function telemetryMiddleware(opts: {
  path: string;
  type: string;
  next: () => Promise<{ ok: boolean; [key: string]: unknown }>;
  ctx: Record<string, unknown>;
}) {
  const { path, type, next } = opts;
  const start = performance.now();

  return tracer.startActiveSpan(`trpc.${path}`, async (span) => {
    span.setAttribute("rpc.system", "trpc");
    span.setAttribute("rpc.method", path);
    span.setAttribute("rpc.type", type);

    try {
      const result = await next();
      const durationMs = performance.now() - start;

      span.setStatus({ code: SpanStatusCode.OK });

      requestDuration.record(durationMs, {
        procedure: path,
        type,
        status: "ok",
      });
      requestTotal.add(1, { procedure: path, type, status: "ok" });

      return result;
    } catch (err) {
      const durationMs = performance.now() - start;
      const errorCode =
        err instanceof TRPCError ? err.code : "INTERNAL_SERVER_ERROR";

      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      span.recordException(
        err instanceof Error ? err : new Error(String(err)),
      );

      requestDuration.record(durationMs, {
        procedure: path,
        type,
        status: "error",
      });
      requestTotal.add(1, { procedure: path, type, status: "error" });
      errorTotal.add(1, { procedure: path, type, code: errorCode });

      throw err;
    } finally {
      span.end();
    }
  });
}
