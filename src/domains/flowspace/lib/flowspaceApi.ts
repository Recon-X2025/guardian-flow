/**
 * FlowSpace API client.
 * All calls are tenant-scoped server-side via the authenticated user's profile.
 */

import { apiClient } from '@/integrations/api/client';
import type {
  DecisionRecord,
  DecisionRecordCreatePayload,
  DecisionRecordFilters,
  DecisionRecordListResponse,
  DecisionLineageResponse,
} from '../types';

const BASE = '/api/flowspace';

export const flowspaceApi = {
  /**
   * Write a new decision record.
   */
  async writeRecord(payload: DecisionRecordCreatePayload): Promise<{ id: string; created_at: string }> {
    const res = await apiClient.request<{ id: string; created_at: string }>(`${BASE}/record`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.error) throw new Error(res.error.message);
    return res.data!;
  },

  /**
   * List decision records with optional filters.
   */
  async listRecords(filters: DecisionRecordFilters = {}): Promise<DecisionRecordListResponse> {
    const params = new URLSearchParams();
    if (filters.domain)      params.set('domain',      filters.domain);
    if (filters.actor_type)  params.set('actor_type',  filters.actor_type);
    if (filters.actor_id)    params.set('actor_id',    filters.actor_id);
    if (filters.action)      params.set('action',      filters.action);
    if (filters.entity_type) params.set('entity_type', filters.entity_type);
    if (filters.entity_id)   params.set('entity_id',   filters.entity_id);
    if (filters.since)       params.set('since',       filters.since);
    if (filters.until)       params.set('until',       filters.until);
    if (filters.limit)       params.set('limit',       String(filters.limit));
    if (filters.skip)        params.set('skip',        String(filters.skip));

    const qs = params.toString();
    const res = await apiClient.request<DecisionRecordListResponse>(
      `${BASE}/records${qs ? `?${qs}` : ''}`,
    );
    if (res.error) throw new Error(res.error.message);
    return res.data!;
  },

  /**
   * Get a single decision record by ID.
   */
  async getRecord(id: string): Promise<DecisionRecord> {
    const res = await apiClient.request<{ record: DecisionRecord }>(`${BASE}/records/${id}`);
    if (res.error) throw new Error(res.error.message);
    return res.data!.record;
  },

  /**
   * Get the causal lineage chain for a decision record.
   */
  async getLineage(id: string): Promise<DecisionLineageResponse> {
    const res = await apiClient.request<DecisionLineageResponse>(`${BASE}/records/${id}/lineage`);
    if (res.error) throw new Error(res.error.message);
    return res.data!;
  },
};
