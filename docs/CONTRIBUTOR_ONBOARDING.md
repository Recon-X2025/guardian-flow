# Guardian Flow — Contributor Onboarding & Build Context

**Last updated:** April 2026  
**Purpose:** Bring any new contributor up to speed on what exists, what is mocked, what needs to be built, and why the current docs look the way they do.

---

## Why this document exists

In April 2026, a full audit of the codebase found that every one of the 14 reference docs contained inaccurate or aspirational claims — features marked as live that were stubs, a self-assessed 85/100 security score with no third-party basis, GPU/Kubernetes infrastructure requirements predicated on a computer-vision feature that runs `Math.random()`, and hardcoded demo credentials in the partner setup guide.

All 14 docs were deleted and rewritten from the codebase up. The full discussion — including what was wrong, why it mattered, and what the intended build roadmap is — is preserved in:

> **[PR #4 — docs: delete and recreate all reference docs with honest, accurate content](https://github.com/Recon-X2025/guardian-flow/pull/4)**

Read PR #4 before starting any substantial work. It contains the decisions that shaped every doc in `docs/`.

---

## Current platform parity

~37% of enterprise FSM feature parity (vs ServiceNow, Salesforce Field Service). See [`docs/PLATFORM_COMPREHENSIVE_AUDIT.md`](PLATFORM_COMPREHENSIVE_AUDIT.md) for the full breakdown.

---

## AI / ML: mock vs live

This is the single most common source of confusion.

| Condition | Behaviour |
|-----------|-----------|
| No env vars set (default) | Keyword-match mock LLM; statistical anomaly detection (real, uses `simple-statistics`); mock embeddings |
| `OPENAI_API_KEY` + `AI_PROVIDER=openai` | Real GPT-4o LLM, real OpenAI embeddings, real RAG over tenant documents |
| Any env config | Photo defect detection (`vision.js`) is **always** `Math.random()` — no real CV model exists |

The CV stub is the biggest gap in the AI layer. Building real computer vision requires replacing `server/services/vision.js` with an actual model inference service.

---

## What is a stub vs what is live

See [`docs/PRD.md`](PRD.md) for the full per-feature table. Summary of the biggest gaps:

### ❌ Not built at all
- Mobile / Offline PWA (plugin in devDeps but not configured)
- Revenue recognition (ASC 606 / IFRS 15)
- Recurring / subscription billing
- Multi-jurisdiction tax engine
- Email / Calendar sync (Gmail, Outlook)
- Marketing automation
- GraphQL API (REST only)
- Auto-generated OpenAPI spec
- ESG emissions methodology and regulatory reporting
- SOC 2 Type II / ISO 27001 formal certification (infrastructure ready; audit not initiated)
- RTL / multi-locale support

### 🔲 Stub (scaffolding only, no real logic)
- Photo defect detection (`Math.random()`) — `server/services/vision.js`
- IoT / MQTT telemetry ingestion — activates only with `MQTT_BROKER_URL` env var
- ERP connectors: SAP, Salesforce, QuickBooks — service classes exist, make zero real API calls (`server/services/erp/`)
- Federated learning coordinator — route stub only
- Marketplace extension backend — no submission/certification workflow
- Customer satisfaction surveys and health scoring

### 🔑 Code-complete but needs a key
- Payments (Stripe / PayPal / Razorpay) — needs provider API keys
- LLM assistant — needs `OPENAI_API_KEY` + `AI_PROVIDER=openai`
- Push notifications — needs FCM/APNS credentials

---

## Infrastructure reality

The platform runs on a standard Node.js + MongoDB + React stack. There is **no GPU requirement** — that claim was based on the CV stub and has been removed from all docs.

Minimum production spec: 2-core CPU, 4 GB RAM, MongoDB Atlas M10.

See [`docs/INFRASTRUCTURE_REQUIREMENTS.md`](INFRASTRUCTURE_REQUIREMENTS.md) for the full (corrected) spec.

---

## Build priority (recommended next steps)

Based on the audit and the PR #4 discussion, the three highest-leverage areas to close the ~63% parity gap are:

1. **Real computer vision** — Replace `server/services/vision.js` mock with an actual inference endpoint (e.g., Azure Computer Vision, Google Vision API, or a self-hosted ONNX model). This unlocks the photo validation workflow end-to-end.

2. **ERP connector activation** — The SAP/Salesforce/QuickBooks service classes have the right shape; they just need real API credentials and the auth/request logic filled in. Completing one connector (QuickBooks is the simplest) proves the pattern for the others.

3. **PWA / Offline** — Wire `vite-plugin-pwa` (already in devDeps), add a service worker with background sync for work order updates. This is a high-value field technician feature and is architecturally straightforward.

---

## Key files for new contributors

| File | Purpose |
|------|---------|
| [`docs/PRD.md`](PRD.md) | Full feature inventory with honest ✅/🔑/🔲/❌ status |
| [`docs/PLATFORM_COMPREHENSIVE_AUDIT.md`](PLATFORM_COMPREHENSIVE_AUDIT.md) | Parity scorecard vs enterprise competitors |
| [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | System diagram, AI mock/live duality, tenant isolation |
| [`docs/TRD.md`](TRD.md) | Technical reference: stack, env vars, API contracts |
| [`BUILD_REPORT.md`](../BUILD_REPORT.md) | Last recorded build/test/lint results |
| [`docs/RBAC_ACTION_PERMISSIONS.md`](RBAC_ACTION_PERMISSIONS.md) | Full permission matrix |
| [`docs/TESTING_GUIDE.md`](TESTING_GUIDE.md) | How to run tests (`node_modules/.bin/vitest run`) |

---

## Running the platform locally

```bash
# Install
npm install

# Development (Vite + Express)
npm run dev

# Tests
node_modules/.bin/vitest run

# Production build
npm run build

# Database migrations (idempotent)
node server/scripts/phase0-migration.js
```

Required env vars: see [`docs/TRD.md`](TRD.md) §Environment Variables.
