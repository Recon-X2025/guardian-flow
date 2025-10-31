import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface Span {
  id: string;
  traceId: string;
  parentSpanId?: string;
  spanName: string;
  serviceName: string;
  startTime: Date;
  attributes: Record<string, any>;
}

export class Tracer {
  private supabase: any;
  private tenantId?: string;

  constructor(tenantId?: string) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.tenantId = tenantId;
  }

  startSpan(name: string, serviceName: string, parentSpanId?: string, traceId?: string): Span {
    const span: Span = {
      id: crypto.randomUUID(),
      traceId: traceId || crypto.randomUUID(),
      parentSpanId,
      spanName: name,
      serviceName,
      startTime: new Date(),
      attributes: {},
    };
    return span;
  }

  async endSpan(span: Span, status: 'ok' | 'error' = 'ok', errorMessage?: string) {
    try {
      const endTime = new Date();
      const durationMs = endTime.getTime() - span.startTime.getTime();

      await this.supabase.from('trace_spans').insert({
        trace_id: span.traceId,
        span_id: span.id,
        parent_span_id: span.parentSpanId || null,
        span_name: span.spanName,
        service_name: span.serviceName,
        start_time: span.startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_ms: durationMs,
        status,
        error_message: errorMessage || null,
        attributes: span.attributes,
        tenant_id: this.tenantId || null,
      });
    } catch (err) {
      console.error('Failed to end span:', err);
    }
  }

  addAttribute(span: Span, key: string, value: any) {
    span.attributes[key] = value;
  }

  async recordException(span: Span, error: Error) {
    this.addAttribute(span, 'exception.type', error.name);
    this.addAttribute(span, 'exception.message', error.message);
    this.addAttribute(span, 'exception.stacktrace', error.stack);
    await this.endSpan(span, 'error', error.message);
  }
}

export function createTracer(tenantId?: string): Tracer {
  return new Tracer(tenantId);
}
