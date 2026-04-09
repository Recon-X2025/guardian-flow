/**
 * DEX API client.
 */

import { apiClient } from '@/integrations/api/client';
import type {
  ExecutionContext,
  ExecutionContextCreatePayload,
  ExecutionContextListResponse,
  TransitionPayload,
  SignalPayload,
  CheckpointCreatePayload,
  CheckpointResolvePayload,
  Checkpoint,
  TraceEvent,
} from '../types';

const BASE = '/api/dex';

export const dexApi = {
  async createContext(payload: ExecutionContextCreatePayload): Promise<ExecutionContext> {
    const res = await apiClient.request<{ context: ExecutionContext }>(`${BASE}/contexts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.error) throw new Error(res.error.message);
    return res.data!.context;
  },

  async listContexts(params: {
    flow_id?: string;
    entity_type?: string;
    entity_id?: string;
    current_stage?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<ExecutionContextListResponse> {
    const qs = new URLSearchParams();
    if (params.flow_id)      qs.set('flow_id',       params.flow_id);
    if (params.entity_type)  qs.set('entity_type',   params.entity_type);
    if (params.entity_id)    qs.set('entity_id',     params.entity_id);
    if (params.current_stage) qs.set('current_stage', params.current_stage);
    if (params.limit)        qs.set('limit',         String(params.limit));
    if (params.skip)         qs.set('skip',          String(params.skip));

    const res = await apiClient.request<ExecutionContextListResponse>(
      `${BASE}/contexts${qs.toString() ? `?${qs}` : ''}`,
    );
    if (res.error) throw new Error(res.error.message);
    return res.data!;
  },

  async getContext(id: string): Promise<ExecutionContext> {
    const res = await apiClient.request<{ context: ExecutionContext }>(`${BASE}/contexts/${id}`);
    if (res.error) throw new Error(res.error.message);
    return res.data!.context;
  },

  async transition(id: string, payload: TransitionPayload): Promise<{ current_stage: string; trace_event: TraceEvent }> {
    const res = await apiClient.request<{ current_stage: string; trace_event: TraceEvent }>(
      `${BASE}/contexts/${id}/transition`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    if (res.error) throw new Error(res.error.message);
    return res.data!;
  },

  async emitSignal(id: string, payload: SignalPayload): Promise<unknown> {
    const res = await apiClient.request(`${BASE}/contexts/${id}/signal`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  },

  async manageCheckpoint(id: string, payload: CheckpointCreatePayload | CheckpointResolvePayload): Promise<Checkpoint> {
    const res = await apiClient.request<Checkpoint>(`${BASE}/contexts/${id}/checkpoint`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.error) throw new Error(res.error.message);
    return res.data!;
  },
};
