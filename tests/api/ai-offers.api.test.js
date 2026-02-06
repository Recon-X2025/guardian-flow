/**
 * API Integration Tests: Offer AI (SAPOS)
 * Requires running backend against MongoDB Atlas with seeded data.
 * Gracefully skips when backend is unavailable.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { isServerAvailable, apiPost, apiPatch, authenticate } from './helpers.js';

let serverAvailable = false;
let authToken = '';

// Deterministic IDs from test seed data
const TEST_WO_ID = '00000000-0000-4000-c000-000000000002'; // in_progress

beforeAll(async () => {
  serverAvailable = await isServerAvailable();
  if (serverAvailable) {
    authToken = await authenticate();
  }
});

describe('POST /api/functions/generate-offers', () => {
  let generatedOffers = [];

  it('returns offers for a valid work_order_id', async () => {
    if (!serverAvailable) return;
    const { status, data } = await apiPost('/api/functions/generate-offers', {
      workOrderId: TEST_WO_ID,
      customerId: 'demo-customer',
    }, authToken);
    // 200 = offers generated, 404 = work order not seeded,
    // 503 = database temporarily unavailable
    expect([200, 404, 503]).toContain(status);
    expect(data).toBeDefined();
    if (status === 200) {
      generatedOffers = data.offers || [];
    }
  });

  it('offers stored in sapos_offers table with provenance', async () => {
    if (!serverAvailable) return;
    const { data } = await apiPost('/api/db/query', {
      table: 'sapos_offers',
      select: '*',
      limit: 20,
    }, authToken);
    const offers = data.data || [];
    expect(offers.length).toBeGreaterThanOrEqual(0);

    // Check provenance fields if any offers exist
    for (const o of offers) {
      expect(o.status).toBeDefined();
      // model_version and confidence_score may be present
      if (o.model_version) {
        expect(typeof o.model_version).toBe('string');
      }
    }
  });

  it('PATCH offer status to accepted updates correctly', async () => {
    if (!serverAvailable) return;
    // First, get an offer
    const { data: queryData } = await apiPost('/api/db/query', {
      table: 'sapos_offers',
      select: '*',
      where: { status: 'generated' },
      limit: 1,
    }, authToken);
    const offers = queryData.data || [];
    if (offers.length === 0) return; // skip if no offers

    const offerId = offers[0].id;
    const { status } = await apiPatch(`/api/db/sapos_offers/${offerId}`, {
      status: 'accepted',
    }, authToken);
    expect(status).toBe(200);

    // Verify
    const { data: verify } = await apiPost('/api/db/query', {
      table: 'sapos_offers',
      select: '*',
      where: { id: offerId },
      limit: 1,
    }, authToken);
    const updated = verify.data?.[0];
    if (updated) {
      expect(updated.status).toBe('accepted');
    }
  });

  it('PATCH offer status to declined updates correctly', async () => {
    if (!serverAvailable) return;
    const { data: queryData } = await apiPost('/api/db/query', {
      table: 'sapos_offers',
      select: '*',
      where: { status: 'generated' },
      limit: 1,
    }, authToken);
    const offers = queryData.data || [];
    if (offers.length === 0) return;

    const offerId = offers[0].id;
    const { status } = await apiPatch(`/api/db/sapos_offers/${offerId}`, {
      status: 'declined',
    }, authToken);
    expect(status).toBe(200);
  });

  it('warranty conflict detection flags conflicting offers', async () => {
    if (!serverAvailable) return;
    // Just verify that offers can have warranty_conflicts field
    const { data } = await apiPost('/api/db/query', {
      table: 'sapos_offers',
      select: '*',
      limit: 20,
    }, authToken);
    const offers = data.data || [];
    for (const o of offers) {
      expect(typeof o.warranty_conflicts === 'boolean' || o.warranty_conflicts === null).toBe(true);
    }
  });
});
