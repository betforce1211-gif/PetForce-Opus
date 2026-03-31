/**
 * OpenTelemetry SDK initialization — tracing + metrics.
 *
 * Import this module as early as possible in the entry point so that the SDK
 * is initialized before any other code runs.  Call `shutdownTelemetry()` during
 * graceful shutdown to flush pending spans/metrics.
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { metrics, trace } from "@opentelemetry/api";

const OTEL_ENABLED = process.env.OTEL_ENABLED !== "false";
const METRICS_PORT = parseInt(process.env.OTEL_METRICS_PORT ?? "9464", 10);

let sdk: NodeSDK | undefined;

export function initTelemetry() {
  if (!OTEL_ENABLED) return;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "petforce-api",
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "0.0.0",
    "deployment.environment": process.env.NODE_ENV ?? "development",
  });

  // Prometheus exporter serves /metrics on a separate port for scraping.
  const prometheusExporter = new PrometheusExporter({ port: METRICS_PORT });

  // OTLP trace exporter — sends to a collector (Grafana Tempo, Jaeger).
  // Defaults to http://localhost:4318/v1/traces if OTEL_EXPORTER_OTLP_ENDPOINT
  // is not set. When no collector is running, spans are silently dropped.
  const traceExporter = new OTLPTraceExporter();

  sdk = new NodeSDK({
    resource,
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
    metricReader: prometheusExporter,
  });

  sdk.start();
}

export async function shutdownTelemetry() {
  if (sdk) {
    await sdk.shutdown();
  }
}

// ── Convenience accessors ────────────────────────────────────────────
export const tracer = trace.getTracer("petforce-api");
export const meter = metrics.getMeter("petforce-api");
