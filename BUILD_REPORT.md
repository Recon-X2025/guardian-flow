# Guardian Flow — Build Report

**Date:** 2026-04-12  
**Branch:** `copilot/sprint-29-through-52`  
**Head Commit:** `94433dc` — _fix: resolve ReDoS email regex and deduplicate VALID\_ROLES in org.js_  

---

## Environment

| Item | Version |
|------|---------|
| Node.js | v24.14.1 |
| npm | 11.11.0 |
| TypeScript | ^5.8.3 |
| Vite | ^5.4.19 |
| React | ^18.3.1 |
| Express | (server) |

---

## Build — ✅ Passed

**Tool:** Vite v5.4.21 (production build)  
**Duration:** 16.59 s  
**Modules transformed:** 3,824  

### Output Bundle Summary

| Asset | Raw size | Gzip |
|-------|----------|------|
| `index.html` | 1.55 kB | 0.62 kB |
| `index.css` | 94.37 kB | 16.60 kB |
| `OrgManagementConsole-*.js` _(new MAC page)_ | 28.72 kB | 7.19 kB |
| `AdminConsole-*.js` | 22.70 kB | 5.35 kB |
| `WorkOrders-*.js` | 31.54 kB | 9.07 kB |
| `InvoiceDetailDialog-*.js` _(largest chunk)_ | 397.05 kB | 129.65 kB |
| `vendor-recharts-*.js` | 373.58 kB | 110.10 kB |
| `index-*.js` _(main entry)_ | 222.55 kB | 60.35 kB |
| `vendor-react-*.js` | 164.00 kB | 53.53 kB |
| `html2canvas.esm-*.js` | 201.42 kB | 48.03 kB |

**Total dist size:** ~3.3 MB  
**Total asset files:** 169  

> ℹ️  `baseline-browser-mapping` data is over two months old — run `npm i baseline-browser-mapping@latest -D` to refresh Baseline browser compatibility data.

---

## Tests — ✅ Passed

**Tool:** Vitest v1.6.1  
**Total:** 155 tests across 21 test files  
**Duration:** 15.03 s  
**Result:** All files passed — 0 failures, 0 skipped

### Per-file Results

| File | Tests | Duration | Result |
|------|------:|--------:|--------|
| `tests/unit/db-adapter.test.ts` | 13 | 141 ms | ✅ |
| `tests/unit/apiClient.test.ts` | 6 | 11 ms | ✅ |
| `tests/integration/auth.test.ts` | 6 | 10 ms | ✅ |
| `tests/api/auth.api.test.js` | 4 | 6 ms | ✅ |
| `tests/api/database.api.test.js` | 15 | 5 ms | ✅ |
| `tests/api/endpoints.api.test.js` | 6 | 6 ms | ✅ |
| `tests/api/ai-offers.api.test.js` | 5 | 11 ms | ✅ |
| `tests/api/ai-fraud.api.test.js` | 5 | 7 ms | ✅ |
| `tests/api/ai-forgery.api.test.js` | 5 | 13 ms | ✅ |
| `tests/api/ai-forecast.api.test.js` | 5 | 13 ms | ✅ |
| `tests/api/ai-predictive.api.test.js` | 5 | 8 ms | ✅ |
| `tests/components/migration-smoke.test.tsx` | 25 | 19 ms | ✅ |
| `tests/components/OfferAI.test.tsx` | 8 | 1,520 ms | ✅ |
| `tests/components/ForgeryDetection.test.tsx` | 8 | 2,134 ms | ✅ |
| `tests/components/ForecastCenter.test.tsx` | 8 | 1,888 ms | ✅ |
| `tests/components/PredictiveMaintenance.test.tsx` | 9 | 1,319 ms | ✅ |
| `tests/components/FraudInvestigation.test.tsx` | 8 | 1,022 ms | ✅ |
| `tests/components/AnalyticsTabs.test.tsx` | 4 | 557 ms | ✅ |
| `tests/components/CreateWorkOrderDialog.test.tsx` | 4 | 1,027 ms | ✅ |
| `tests/components/PrecheckStatus.test.tsx` | 3 | 336 ms | ✅ |
| `tests/components/GenerateServiceOrderDialog.test.tsx` | 3 | 653 ms | ✅ |

---

## Security Audit

**Tool:** `npm audit`  
**Total vulnerabilities:** 17 (1 low · 8 moderate · 7 high · 1 critical)

> These are **all pre-existing** dependency vulnerabilities — none were introduced by changes in this branch.

### Notable Advisories

| Severity | Package | Advisory |
|----------|---------|----------|
| Critical | `jsPDF` | PDF injection in AcroForm module allows arbitrary JavaScript execution ([GHSA-p5xg-68wr-hm3m](https://github.com/advisories/GHSA-p5xg-68wr-hm3m), [GHSA-pqxr-3g65-p328](https://github.com/advisories/GHSA-pqxr-3g65-p328)) |
| High | `rollup` | Arbitrary file write via path traversal in v4.0.0–4.58.0 ([GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc)) |
| High | `qs` | `arrayLimit` bypass in comma parsing allows DoS ([GHSA-w7fw-mjwx-w883](https://github.com/advisories/GHSA-w7fw-fjwx-w883)) |
| Moderate | `DOMPurify` | `USE_PROFILES` prototype pollution allows event handlers ([GHSA-cj63-jhhr-wcxv](https://github.com/advisories/GHSA-cj63-jhhr-wcxv)) |

**Recommended:** Run `npm audit fix` to resolve non-breaking issues. Use `npm audit fix --force` for breaking-change upgrades (review carefully).

---

## Recent Commits

| SHA | Message |
|-----|---------|
| `94433dc` | fix: resolve ReDoS email regex and deduplicate VALID\_ROLES in org.js |
| `f0dba9c` | feat: add Organisation Management Console (MAC) — backend API + frontend page + route + sidebar |

---

## What Was Built (MAC Feature)

This branch added a full **Organisation Management and Administration Console (MAC)** — there was no existing self-service org portal on the platform.

### New Files

| File | Purpose |
|------|---------|
| `server/routes/org.js` | 9-endpoint REST API for org CRUD and member management |
| `src/domains/org/pages/OrgManagementConsole.tsx` | React MAC page with 5 tabs |

### Modified Files

| File | Change |
|------|--------|
| `server/server.js` | Mounts `orgRoutes` at `/api/org` |
| `src/App.tsx` | Adds `/org-console` route (lazy-loaded, role-guarded) |
| `src/domains/shared/components/AppSidebar.tsx` | "Org Console" entry under System section |

### API Endpoints (`/api/org`)

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/api/org` | sys\_admin / tenant\_admin | List organisations |
| POST | `/api/org` | sys\_admin | Create organisation |
| GET | `/api/org/:id` | sys\_admin / own tenant\_admin | Get organisation |
| PATCH | `/api/org/:id` | sys\_admin / own tenant\_admin | Update profile |
| DELETE | `/api/org/:id` | sys\_admin | Soft-deactivate |
| GET | `/api/org/:id/members` | sys\_admin / tenant\_admin | List members |
| POST | `/api/org/:id/members/invite` | sys\_admin / tenant\_admin | Invite member |
| PATCH | `/api/org/:id/members/:uid` | sys\_admin / tenant\_admin | Change role/status |
| DELETE | `/api/org/:id/members/:uid` | sys\_admin / tenant\_admin | Remove member |

### Frontend Console Tabs

| Tab | Features |
|-----|---------|
| Overview | Member count, plan badge, contact summary, quick-action buttons |
| Profile | Edit name, industry, contact info, address, timezone, logo URL |
| Members | Role inline-select, active toggle, remove, invite dialog |
| Billing | Plan card, per-plan usage limits, sys\_admin plan-change control |
| Security | MFA/SSO/IP allowlist/audit-logging toggles; CIDR list; danger-zone deactivation |

---

_Report generated: 2026-04-09 · Guardian Flow v0.0.0_
