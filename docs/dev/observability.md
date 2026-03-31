# Observability

PetForce API uses [OpenTelemetry](https://opentelemetry.io/) for distributed tracing and metrics, with Prometheus-compatible metrics export.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  petforce-api (apps/api)                             │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ HTTP spans   │  │ tRPC spans   │  │ DB spans    │ │
│  │ (Hono mw)    │  │ (middleware)  │  │ (traceQuery)│ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         └─────────┬───────┘                 │        │
│                   ▼                         ▼        │
│         ┌─────────────────────────────────────┐      │
│         │  OpenTelemetry SDK (NodeSDK)        │      │
│         └──────┬─────────────────┬────────────┘      │
│                │                 │                    │
│                ▼                 ▼                    │
│     ┌──────────────┐  ┌────────────────────┐         │
│     │ OTLP Exporter│  │ Prometheus Exporter │         │
│     │ (traces)     │  │ (:9464/metrics)     │         │
│     └──────┬───────┘  └────────┬───────────┘         │
└────────────┼───────────────────┼─────────────────────┘
             ▼                   ▼
   Grafana Tempo / Jaeger   Prometheus / Grafana
```

## Quick Start

Observability is enabled by default. No configuration needed for local development.

```bash
pnpm dev --filter=api
# Metrics available at http://localhost:9464/metrics
```

To disable (e.g. in tests):

```bash
OTEL_ENABLED=false pnpm dev --filter=api
```

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `OTEL_ENABLED` | `true` | Set to `false` to disable all telemetry |
| `OTEL_METRICS_PORT` | `9464` | Port for the Prometheus `/metrics` endpoint |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTLP collector URL for traces |

## Metrics

All metrics are exposed in Prometheus format at `http://localhost:9464/metrics`.

### tRPC Procedure Metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `trpc_request_duration` | Histogram (ms) | `procedure`, `type`, `status` | Latency per procedure (p50/p95/p99 via histogram buckets) |
| `trpc_request_total` | Counter | `procedure`, `type`, `status` | Total procedure calls |
| `trpc_error_total` | Counter | `procedure`, `type`, `code` | Errors by tRPC error code |

### Database Metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `db_query_duration` | Histogram (ms) | `operation`, `status` | Query execution time |
| `db_query_total` | Counter | `operation`, `status` | Total queries |

### Deriving Key Indicators

From these metrics you can compute:

- **Request latency p50/p95/p99:** `histogram_quantile(0.95, trpc_request_duration_bucket)`
- **Error rate:** `rate(trpc_error_total[5m]) / rate(trpc_request_total[5m])`
- **DB query time:** `histogram_quantile(0.99, db_query_duration_bucket)`

## Tracing

Traces are exported via OTLP to a collector (Grafana Tempo, Jaeger, etc.). Three layers of spans are created:

1. **HTTP spans** — `HTTP GET /trpc/pet.list` — created by Hono middleware for every request, includes method, path, status code, and response time.
2. **tRPC spans** — `trpc.pet.list` — created by tRPC middleware for every procedure call, includes procedure path, type (query/mutation), and error codes.
3. **DB spans** — `db.pet.list` — created via `traceQuery()` wrapper for explicitly instrumented queries.

### Using `traceQuery`

For critical database operations, wrap them with `traceQuery` to get dedicated spans and metrics:

```typescript
import { traceQuery } from "../lib/db-telemetry.js";

const pets = await traceQuery("pet.listByHousehold", () =>
  db.select().from(pets).where(eq(pets.householdId, householdId))
);
```

## Error Tracking

Errors are captured at multiple levels:

- **tRPC middleware** records exceptions on spans with full stack traces and tRPC error codes.
- **HTTP middleware** marks 5xx responses as error spans.
- **Pino logger** continues to log all errors with structured context.

Span exceptions include the full `Error` object (message + stack), visible in any trace viewer (Jaeger, Grafana Tempo).

## Local Development with Grafana

To visualize traces and metrics locally, run a Grafana + Tempo + Prometheus stack:

```bash
# docker-compose.observability.yml (add to infra/)
docker compose -f infra/docker-compose.observability.yml up
```

A minimal compose file:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    # prometheus.yml scrape config:
    # scrape_configs:
    #   - job_name: petforce-api
    #     static_configs:
    #       - targets: ["host.docker.internal:9464"]

  tempo:
    image: grafana/tempo:latest
    ports: ["4318:4318", "3200:3200"]
    command: ["-config.file=/etc/tempo.yaml"]

  grafana:
    image: grafana/grafana:latest
    ports: ["3002:3000"]
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: "true"
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
```

## Production (Grafana Cloud / Datadog)

For production, set the OTLP endpoint to your vendor's collector:

```bash
# Grafana Cloud
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <base64-encoded-credentials>"

# Datadog
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  # DD agent OTLP receiver
```

## Files

| File | Purpose |
|---|---|
| `apps/api/src/lib/telemetry.ts` | OTel SDK init, tracer/meter singletons |
| `apps/api/src/lib/trpc-telemetry.ts` | tRPC middleware for spans + metrics |
| `apps/api/src/lib/db-telemetry.ts` | `traceQuery()` helper for DB spans |
