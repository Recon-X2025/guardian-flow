#!/usr/bin/env node
/**
 * @file server/scripts/seed-vector-pressure.js
 * @description
 * D3 — "Vector Pressure": Seed 1,000,000 synthetic tickets for pgvector load testing.
 *
 * Generates a semantically varied ticket corpus spanning multiple domains
 * (hardware, software, network, security, billing) with pre-computed mock
 * embeddings so the k6 load test can hit semanticSuggestResolution at scale.
 *
 * Usage:
 *   node server/scripts/seed-vector-pressure.js
 *   node server/scripts/seed-vector-pressure.js --count 100000   # smaller run
 *   node server/scripts/seed-vector-pressure.js --batch 5000      # batch size
 *
 * Environment:
 *   MONGO_URI / DATABASE_URL — standard DB connection strings
 *   DB_ADAPTER               — 'mongodb' (default) | 'postgresql'
 *
 * When targeting PostgreSQL + pgvector, the embeddings column must exist:
 *   ALTER TABLE tickets ADD COLUMN IF NOT EXISTS embedding vector(64);
 *   CREATE INDEX ON tickets USING hnsw (embedding vector_cosine_ops)
 *     WITH (m = 16, ef_construction = 64);
 */

import { randomUUID } from 'crypto';

// ── Configuration ─────────────────────────────────────────────────────────────

const TOTAL_RECORDS = parseInt(process.argv[3] === '--count' ? process.argv[4] : '', 10) || 1_000_000;
const BATCH_SIZE    = parseInt(process.argv[3] === '--batch' ? process.argv[4] :
                               process.argv[5] === '--batch' ? process.argv[6] : '', 10) || 2_500;
const EMBEDDING_DIM = 64; // reduced-dimension mock vector; replace with 1536 for real OpenAI embeddings

// ── Semantic corpus templates ─────────────────────────────────────────────────

const DOMAINS = [
  {
    name: 'hardware',
    titles: [
      'Printer not responding after firmware update',
      'Laptop battery drains in under 2 hours',
      'Monitor flickering on HDMI connection',
      'USB-C docking station intermittent disconnect',
      'Server fan running at 100% — thermal alert',
    ],
    resolutions: [
      'Rolled back firmware to v2.1.4 — issue resolved.',
      'Battery replaced under warranty.',
      'Updated GPU driver; HDMI cable replaced.',
      'Replaced docking station hub board.',
      'Cleaned dust filter; thermal paste reapplied.',
    ],
  },
  {
    name: 'software',
    titles: [
      'CRM application crashes on Windows 11 after update KB5034441',
      'Email client unable to connect to Exchange server',
      'VPN client disconnects after 30 minutes of inactivity',
      'Browser extensions disabled after Chrome policy update',
      'ERP module returns 500 error on invoice submission',
    ],
    resolutions: [
      'Uninstalled KB5034441 — escalated to vendor.',
      'Re-configured autodiscover DNS record.',
      'Adjusted idle timeout in VPN policy.',
      'Whitelisted extensions via Group Policy.',
      'Applied hotfix patch 2024-11 to ERP.',
    ],
  },
  {
    name: 'network',
    titles: [
      'Wi-Fi drops every 20 minutes on floor 3',
      'Slow internet performance in branch office',
      'VoIP calls breaking up — packet loss detected',
      'Unable to access shared drives from remote location',
      'DNS resolution failing intermittently',
    ],
    resolutions: [
      'Replaced faulty AP on floor 3.',
      'Upgraded branch router firmware.',
      'QoS rules updated to prioritize RTP traffic.',
      'Split-tunnel VPN configured for SMB.',
      'Flushed DNS cache; secondary DNS added.',
    ],
  },
  {
    name: 'security',
    titles: [
      'Suspicious login from unrecognized IP — MFA bypass attempt',
      'Ransomware alert on file server — quarantine initiated',
      'SSL certificate expired — website showing insecure warning',
      'Phishing email bypassed spam filter',
      'User account locked after 10 failed login attempts',
    ],
    resolutions: [
      'Account password reset; geofencing policy applied.',
      'Isolated host; restored from verified backup.',
      'Certificate renewed; auto-renewal configured.',
      'Updated spam filter rules; user training scheduled.',
      'Account unlocked; password policy reviewed.',
    ],
  },
  {
    name: 'billing',
    titles: [
      'Invoice generated with incorrect tax rate',
      'Credit card payment failing for enterprise customer',
      'Duplicate charge on subscription renewal',
      'Unable to download PDF invoice',
      'Pro-rata calculation incorrect after mid-cycle upgrade',
    ],
    resolutions: [
      'Tax rate corrected in billing profile; credit note issued.',
      'Updated card details; retry successful.',
      'Duplicate transaction refunded within 5 business days.',
      'PDF generation service restarted.',
      'Pro-rata logic patched in billing engine v3.2.1.',
    ],
  },
];

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES   = ['open', 'in_progress', 'resolved', 'closed'];

// ── Mock embedding generator ──────────────────────────────────────────────────

/**
 * Generate a deterministic low-dimensional embedding vector for a text string.
 * In production, replace this with real OpenAI / sentence-transformer embeddings.
 * The goal here is to create a semantically varied distribution so cosine
 * similarity queries return non-trivial results.
 *
 * The vector is constructed by hashing the domain name and title into a
 * repeatable float32 array — same text always produces same vector.
 */
function mockEmbedding(domainIndex, titleIndex, dim = EMBEDDING_DIM) {
  const seed = domainIndex * 1000 + titleIndex;
  const vec  = [];
  let   state = seed;
  for (let i = 0; i < dim; i++) {
    // Lehmer LCG — fast, deterministic, no external dependencies
    state = (state * 1_664_525 + 1_013_904_223) & 0xffffffff;
    vec.push(((state >>> 16) / 32768) - 1.0); // range [-1, 1]
  }
  // L2-normalise so cosine similarity equals dot product
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

// ── Ticket factory ────────────────────────────────────────────────────────────

let _counter = 0;

function makeSyntheticTicket() {
  const domainIdx  = _counter % DOMAINS.length;
  const domain     = DOMAINS[domainIdx];
  const titleIdx   = Math.floor(_counter / DOMAINS.length) % domain.titles.length;
  const resIdx     = titleIdx % domain.resolutions.length;
  const priorityIdx = _counter % PRIORITIES.length;
  const statusIdx   = _counter % STATUSES.length;

  _counter++;

  const createdAt = new Date(Date.now() - Math.floor(Math.random() * 365) * 86_400_000);

  return {
    id:          randomUUID(),
    title:       `${domain.titles[titleIdx]} [${_counter}]`,
    description: `Auto-generated ticket #${_counter} — ${domain.name} domain.`,
    category:    domain.name,
    priority:    PRIORITIES[priorityIdx],
    status:      STATUSES[statusIdx],
    resolution:  STATUSES[statusIdx] === 'resolved' || STATUSES[statusIdx] === 'closed'
                   ? domain.resolutions[resIdx]
                   : null,
    embedding:   mockEmbedding(domainIdx, titleIdx),
    tenant_id:   'vector-pressure-tenant',
    created_at:  createdAt,
    updated_at:  createdAt,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[seed-vector-pressure] Seeding ${TOTAL_RECORDS.toLocaleString()} tickets in batches of ${BATCH_SIZE.toLocaleString()}`);
  console.log('[seed-vector-pressure] Embedding dimension:', EMBEDDING_DIM);
  console.log('[seed-vector-pressure] Domains:', DOMAINS.map(d => d.name).join(', '));
  console.log('');

  let inserted    = 0;
  const startTime = Date.now();

  // Lazy-load DB adapter so the script works without the full server boot
  const { getAdapter } = await import('../db/factory.js');
  const adapter = await getAdapter();

  while (inserted < TOTAL_RECORDS) {
    const batchCount = Math.min(BATCH_SIZE, TOTAL_RECORDS - inserted);
    const batch      = Array.from({ length: batchCount }, () => makeSyntheticTicket());

    try {
      await adapter.insertMany('tickets', batch);
      inserted += batchCount;

      const elapsed  = ((Date.now() - startTime) / 1_000).toFixed(1);
      const rate     = Math.round(inserted / parseFloat(elapsed));
      const pct      = ((inserted / TOTAL_RECORDS) * 100).toFixed(1);
      process.stdout.write(`\r  ${pct.padStart(5)}% — ${inserted.toLocaleString()} / ${TOTAL_RECORDS.toLocaleString()} inserted  (${rate.toLocaleString()} rec/s, ${elapsed}s elapsed)`);
    } catch (err) {
      console.error(`\n[seed-vector-pressure] Batch insert failed at ${inserted}: ${err.message}`);
      process.exit(1);
    }
  }

  const totalSecs = ((Date.now() - startTime) / 1_000).toFixed(1);
  console.log(`\n\n[seed-vector-pressure] ✅ Done — ${TOTAL_RECORDS.toLocaleString()} records in ${totalSecs}s`);
  console.log('[seed-vector-pressure] Next step: run the k6 vector pressure test:');
  console.log('  k6 run tests/load/vector-pressure.js');

  await adapter.close?.();
}

main().catch(err => {
  console.error('[seed-vector-pressure] Fatal error:', err.message);
  process.exit(1);
});
