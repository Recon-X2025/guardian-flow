# Agent Auto-Release Setup

**Version:** 7.0 | **Date:** April 2026

## Overview

Guardian Flow supports automated release workflows for deployment pipelines. Auto-release is implemented via the DEX ExecutionContext state machine combined with FlowSpace decision records. This provides an auditable, automated deployment pathway with optional human-in-the-loop approval gates.

---

## 1. Release Architecture

```
CI Pipeline triggers POST /api/dex/contexts (create release context)
    │
    ▼
DEX Stage: created → assigned (automated via release agent)
    │
    ▼
DEX Stage: assigned → in_progress (build verification)
    │
    ▼
DEX Stage: in_progress → pending_review
    │        (or auto-advance if all checks pass and auto_release=true)
    ▼
[Human gate — optional, skipped in auto-release mode]
    │
    ▼
DEX Stage: pending_review → completed (release deployed)
    │
    ▼
FlowSpace records the release decision (immutable audit)
```

---

## 2. DEX ExecutionContext for Releases

### Create a release context

```bash
POST /api/dex/contexts
Authorization: Bearer <service_account_token>
Content-Type: application/json

{
  "domain": "release",
  "entity_type": "deployment",
  "entity_id": "<git_sha_or_build_id>",
  "metadata": {
    "branch": "main",
    "version": "6.2.0",
    "triggered_by": "ci-pipeline",
    "auto_release": true
  }
}
```

### Advance stage

```bash
PUT /api/dex/contexts/<context_id>/stage
Authorization: Bearer <service_account_token>
Content-Type: application/json

{
  "stage": "in_progress",
  "reason": "Build passed: 155/155 tests, 0 failures"
}
```

### Stage Machine States

```
created → assigned → in_progress → pending_review → completed → closed
                                                  ↘ failed (terminal)
                                 ↘ cancelled (terminal)
```

---

## 3. Auto-Release Configuration

For fully automated release (no human gate):

```bash
PUT /api/dex/contexts/<context_id>/stage
{
  "stage": "completed",
  "reason": "Auto-release: all quality gates passed",
  "metadata": {
    "test_result": "155/155 passed",
    "build_size_kb": 3374,
    "lint_result": "clean"
  }
}
```

Every stage transition writes a FlowSpace decision record automatically — the complete release history is permanently auditable.

---

## 4. Required Quality Gates Before Auto-Release

The following checks should pass before advancing to `completed`:

| Gate | Check |
|------|-------|
| Unit tests | `node_modules/.bin/vitest run` — 0 failures |
| TypeScript | `npx tsc --noEmit` — 0 errors |
| Build | `npm run build` — successful Vite build |
| npm audit | No new CRITICAL runtime vulnerabilities |
| Tenant isolation | No cross-tenant data exposure in E2E tests |

---

## 5. Service Account for CI Pipeline

Create a dedicated service account with minimal required permissions:

```bash
POST /api/auth/register
{
  "email": "ci-pipeline@internal.example.com",
  "full_name": "CI Pipeline Service Account",
  "tenant_id": "<platform_tenant_id>"
}
```

Assign the `sys_admin` role only for the `release` domain, or create a custom role with `dex.execute` permission only.

---

## 6. Rollback

To mark a release as failed and trigger a rollback:

```bash
PUT /api/dex/contexts/<context_id>/stage
{
  "stage": "failed",
  "reason": "Production health check failed — rolling back",
  "metadata": { "previous_version": "6.1.0" }
}
```

This creates a permanent FlowSpace audit record of the failure, visible in the decision ledger.

---

## 7. Viewing Release History

```bash
GET /api/flowspace/records?domain=release
Authorization: Bearer <token>
```

Or via the FlowSpace UI in the platform at `/flowspace` (tenant admin access required).

All release decisions are append-only and cannot be deleted.
