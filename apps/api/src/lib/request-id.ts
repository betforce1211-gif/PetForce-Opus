/**
 * Request ID middleware — generates or propagates a unique request identifier.
 *
 * If the incoming request has an `X-Request-ID` header (e.g. from a load
 * balancer or upstream service), it is reused. Otherwise a new crypto-random
 * ID is generated. The ID is set on the response and attached to the
 * OpenTelemetry span for cross-service correlation.
 */

import { randomUUID } from "node:crypto";
import { createMiddleware } from "hono/factory";

const REQUEST_ID_HEADER = "X-Request-ID";

export const requestIdMiddleware = createMiddleware<{
  Variables: { requestId: string };
}>(async (c, next) => {
  const requestId = c.req.header(REQUEST_ID_HEADER) || randomUUID();

  c.header(REQUEST_ID_HEADER, requestId);
  c.set("requestId", requestId);

  await next();
});
