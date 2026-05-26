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

const BASE = '/trpc/dex';

export const dexApi = {
  async createContext(payload: ExecutionContextCreatePayload): Promise<ExecutionContext> {
    const res = await apiClient.request<any>(`${BASE}.createContext`, {
      method: 'POST',
      body: JSON.stringify({ json: payload }),
    });
    if (res.error) throw new Error(res.error.message);
    return res.data!.result.data.json.context;
  },

  async listContexts(params: {
    flow_id?: string;
    entity_type?: string;
    entity_id?: string;
    current_stage?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<ExecutionContextListResponse> {
    // Map snake_case parameters expected by the original listContexts call to the input schema expected by listContexts query
    const inputObj = { json: params };
    const qs = `input=${encodeURIComponent(JSON.stringify(inputObj))}`;
    const res = await apiClient.request<any>(
      `${BASE}.listContexts?${qs}`,
    );
    if (res.error) throw new Error(res.error.message);
    return res.data!.result.data.json;
  },

  async getContext(id: string): Promise<ExecutionContext> {
    const inputObj = { json: { id } };
    const qs = `input=${encodeURIComponent(JSON.stringify(inputObj))}`;
    const res = await apiClient.request<any>(`${BASE}.getContext?${qs}`);
    if (res.error) throw new Error(res.error.message);
    return res.data!.result.data.json.context;
  },

  async transition(id: string, payload: TransitionPayload): Promise<{ current_stage: string; trace_event: TraceEvent }> {
    const res = await apiClient.request<any>(
      `${BASE}.transitionStage`,
      {
        method: 'POST',
        body: JSON.stringify({ json: { id, ...payload } }),
      },
    );
    if (res.error) throw new Error(res.error.message);
    return res.data!.result.data.json;
  },

  async emitSignal(id: string, payload: SignalPayload): Promise<unknown> {
    const res = await apiClient.request<any>(`${BASE}.emitSignal`, {
      method: 'POST',
      body: JSON.stringify({ json: { id, ...payload } }),
    });
    if (res.error) throw new Error(res.error.message);
    return res.data!.result.data.json;
  },

  async manageCheckpoint(id: string, payload: CheckpointCreatePayload | CheckpointResolvePayload): Promise<Checkpoint> {
    const res = await apiClient.request<any>(`${BASE}.manageCheckpoint`, {
      method: 'POST',
      body: JSON.stringify({ json: { id, ...payload } }),
    });
    if (res.error) throw new Error(res.error.message);
    const data = res.data!.result.data.json;
    return data.checkpoint ? data.checkpoint : data;
  },
};
