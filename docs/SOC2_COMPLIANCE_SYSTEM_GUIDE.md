# SOC 2 Compliance System Guide

**Version:** 7.0 | **Date:** April 2026

## Overview

This guide describes the compliance infrastructure that is currently built into the Guardian Flow platform. It documents what is implemented, what is pending, and how compliance evidence is collected.

> **Honest status:** The compliance *infrastructure* (audit logging, access controls, incident response routes) is implemented. The formal SOC 2 Type II *audit* has not been initiated. Certification is targeted for Q4 2026.

---

## 1. Compliance Infrastructure — Implemented

### 1.1 Audit Logging

All sensitive operations are logged to the `audit_logs` collection:

```javascript
import { logAuditEvent } from '../services/audit.js';

await logAuditEvent(db, {
  userId: req.user.id,
  action: 'workorder.override',
  resourceType: 'work_order',
  resourceId: woId,
  actorRole: req.user.roles[0],
  tenantId: req.user.tenantId,
  correlationId: req.correlationId,
});
```

Audit log properties:
- **Retention:** 7-year immutable archive (partitioned `audit_logs_2025` through `audit_logs_2031`)
- **Tenant isolation:** Every log entry includes `tenant_id`
- **Correlation:** Every entry linked to the request `correlationId`
- **Cannot be deleted** via normal API — requires DBA-level access

### 1.2 Access Control

| Control | Implementation |
|---------|---------------|
| RBAC (8 roles) | `user_roles` + `role_permissions` collections; enforced in every route |
| MFA for high-risk ops | `mfa_tokens` collection; TOTP validation |
| JIT privileged access | Temporary elevated permissions with automatic expiry |
| Automated quarterly access reviews | Review campaigns in `access_review_campaigns` collection |
| Session tokens | JWT (24h expiry) + refresh tokens |

### 1.3 Data Protection

| Control | Implementation |
|---------|---------------|
| Encryption at rest | MongoDB Atlas managed encryption |
| Encryption in transit | TLS (configure at load balancer / reverse proxy) |
| Input sanitisation | Zod schemas on all API request bodies |
| Output sanitisation | DOMPurify on frontend; no raw HTML from API |
| Password hashing | bcryptjs, salt rounds 10 |

### 1.4 Incident Response

`server/routes/security-monitor.js` at `/api/security` provides:
- P0–P3 incident classification and tracking
- Incident timeline recording
- SIEM webhook forwarding (configure `SIEM_WEBHOOK_URL`)
- Post-incident review templates

### 1.5 Vulnerability Management

- npm audit runs on every CI build
- Current state: 17 upstream vulnerabilities (all devDependencies, not runtime)
- SLA for patching: Critical — 24h; High — 7 days; Medium — 30 days

### 1.6 Policy Governance

```
policy_registry collection: all active security and compliance policies
agent_policy_bindings: which automated agents are bound to which policies
compliance_policy route (/api/compliance-policy): enforcement + evidence
```

---

## 2. Compliance Routes

| Endpoint | Purpose |
|----------|---------|
| `GET /api/compliance-policy/policies` | List all active policies |
| `POST /api/compliance-policy/policies` | Create a new policy |
| `GET /api/compliance-policy/evidence` | Export compliance evidence for auditors |
| `POST /api/compliance-policy/incidents` | Record a security incident |
| `GET /api/compliance-policy/access-reviews` | List access review campaigns |
| `GET /api/audit-log` | Export audit logs (filterable by tenant, date range, actor) |

---

## 3. Collecting Compliance Evidence

For audit preparation, export evidence packages:

```bash
# All audit logs for a 30-day period
GET /api/audit-log?from=2026-01-01&to=2026-01-31&format=csv
Authorization: Bearer <sys_admin_token>

# Access review records
GET /api/compliance-policy/access-reviews?completed=true
Authorization: Bearer <sys_admin_token>

# Policy enforcement log
GET /api/compliance-policy/evidence?period=Q1-2026
Authorization: Bearer <sys_admin_token>
```

---

## 4. SOC 2 Trust Service Criteria — Status

| Criterion | Evidence Available | Gap |
|-----------|-------------------|-----|
| CC6.1 Logical access controls | RBAC audit logs, `user_roles` | Need formal access review cadence documentation |
| CC6.2 Authentication | JWT + MFA logs | Need password policy documentation |
| CC6.3 Role assignment | `user_roles` collection | Need provisioning/deprovisioning runbook |
| CC7.1 Threat detection | Anomaly detection logs | No WAF; no SIEM subscription yet |
| CC7.2 Incident response | Incident log in `security-monitor` | Need tested runbook + tabletop exercise |
| CC9.1 Change management | FlowSpace release records | Need formal SDLC change control policy |
| A1.1 Availability | Health endpoints, metrics | No SLA commitment document |
| C1.1 Confidentiality | Tenant isolation, encryption | Pending penetration test |

---

## 5. Gaps Before SOC 2 Audit Can Begin

| Gap | Priority |
|-----|---------|
| Formal incident response runbook (tested) | High |
| Penetration test (external) | High |
| WAF deployment | Medium |
| Formal change management policy document | Medium |
| Password policy documentation | Low |
| SLA commitment document | Low |

See `docs/SOC2_ISO27001_COMPLIANCE_ROADMAP.md` for the full 18-month plan.

---

## 6. GDPR / Data Residency

The application architecture supports GDPR compliance in principle:
- Data is tenant-isolated
- Audit logs record all data access
- Delete endpoints exist for user data

**Not implemented:**
- Formal GDPR data processing agreements (DPA) templates
- Automated data subject access request (DSAR) workflow
- Data residency enforcement (requires cloud-region configuration at Atlas level)
