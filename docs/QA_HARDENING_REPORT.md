# Guardian Flow — Revised QA Hardening Report

**Issued:** 2026-04-10 (for COB 2026-04-15 deadline)  
**Baseline:** [docs/TEST_REPORT.md](./TEST_REPORT.md) — 429/429 vitest tests, 0 failures, 14.27 s  
**Scope:** Assessment of five mandatory hardening directives for May 2026 NexusOps Go-Live and October GuardianFlow Launch  
**Status summary:**

| Directive | Title | Status |
|---|---|---|
| 1 | Kill the Stubs — AI/ML Logic Validation | 🟡 Partially addressed — gaps remain |
| 2 | State Machine Chaos — Temporal.io Integrity | 🔴 Not demonstrated — Temporal absent |
| 3 | Vector Pressure — pgvector Scalability | 🔴 No native pgvector; brute-force fallback only |
| 4 | Bare-Metal Orchestration — HPE-Track Proof | ⚪ Out-of-scope for this agent (infrastructure) |
| 5 | The 10 k Siege — Full-Stack Stress Re-run | 🟡 k6 harness exists; 10k script absent; not run |

---

## Executive Summary

The existing baseline achieves 100 % pass rate across 31 test files and 429 test cases. This is a genuine signal of **route stability and contract correctness**, not cosmetic padding. However, the directives correctly identify four categories where current coverage is insufficient for production load:

1. ML/AI route tests assert HTTP 200 but do not gate on prediction quality thresholds.
2. There is no evidence of Temporal.io being present or tested; the DEX service uses an in-process state machine stored in MongoDB, not a durable workflow engine.
3. Vector search uses brute-force cosine similarity over MongoDB documents, not a native pgvector index. At 1 M tickets the current approach will timeout far before 250 ms.
4. The stress script (`tests/load/stress-test.js`) caps at 50 concurrent users for 70 s. A `stress-test-10000.js` file referenced in the directive does not exist in the repository.

Concrete findings and recommended remediation tracks for each directive follow.

---

## Directive 1 — "Kill the Stubs" (AI/ML Logic Validation)

### Current State

**Confirmed stub tests in `tests/api/comprehensive-all-routes.api.test.js`:**

```
test('POST /api/ml/predict/failure — stub predict', ...)
test('POST /api/ai/vision/analyze — stub request', ...)
```

Both tests call `expectSafe(status, ...)`, which only requires a non-500 response code.
They do **not** inspect the response body, model version, confidence score, or any accuracy metric.

**Partially addressed in the dedicated AI suites:**

| File | Assertion | Gap |
|---|---|---|
| `tests/api/ai-predictive.api.test.js` | `confidence_score` field exists, `failure_probability` in [0, 1] | Does **not** assert `confidence_score > 0.85` on a known-failure dataset |
| `tests/api/ai-forgery.api.test.js` | `confidence_score` is a parseable number in [0, 1]; `accuracy > 0` | Threshold is `> 0`, not `> 0.85` |
| `tests/api/ai-forecast.api.test.js` | Numeric bounds on forecast values, confidence intervals bracket forecast | No minimum accuracy threshold |
| `tests/api/ai-fraud.api.test.js` | Status transitions validated | No model quality assertion |
| `tests/api/ai-offers.api.test.js` | PATCH accept/decline round-trip | No confidence score validation |

**ML implementation (server/ml/):**

The ML layer is **not purely stubbed at the implementation level**. It contains:

- `failure.js` — Logistic Regression with real feature engineering (days-since-maintenance, failure rate, equipment age)
- `sla.js` — Statistical model for SLA breach prediction
- `forecasting.js` — Holt-Winters triple exponential smoothing
- `anomaly.js` — Statistical anomaly detection (replacing `Math.random() > 0.7`)
- `orchestrator.js` — Training pipeline with synthetic data fallback

The **gap** is test-layer: training requires a deployed model in MongoDB (`ml_models` collection, `status: deployed`). The test environment starts cold; without pre-seeded training data and a training run, `/api/ml/predict/failure` returns `404 — No trained model found`, which `expectSafe` silently accepts.

### Required Actions

| # | Action | Owner | By |
|---|---|---|---|
| 1a | Add a `beforeAll` fixture in `ai-predictive.api.test.js` that calls `POST /api/ml/train/failure` with synthetic "failed equipment" data and awaits `status: deployed` | QA/Engineering | Apr 20 |
| 1b | Add assertion: `confidence_score >= 0.85` on responses where the input dataset is the known-failure seed (the logistic regression already computes `|probability - 0.5| * 2`; the seed must be tuned so this exceeds 0.85) | QA | Apr 20 |
| 1c | Replace the two stub-labelled tests in `comprehensive-all-routes.api.test.js` with body-validating assertions (at minimum: response has `prediction` or `result` field) | QA | Apr 15 |
| 1d | Add equivalent threshold assertion for forgery: `confidence_score >= 0.80` for known-tampered images (the forgery ML pipeline returns a computed confidence already) | QA | Apr 20 |

### Effort estimate: 2–3 engineer-days

---

## Directive 2 — "State Machine Chaos" (Temporal.io Integrity)

### Current State

**No Temporal.io dependency exists in the repository.**

```
$ grep -r "temporal" package.json server/ --include="*.js" --include="*.json"
(no results)
```

The DEX (Distributed Execution & Experience) layer is implemented as:
- A MongoDB-backed state machine in `server/routes/dex.js`
- Stage transitions validated in-process via the `VALID_STAGES` array
- Execution trace appended to the `execution_trace` field of the context document
- FlowSpace used to record governance events (`server/services/flowspace.js`)

This is a **synchronous, stateless Express handler** — not a durable workflow engine. If the container is killed mid-transition, the transition is either committed (document already written) or lost entirely. There is no worker-pickup mechanism.

The 14.27 s test duration is **not** evidence of Temporal workers being mocked — it is a reflection of the in-process nature of the execution model itself.

### Gap Analysis

| Requirement from directive | Reality in codebase |
|---|---|
| Temporal.io workers | Not present — no `@temporalio/*` package |
| Durable execution under container kill | Not possible with current architecture |
| Worker picks up orphaned state within 45 s | No worker exists |
| FlowSpace records interruption + recovery | FlowSpace records are written but there is no recovery agent to write the "recovered" event |

### Required Actions

This directive requires an architectural decision, not a test change:

| Option | Description | Complexity |
|---|---|---|
| **A** | Adopt `@temporalio/client` + `@temporalio/worker`; migrate DEX transitions to Temporal Workflows | High (2–3 sprints) |
| **B** | Implement a lightweight saga/outbox pattern using the existing MongoDB adapter and a polling worker (`server/workers/dex-recovery.js`) | Medium (1 sprint) |
| **C** | Document the current in-process model as intentional and accept eventual-consistency risk at the May go-live, with Temporal as a post-launch migration target | Low (0 sprints) — but does not satisfy the directive |

**Recommendation:** Option B for May 2026, with Option A on the October 2026 roadmap. The DEX route already writes a full `execution_trace` array on every transition — a recovery worker can poll for contexts stuck in a non-terminal stage for >N minutes and resume or flag them, with FlowSpace recording the recovery rationale.

### Effort estimate: 5–8 engineer-days for Option B

---

## Directive 3 — "Vector Pressure" (pgvector Scalability)

### Current State

**No pgvector is in use.** The semantic search stack is:

```js
// server/services/ai/embeddings.js
export async function vectorSearch(collectionName, queryVector, limit = 5, filter = {}) {
  const allDocs = await findMany(collectionName, filter, { limit: 500 });
  // Brute-force cosine similarity across up to 500 documents
  const scored = allDocs
    .filter(doc => doc.embedding && doc.embedding.length > 0)
    .map(doc => ({ ...doc, similarity: cosineSimilarity(queryVector, doc.embedding) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
```

Key constraints:
- Retrieves a maximum of **500 documents** regardless of corpus size — at 1 M tickets this silently under-samples the corpus, returning semantically incorrect results.
- Cosine similarity is computed in Node.js on the main thread (synchronous O(n × d) loop).
- No index; no approximate nearest-neighbour (ANN) algorithm.
- The database adapter defaults to **MongoDB**, not PostgreSQL/pgvector.

At 1 M tickets with 1,536-dimensional OpenAI embeddings, a full-corpus scan would require approximately:
- Reading ~1 M documents × 6 KB average = ~6 GB of I/O
- Computing ~1.5 B floating-point multiply-adds on the Node.js main thread
- **Estimated latency: 30–120 seconds per query** — far beyond the 250 ms threshold.

### Required Actions

| # | Action | Owner | By |
|---|---|---|---|
| 3a | Migrate the semantic resolution service to PostgreSQL + pgvector (`pgvector` npm package, `DB_ADAPTER=postgresql`) | Engineering | Apr 25 |
| 3b | Add `CREATE INDEX ON knowledge_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)` in a new migration | Engineering | Apr 25 |
| 3c | Replace the brute-force `vectorSearch` with `SELECT ... ORDER BY embedding <=> $1 LIMIT 5` (pgvector operator `<=>`) | Engineering | Apr 25 |
| 3d | Write a k6 load script (`tests/load/vector-pressure.js`) seeding 1 M tickets and running 50 VUs against `semanticSuggestResolution`; success gate: p95 latency < 250 ms | QA | May 1 |
| 3e | Document HNSW tuning parameters (`ef_search`, `m`) and re-run k6 until gate passes | Engineering | May 5 |

### Effort estimate: 8–12 engineer-days

---

## Directive 4 — "Bare-Metal Orchestration" (HPE-Track Proof)

### Current State

This directive is **entirely an infrastructure/DevOps task**, not a code or test task. No changes to the application code are required for the migration itself. However, two verification items have code dependencies:

**IoT Telemetry (`/api/iot/`)** — Implemented in `server/routes/iot.js`. Runs in-process; no external broker dependency. Will run on bare metal without modification.

**CBM Rules (`/api/cbm/`)** — Implemented in `server/routes/cbm.js`. Pure API + MongoDB. Will run on bare metal without modification.

**`nexusops-cli` backup/restore** — No `nexusops-cli` binary or script exists in the repository. This must be created or sourced independently.

### Required Actions (infrastructure-track, outside code agent scope)

| # | Action | Owner |
|---|---|---|
| 4a | Provision HPE ProLiant (or equivalent) with MongoDB, Node.js 20 LTS, and PM2/systemd | DevOps |
| 4b | Deploy the application bundle from CI artifacts | DevOps |
| 4c | Run the existing vitest suite on bare metal; expected result: 429/429 pass | QA |
| 4d | Run `tests/load/stress-test.js` (k6) on bare metal against IoT and CBM endpoints specifically | QA |
| 4e | Implement and test `nexusops-cli backup` and `nexusops-cli restore` for MongoDB + env config | Engineering/DevOps |
| 4f | Validate air-gapped operation (disable outbound network; confirm the application serves all routes without external calls timing out) | QA |

**Code prerequisite:** The application makes outbound calls in several places (LLM endpoints, SSO, external payment gateways). An air-gapped configuration requires a feature flag or environment-variable gate to stub these calls. This should be tracked as a separate engineering task.

### Effort estimate: 5–10 engineer-days (DevOps + Engineering combined)

---

## Directive 5 — "The 10k Siege" (Final Stress Re-run)

### Current State

**The file `node scripts/stress-test-10000.js` does not exist** in the repository.

What does exist:

| File | VUs | Duration | Auth | DB Writes | Result |
|---|---|---|---|---|---|
| `tests/load/stress-test.js` | ramp 10 → 50 | 70 s | ✅ JWT | ❌ GET only | Not run (no k6 in CI) |

The existing k6 script (`tests/load/stress-test.js`) correctly uses real JWT auth and performs database reads (work orders, tickets, invoices). However it does not perform **writes**, and its scale (50 VUs, 70 s) is far below 10,000 users.

**A true 10,000-concurrent-user test cannot run on the current Vultr VPS without cloud-scale load injection tooling** (k6 Cloud, Grafana Cloud, Artillery Cloud, or a distributed k6 setup). Running 10,000 simultaneous TCP connections from a single test machine requires:
- OS-level tuning (`ulimit -n`, `net.ipv4.ip_local_port_range`)
- A load-injector machine (or fleet) separate from the system under test

### Required Actions

| # | Action | Owner | By |
|---|---|---|---|
| 5a | Create `server/scripts/stress-test-10000.js` (k6) with the following specification: | QA | Apr 18 |
| | — Stages: ramp to 1k VUs over 2 min, hold 5 min, ramp to 5k over 5 min, hold 10 min, ramp to 10k over 5 min, hold 5 min | | |
| | — Each VU: sign in (JWT), create a work order (POST /api/db/work_orders), query back (GET), update status (PATCH) | | |
| | — Thresholds: `http_req_duration p(95) < 2000ms`, `http_req_failed rate < 1%` | | |
| 5b | Run on k6 Cloud or equivalent distributed load injector (not localhost) | QA | Apr 22 |
| 5c | Gate: exit code 0, CPU < 85%, memory leak delta < 2% over 1-hour sustained burst (use `node --inspect` + clinic.js or Prometheus/Grafana) | QA | Apr 22 |
| 5d | If memory leak detected, profile with `node --heap-prof` and address the top allocation | Engineering | Apr 25 |

### Effort estimate: 3–5 engineer-days (script authoring + infrastructure provisioning)

---

## Overall Readiness Assessment

| Dimension | Current | Required for Go-Live | Gap |
|---|---|---|---|
| Route contract coverage | ✅ 100% (429/429) | ✅ | None |
| Security hardening | ✅ Tested (XSS, NoSQL injection, JWT tamper, oversized payloads) | ✅ | None |
| ML prediction quality gates | 🟡 Field presence only; no threshold (>0.85) | 🔴 Threshold assertions + trained model fixture | ~3 days |
| Durable workflow under failure | 🔴 In-process only; no recovery | 🔴 Outbox/saga worker minimum | ~8 days |
| Semantic search at scale | 🔴 Brute-force, 500-doc cap | 🔴 pgvector + HNSW index | ~12 days |
| Bare-metal validation | ⚪ Not yet performed | 🔴 Must pass on HPE/dedicated hardware | ~10 days (infra) |
| 10k user stress test | 🟡 50-VU script exists; not run | 🔴 Full-stack 10k with DB writes, exit code 0 | ~5 days |

### Total estimated remaining work to satisfy all five directives: ~38 engineer-days

Given the **April 15 COB deadline for this report** and the **April 20 partial deadline for Directive 1**, the following sequencing is recommended:

```
Week of Apr 14  →  D1: Replace stub assertions + training fixture (2 devs × 2 days)
                   D5: Author 10k k6 script (1 dev × 2 days)
Week of Apr 21  →  D1: Confidence threshold validation complete
                   D5: 10k siege run on k6 Cloud; baseline result captured
                   D3: Begin pgvector migration (2 devs)
Week of Apr 28  →  D2: Implement outbox/saga recovery worker
                   D3: HNSW index + k6 vector pressure test
Week of May 5   →  D4: Bare-metal environment provisioned; full vitest run on HPE
                   D2/D3: Final validation; update this report
```

---

## Appendix A — How to Verify the Baseline

```bash
# Install dependencies (if fresh clone)
npm install

# Run full vitest suite
node_modules/.bin/vitest run --reporter=verbose

# Expected output
# Test Files  31 passed (31)
#       Tests  429 passed (429)
#    Duration  ~14 s
```

## Appendix B — How to Run the Existing Load Test

```bash
# Install k6 (macOS)
brew install k6

# Install k6 (Linux)
sudo apt install k6  # or: snap install k6

# Start the server in a separate terminal
node server/server.js

# Run the existing stress test (50 VUs)
k6 run tests/load/stress-test.js

# Run with overridden API target
k6 run -e API_URL=http://your-server:3001 tests/load/stress-test.js
```

## Appendix C — Stub Tests Identified for Replacement

The following tests are labelled "stub" and assert only HTTP status, not response body quality:

| File | Line | Test name |
|---|---|---|
| `tests/api/comprehensive-all-routes.api.test.js` | 456 | `POST /api/ml/predict/failure — stub predict` |
| `tests/api/comprehensive-all-routes.api.test.js` | 505 | `POST /api/ai/vision/analyze — stub request` |
| `tests/api/comprehensive-all-routes.api.test.js` | 322 | `POST /api/storage — create folder / upload stub (no file)` |

The storage stub is acceptable (file upload requires multipart and object storage; testing a no-file stub is reasonable). The ML and vision stubs are the targets for Directive 1.

---

*This report was generated on 2026-04-10 against commit `5c827e5` of branch `copilot/execute-sprint-29-through-52`.*  
*The 429-test baseline remains valid and unbroken. The five directives identify genuine gaps in quality depth, not route coverage.*
