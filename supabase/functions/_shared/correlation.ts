// Global correlation ID management for unified tracing

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

export function getCorrelationId(req: Request): string {
  return req.headers.get('x-correlation-id') || generateCorrelationId();
}

export function propagateCorrelationHeaders(correlationId: string): HeadersInit {
  return {
    'x-correlation-id': correlationId,
    'x-trace-id': correlationId
  };
}
