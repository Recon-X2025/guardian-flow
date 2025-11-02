# Client Roles & Personas Across Industries

**Version:** 1.0  
**Date:** November 1, 2025  
**Document Type:** Client Role Definitions  
**Status:** Enterprise-Ready

---

## Overview

Guardian Flow serves as a **client-vendor management platform** where **Clients** (enterprise organizations) manage their relationships with **Vendors** (service providers, manufacturers, partners). This document defines client-side roles and personas across multiple industries.

---

## Architectural Model

### Client-Vendor Relationship

```
┌─────────────────────────────────────────────────────────────┐
│                    GUARDIAN FLOW PLATFORM                    │
│                   (Multi-Tenant SaaS)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐         ┌───────▼────────┐
        │    CLIENT      │◄──────►│    VENDOR      │
        │   (Tenant)     │ Contract│  (Tenant)      │
        │                │         │                │
        │ • OEM Client 1 │         │ • ServicePro   │
        │ • OEM Client 2 │         │ • TechField    │
        │ • Insurance 1  │         │ • RepairHub    │
        │ • Retail Client│         │ • FixIt        │
        └────────────────┘         └────────────────┘
              │                           │
              │ Manages                   │ Executes
              ▼                           ▼
    • SLAs                                • Work Orders
    • Contracts                           • Technicians
    • Performance                         • Resources
    • Compliance                          • Deliverables
    • Billing                             • Quality
```

---

## Client Role Hierarchy

### New Client-Specific Roles

```
client_admin (Enterprise Client Admin)
    ├── client_operations_manager (Day-to-day ops oversight)
    │   ├── contract_manager (Vendor contract management)
    │   └── sla_manager (SLA compliance monitoring)
    │
    ├── client_finance_manager (Financial oversight)
    │   ├── billing_manager (Invoice review & approval)
    │   └── vendor_analyst (Vendor cost analysis)
    │
    ├── client_compliance_officer (Risk & compliance)
    │   ├── vendor_assessor (Vendor risk assessment)
    │   └── audit_coordinator (Vendor audit management)
    │
    ├── client_procurement_manager (Vendor sourcing & selection)
    │   └── rfp_manager (RFP & bid management)
    │
    └── client_executive (C-level oversight & reporting)
```

---

## Industry-Specific Client Personas

### 1. Technology Manufacturing (OEM Client 1, OEM Client 2)

#### Client Admin
**Persona**: Enterprise IT leader managing 50+ service vendors  
**Use Cases**:
- Multi-vendor SLA compliance across regions
- Equipment lifecycle tracking
- Warranty management
- Service quality benchmarking
- Cost optimization across vendors

#### Client Operations Manager
**Persona**: Ops lead ensuring service continuity  
**Use Cases**:
- Real-time service request monitoring
- Vendor performance scorecards
- Escalation management
- Service level reporting

#### Client Finance Manager
**Persona**: Finance controller managing vendor budgets  
**Use Cases**:
- Invoice approval workflows
- Cost per service unit analysis
- Budget vs. actual tracking
- Vendor payment scheduling

#### Client Procurement Manager
**Persona**: Sourcing manager selecting vendors  
**Use Cases**:
- RFP creation and distribution
- Vendor bidding and evaluation
- Contract negotiations
- Vendor onboarding

---

### 2. Consumer Electronics Manufacturing (OEM Client 2)

#### Client Admin
**Persona**: Manufacturing operations executive managing production line vendors  
**Use Cases**:
- Production equipment maintenance vendors
- Calibration service providers
- Safety compliance monitoring
- Quality assurance vendors
- Facility management contractors

#### Client Operations Manager
**Persona**: Production line manager ensuring uptime  
**Use Cases**:
- Equipment downtime prevention
- Preventive maintenance scheduling
- Vendor response time tracking
- Production impact analysis

#### Client Compliance Officer
**Persona**: Quality & safety officer  
**Use Cases**:
- Regulatory compliance verification
- Safety vendor certifications
- Audit trail management
- Incident investigation

---

### 3. Insurance (Insurance Client 1)

#### Client Admin
**Persona**: Claims operations director managing fraud detection vendors  
**Use Cases**:
- Fraud detection vendor performance
- Investigation vendor coordination
- Forensic analysis vendors
- Legal service providers

#### Client Fraud Manager
**Persona**: Fraud prevention lead  
**Use Cases**:
- Vendor fraud detection accuracy
- False positive rate monitoring
- Investigation turnaround time
- Vendor integration with internal systems

#### Client Compliance Officer
**Persona**: Insurance regulatory compliance officer  
**Use Cases**:
- IRDA compliance monitoring
- Vendor data security assessments
- Regulatory reporting
- Vendor audit trails

---

### 4. Telecom (Telecom Client 1, Telecom Client 2)

#### Client Admin
**Persona**: Network operations director  
**Use Cases**:
- Tower maintenance vendors
- Fiber network contractors
- Installation partners
- Infrastructure monitoring

#### Client Operations Manager
**Persona**: Network uptime manager  
**Use Cases**:
- Service availability tracking
- Vendor MTTR monitoring
- Incident escalation
- Network performance SLA

---

### 5. Retail (Retail Client 1, Retail Client 2)

#### Client Admin
**Persona**: Supply chain director  
**Use Cases**:
- Logistics vendor management
- Warehouse operations vendors
- Last-mile delivery partners
- Returns processing vendors

#### Client Operations Manager
**Persona**: Supply chain operations lead  
**Use Cases**:
- Delivery SLA compliance
- Vendor capacity planning
- Cost per delivery tracking
- Customer satisfaction monitoring

---

### 6. Healthcare (Healthcare Client 1, Healthcare Client 2)

#### Client Admin
**Persona**: Hospital operations director  
**Use Cases**:
- Medical equipment maintenance
- Facility management vendors
- Biomedical engineering vendors
- Compliance certifications

#### Client Compliance Officer
**Persona**: Healthcare regulatory officer  
**Use Cases**:
- NABH compliance
- Medical device vendor approvals
- HIPAA compliance verification
- Vendor security assessments

---

### 7. Banking (Banking Client 1, Banking Client 2)

#### Client Admin
**Persona**: Banking operations head  
**Use Cases**:
- ATM maintenance vendors
- Network infrastructure vendors
- Security service providers
- Digital transformation partners

#### Client Compliance Officer
**Persona**: Banking compliance officer  
**Use Cases**:
- RBI compliance monitoring
- Vendor risk assessments
- Regulatory audit trails
- Vendor due diligence

---

## Client Use Cases by Module

### Module: Field Service Management

#### UC-CLIENT-FSM-001: Monitor Multi-Vendor Field Service Performance
**As a** Client Operations Manager  
**I want to** view performance across all vendor technicians  
**So that** I can ensure service quality standards are met

**Acceptance Criteria**:
- Dashboard shows all active service requests across vendors
- Real-time vendor performance metrics
- Filter by vendor, service type, region
- SLA breach alerts by vendor
- Historical vendor comparison charts

#### UC-CLIENT-FSM-002: Approve and Reject Service Orders
**As a** Client Operations Manager  
**I want to** approve service orders before vendor execution  
**So that** I can control costs and ensure compliance

**Acceptance Criteria**:
- Service orders routed for approval
- Cost breakdown visible before approval
- Rejection with reason tracking
- Approval workflow history
- Budget impact preview

#### UC-CLIENT-FSM-003: Vendor Scorecard and Benchmarking
**As a** Client Admin  
**I want to** generate vendor scorecards monthly  
**So that** I can make data-driven vendor selection decisions

**Acceptance Criteria**:
- Automated scorecard generation
- Multi-vendor performance comparison
- KPI trends over time
- Export to PDF/Excel
- Share with vendor management team

---

### Module: Asset Lifecycle Management

#### UC-CLIENT-ASSET-001: Track Asset Maintenance Across Vendors
**As a** Client Operations Manager  
**I want to** monitor all asset maintenance schedules  
**So that** I can prevent costly equipment downtime

**Acceptance Criteria**:
- Asset register across all locations
- Preventive maintenance scheduling
- Vendor assignment by asset type
- Maintenance history per vendor
- Downtime impact tracking

#### UC-CLIENT-ASSET-002: Warranty and Contract Management
**As a** Client Admin  
**I want to** manage warranties and service contracts centrally  
**So that** I can optimize asset lifecycle costs

**Acceptance Criteria**:
- Warranty expiration alerts
- Contract renewal reminders
- Vendor warranty claim tracking
- Cost per asset type analysis
- ROI calculations

---

### Module: Fraud Detection & Compliance

#### UC-CLIENT-FRAUD-001: Monitor Fraud Detection Vendor Performance
**As a** Client Fraud Manager  
**I want to** track fraud detection accuracy metrics  
**So that** I can optimize fraud prevention spend

**Acceptance Criteria**:
- Detection accuracy by vendor
- False positive rates
- Investigation turnaround times
- Fraud loss prevented analysis
- Vendor ML model performance

#### UC-CLIENT-FRAUD-002: Coordinate Multi-Vendor Investigations
**As a** Client Fraud Manager  
**I want to** manage complex cases across vendors  
**So that** I can resolve fraud incidents quickly

**Acceptance Criteria**:
- Case assignment to vendors
- Evidence sharing across vendors
- Investigation timeline tracking
- Vendor collaboration tools
- Final report aggregation

---

### Module: Analytics & BI

#### UC-CLIENT-ANALYTICS-001: Vendor Performance Dashboard
**As a** Client Executive  
**I want to** view executive-level vendor KPIs  
**So that** I can make strategic vendor decisions

**Acceptance Criteria**:
- High-level vendor performance summary
- Cost efficiency metrics
- Quality indicators
- Risk assessments
- Executive reports

#### UC-CLIENT-ANALYTICS-002: Predictive Vendor Analytics
**As a** Client Admin  
**I want to** predict vendor performance issues  
**So that** I can proactively manage vendor relationships

**Acceptance Criteria**:
- Risk score predictions
- SLA breach forecasting
- Capacity planning insights
- Cost trend analysis
- Recommendation engine

---

## Client Permissions Matrix

| Permission | Client Admin | Client Ops | Client Finance | Client Compliance | Client Procurement | Client Executive |
|------------|--------------|------------|----------------|-------------------|-------------------|------------------|
| vendor.view_all | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| vendor.performance_scorecards | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| vendor.create_assessment | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| contract.view_all | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| contract.create | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| contract.negotiate | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| sla.view_all | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| sla.breach_review | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| invoice.view_all | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| invoice.approve | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| work_order.view_all | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| work_order.approve | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| vendor.manage_users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| rfp.create | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| audit.view | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| report.export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Vendor Interaction Points

### Client Actions on Vendor Data

1. **View**: Read-only access to vendor-submitted information
2. **Approve**: Accept vendor deliverables
3. **Reject**: Return for correction
4. **Escalate**: Raise vendor performance issues
5. **Benchmark**: Compare across vendors
6. **Report**: Generate vendor performance reports

### Vendor Actions on Client Data

1. **Submit**: Deliver service orders, invoices, reports
2. **Update**: Modify work order status, add evidence
3. **Request**: Ask for approvals, information
4. **Acknowledge**: Confirm receipt of instructions

---

## Data Isolation Model

### Client Tenant
- Owns contracts with vendors
- Approves/rejects vendor submissions
- Views aggregated vendor data
- Manages vendor relationships

### Vendor Tenant
- Receives work from clients
- Submits deliverables to clients
- Reports on SLA compliance
- Manages own technicians/resources

### Cross-Tenant Visibility
- Vendors see ONLY their assigned work from clients
- Clients see ONLY their contracted vendors
- No direct data access between vendors
- Platform mediates all interactions

---

## Implementation Priorities

### Phase 1: Core Client Roles ✅
- Client Admin
- Client Operations Manager
- Client Finance Manager

### Phase 2: Compliance & Procurement
- Client Compliance Officer
- Client Procurement Manager

### Phase 3: Executive & Specialists
- Client Executive
- Industry-specific specialist roles

---

## Test Account Strategy

Create test accounts representing:
1. **Client Admins** across industries
2. **Client Operations Managers** for service monitoring
3. **Client Finance Managers** for billing oversight
4. **Client Compliance Officers** for risk management
5. **Client Procurement Managers** for vendor selection

Each account will have:
- Industry-specific context
- Relevant module access
- Sample vendor relationships
- Historical performance data

---

**Next Steps**: Create comprehensive client test accounts and integrate into TestAccountSelector component.

