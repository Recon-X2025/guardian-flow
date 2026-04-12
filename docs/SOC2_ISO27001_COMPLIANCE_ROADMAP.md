# SOC 2 & ISO 27001 Compliance Roadmap

**Version:** 7.0  
**Date:** April 2026  
**SOC 2 Target:** Q4 2026  
**ISO 27001 Target:** Q1 2027

> **Honesty note:** Previous versions of this document overstated completion status ("85/100 security posture score") without a formal third-party assessment. The status below reflects what is *actually built in code*, not aspirational claims. No formal audit has been initiated as of April 2026.

---

## Actual Security Posture (Self-Assessed, April 2026)

| Domain | Built | Pending |
|--------|:-----:|:-------:|
| Access control (RBAC, MFA, JIT) | ✅ | Formal access review cadence |
| Audit logging (7-year immutable) | ✅ | Formal log review process |
| Incident response infrastructure | ✅ | Tested runbook; tabletop exercise |
| Vulnerability management | ✅ | External penetration test |
| Encryption (at rest + in transit) | ✅ | Key rotation policy |
| Change management audit trail | ✅ (FlowSpace) | Formal SDLC policy doc |
| Data loss prevention | ❌ | Not built |
| WAF | ❌ | Not deployed |
| SOC 2 audit engagement | ❌ | Auditor not yet selected |
| ISO 27001 ISMS documentation | ❌ | Not started |

---

## Phase 1: Pre-Audit Foundations (Months 1–3)

### 1.1 Immediate Priorities

**Policy Documentation (Weeks 1–4)**
- [ ] Write and ratify Acceptable Use Policy
- [ ] Write and ratify Password Policy (min length, complexity, rotation)
- [ ] Write and ratify Incident Response Runbook (P0–P3 playbooks)
- [ ] Write and ratify Change Management Policy (using FlowSpace as evidence)
- [ ] Write and ratify Business Continuity Plan

**Technical Gaps (Weeks 2–8)**
- [ ] Deploy WAF (Cloudflare or AWS WAF) in front of Express.js
- [ ] Enable MongoDB Atlas audit logging at the database driver level
- [ ] Configure SIEM integration (`SIEM_WEBHOOK_URL` → Datadog/Splunk)
- [ ] Implement automated JWT secret rotation
- [ ] Document MongoDB Atlas key management and encryption policy

**Testing (Weeks 4–12)**
- [ ] Commission external penetration test (scope: API + web application)
- [ ] Run tabletop incident response exercise (P1 scenario)
- [ ] Complete first quarterly access review using built-in review system

### 1.2 What Already Qualifies as Evidence

| SOC 2 Control | Evidence Source |
|---------------|----------------|
| CC6.1 — Logical access controls | `user_roles`, `role_permissions`, RBAC audit logs |
| CC6.2 — Authentication | JWT auth logs, MFA token records |
| CC6.3 — Role management | `user_roles` collection with timestamps |
| CC7.1 — Anomaly detection | `anomaly_cases`, z-score detection logs |
| CC7.2 — Incident response | `security-monitor` incident log |
| CC9.1 — Change management | FlowSpace `decision_records` for deployments |
| A1.1 — Availability monitoring | `/api/metrics`, `/health` endpoint logs |

---

## Phase 2: Gap Closure (Months 4–9)

### 2.1 Access Management

- [ ] Automated user de-provisioning workflow (integrate with HR system or manual trigger)
- [ ] Privileged access reviews — monthly for `sys_admin`, quarterly for `tenant_admin`
- [ ] Role-based SLA for access provision/deprovision (target: < 24h)
- [ ] Formal separation of duties documentation

### 2.2 Data Handling

- [ ] Formal data classification policy (Public / Internal / Confidential / Restricted)
- [ ] GDPR Data Subject Access Request (DSAR) workflow
- [ ] Data retention and deletion policy documentation
- [ ] Processor/subprocessor list (OpenAI, MongoDB Atlas, payment providers)

### 2.3 Logging & Monitoring

- [ ] Centralised SIEM with alerting rules (see `docs/MONITORING_SETUP.md` Section 12)
- [ ] Minimum 12-month live log retention with SIEM (7-year archive already built)
- [ ] Monthly security metric reviews (false positive rate, 403 spike analysis)
- [ ] Formal SLA for security alert response (P0: 1h, P1: 4h, P2: 24h)

### 2.4 Vendor Management

- [ ] Vendor security questionnaire for OpenAI, MongoDB Atlas, payment processors
- [ ] BAA / DPA agreements with data processors
- [ ] Annual vendor review cadence

---

## Phase 3: SOC 2 Type I Audit (Months 10–12)

**Target: Q3 2026**

- [ ] Select SOC 2 auditor (shortlist: A-LIGN, Schellman, Coalfire)
- [ ] Provide auditor with system description and evidence package
- [ ] Resolve any auditor-identified findings
- [ ] Receive SOC 2 Type I report

SOC 2 Type I validates that controls are *designed* correctly at a point in time. It is a prerequisite for Type II.

---

## Phase 4: SOC 2 Type II Observation Period (Months 12–18)

**Target: Q4 2026**

- [ ] 6-month observation period with auditor
- [ ] Maintain evidence of control operation throughout observation period
- [ ] No material control failures during observation period
- [ ] Receive SOC 2 Type II report

SOC 2 Type II validates that controls *operated effectively* over a period of time.

---

## ISO 27001 Roadmap (Parallel Track, Q1 2027 Target)

ISO 27001 requires an Information Security Management System (ISMS). Current state:

| Requirement | Status |
|-------------|--------|
| Risk assessment process | ❌ Not documented |
| ISMS scope document | ❌ Not written |
| Statement of Applicability (SoA) | ❌ Not written |
| Control implementation (Annex A) | ~40% complete (access, audit, incident) |
| Internal audit | ❌ Not scheduled |
| Management review | ❌ Not scheduled |

ISO 27001 certification is a 12–18 month process from ISMS implementation start. Begin ISMS documentation after SOC 2 Type I is achieved.

---

## Investment Estimate

| Phase | Activity | Estimated Cost |
|-------|----------|---------------|
| Phase 1 | Policy writing, pentest, WAF | $30K–$60K |
| Phase 2 | SIEM, vendor reviews, DPA | $20K–$40K |
| Phase 3 | SOC 2 Type I audit | $25K–$50K |
| Phase 4 | SOC 2 Type II audit | $35K–$60K |
| ISO 27001 | ISMS + certification | $50K–$100K |
| **Total** | | **$160K–$310K** |

These are realistic estimates based on comparable SaaS companies at this stage. Previous estimates of $450K–$650K were significantly overstated.

---

## Responsibility Matrix

| Area | Responsible |
|------|------------|
| Technical controls | Engineering team |
| Policy documentation | CTO / CISO (or appointed owner) |
| Audit engagement | CEO / CFO |
| Vendor management | Legal / Operations |
| Evidence collection | Engineering (automated via `/api/compliance-policy/evidence`) |

---

*See `docs/SOC2_COMPLIANCE_SYSTEM_GUIDE.md` for the detailed guide to compliance infrastructure already built in the platform.*
