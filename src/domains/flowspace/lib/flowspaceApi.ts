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

const BASE = '/trpc/flowspace';

export const flowspaceApi = {
  /**
   * Write a new decision record.
   */
  async writeRecord(payload: DecisionRecordCreatePayload): Promise<{ id: string; created_at: string }> {
    const res = await apiClient.request<any>(`${BASE}.writeRecord`, {
      method: 'POST',
      body: JSON.stringify({ json: payload }),
    });
    if (res.error) throw new Error(res.error.message);
    return res.data!.result.data.json;
  },

  /**
   * List decision records with optional filters.
   */
  async listRecords(filters: DecisionRecordFilters = {}): Promise<DecisionRecordListResponse> {
    const inputObj = { json: filters };
    const qs = `input=${encodeURIComponent(JSON.stringify(inputObj))}`;
    const res = await apiClient.request<any>(
      `${BASE}.listRecords?${qs}`,
    );
    if (res.error) throw new Error(res.error.message);
    return res.data!.result.data.json;
  },

  /**
   * Get a single decision record by ID.
   */
  async getRecord(id: string): Promise<DecisionRecord> {
    const inputObj = { json: { id } };
    const qs = `input=${encodeURIComponent(JSON.stringify(inputObj))}`;
    const res = await apiClient.request<any>(`${BASE}.getRecord?${qs}`);
    if (res.error) throw new Error(res.error.message);
    return res.data!.result.data.json.record;
  },

  /**
   * Get the causal lineage chain for a decision record.
   */
  async getLineage(id: string): Promise<DecisionLineageResponse> {
    const inputObj = { json: { id } };
    const qs = `input=${encodeURIComponent(JSON.stringify(inputObj))}`;
    const res = await apiClient.request<any>(`${BASE}.getLineage?${qs}`);
    if (res.error) throw new Error(res.error.message);
    return res.data!.result.data.json;
  },
};
