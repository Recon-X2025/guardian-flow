# Guardian Flow - Product Specification

**Version:** 6.1.0  
**Last Updated:** January 2025  
**Status:** Production Ready  
**Document Type:** Complete Product Specification

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Functional Requirements](#functional-requirements)
3. [Non-Functional Requirements](#non-functional-requirements)
4. [System Architecture](#system-architecture)
5. [Data Models](#data-models)
6. [API Specifications](#api-specifications)
7. [User Interface Specifications](#user-interface-specifications)
8. [Security Specifications](#security-specifications)
9. [Integration Specifications](#integration-specifications)
10. [Performance Specifications](#performance-specifications)

---

## Overview

### Product Vision

Guardian Flow is an extensible, enterprise-grade operations platform that provides mission-critical functionality across multiple industries. The platform is designed as a modular suite, where each module can be deployed independently or together, supporting diverse operational needs.

### Core Principles

1. **Modularity**: Each module is independently deployable and configurable
2. **Multi-Tenancy**: Complete data isolation with shared infrastructure
3. **Security-First**: SOC 2 & ISO 27001 compliance-ready architecture
4. **API-Driven**: RESTful APIs with comprehensive developer tools
5. **AI-Powered**: Intelligent automation and predictive capabilities
6. **Extensibility**: Marketplace ecosystem for third-party extensions

### Target Platforms

- **Web Application**: React-based responsive web app
- **Mobile Web**: Progressive Web App (PWA) support
- **API Platform**: RESTful API for integrations
- **Developer Portal**: Self-service API access

---

## Functional Requirements

### FR-001: Multi-Tenant Architecture

**Priority:** P0 (Critical)  
**Status:** ✅ Implemented

**Requirements:**
- Each tenant operates in complete data isolation
- All database tables enforce Row-Level Security (RLS)
- Tenant context automatically applied to all queries
- Support for unlimited tenants
- Tenant-specific configuration and branding

**Acceptance Criteria:**
- Users can only access data from their assigned tenant
- Cross-tenant data leakage is impossible
- Tenant switching is seamless for multi-tenant users
- Tenant configuration is persisted and enforced

---

### FR-002: Role-Based Access Control (RBAC)

**Priority:** P0 (Critical)  
**Status:** ✅ Implemented

**Requirements:**
- Support for 16+ distinct roles (sys_admin, tenant_admin, ops_manager, technician, etc.)
- Permission-based access control at granular level
- Role inheritance and custom role creation
- Module-level access control
- API-level permission enforcement

**Role Definitions:**
- `sys_admin`: Full platform access, all permissions
- `tenant_admin`: Tenant-level admin, excludes system admin functions
- `ops_manager`: Operational management, work orders, inventory
- `finance_manager`: Financial operations, invoicing, penalties
- `fraud_investigator`: Fraud detection and investigation
- `partner_admin`: Partner organization management
- `technician`: Field service execution
- `dispatcher`: Work order assignment and routing
- `customer`: Self-service portal access
- `auditor`: Compliance and audit access

**Acceptance Criteria:**
- Each role has clearly defined permissions
- Users are assigned roles per tenant
- UI elements are hidden/shown based on permissions
- API endpoints enforce permission checks
- Audit log records all permission checks

---

### FR-003: Work Order Management

**Priority:** P0 (Critical)  
**Status:** ✅ Implemented

**Requirements:**
- Create, read, update, delete work orders
- Status workflow: draft → released → assigned → in_progress → completed
- Priority levels: low, medium, high, critical
- SLA tracking with automated deadline calculation
- Photo requirement validation
- Precheck orchestration (inventory, warranty, photos)
- Automated service order generation
- Digital signature collection

**Data Model:**
```typescript
interface WorkOrder {
  id: UUID;
  work_order_number: string; // WO-YYYY-####
  ticket_id?: UUID;
  customer_id: UUID;
  equipment_id: UUID;
  technician_id?: UUID;
  status: 'draft' | 'released' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  sla_deadline: timestamp;
  created_at: timestamp;
  updated_at: timestamp;
  tenant_id: UUID;
}
```

**Acceptance Criteria:**
- Work orders are created from tickets or directly
- Status transitions follow defined workflow
- SLA deadlines are calculated automatically
- Prechecks block release until satisfied
- Service orders are generated upon completion
- All actions are audited

---

### FR-004: Ticket Management

**Priority:** P0 (Critical)  
**Status:** ✅ Implemented

**Requirements:**
- Create service tickets with customer, equipment, and issue details
- Automatic conversion to work orders
- Status tracking: open → in_progress → resolved → closed
- Customer portal visibility
- Communication history
- Attachment support

**Acceptance Criteria:**
- Tickets can be created by customers and internal users
- Tickets automatically convert to work orders when approved
- Customers can track ticket status in portal
- All ticket interactions are logged

---

### FR-005: Precheck Orchestration

**Priority:** P1 (High)  
**Status:** ✅ Implemented

**Requirements:**
- Automated validation before work order release:
  - Inventory availability check
  - Warranty validation
  - Photo requirement verification
- Cascade inventory checks across multiple hubs
- Override workflow with MFA protection
- Precheck status tracking
- Failure reason logging

**Acceptance Criteria:**
- Prechecks run automatically on work order creation
- Work orders cannot be released until all prechecks pass
- Override requires MFA verification
- Precheck results are visible to users
- Failed prechecks provide actionable error messages

---

### FR-006: AI-Powered SaPOS (Smart Pricing & Offer System)

**Priority:** P1 (High)  
**Status:** ✅ Implemented

**Requirements:**
- AI generates 2-3 contextual upsell offers per service
- Factors considered: warranty status, service history, unit model/age, failure symptoms
- Warranty conflict detection
- Dynamic pricing calculation
- Customer acceptance workflow
- Integration with Google Gemini 2.5 Flash

**Acceptance Criteria:**
- Offers are generated within 3 seconds
- Offers are relevant to service context
- Warranty conflicts are identified automatically
- Pricing is calculated dynamically
- Customer accept/decline is tracked

---

### FR-007: Fraud Detection & Investigation

**Priority:** P1 (High)  
**Status:** ✅ Implemented

**Requirements:**
- Real-time ML-powered anomaly detection:
  - Repeated failures (same unit, same tech)
  - Unusual pricing patterns
  - Time manipulation detection
  - Photo anomalies
- Confidence scoring (0-100)
- Investigation workflow with status tracking
- Evidence collection and notes
- Resolution tracking

**Acceptance Criteria:**
- Fraud alerts are generated in real-time
- Alerts have confidence scores for prioritization
- Investigation workflow supports full lifecycle
- All investigation actions are audited
- Alerts can be false-positive marked for ML training

---

### FR-008: Financial Management

**Priority:** P0 (Critical)  
**Status:** ✅ Implemented

**Requirements:**
- Automated invoice generation
- Penalty calculation based on configurable rules
- Multi-currency support (14 currencies)
- Real-time exchange rate updates
- Payment processing
- Settlement reconciliation
- Dispute management

**Acceptance Criteria:**
- Invoices are generated automatically on work order completion
- Penalties are calculated based on rules
- Multi-currency amounts are displayed correctly
- Exchange rates are updated daily
- Payments are tracked and reconciled
- Disputes follow defined workflow

---

### FR-009: Hierarchical Forecasting

**Priority:** P2 (Medium)  
**Status:** ✅ Implemented

**Requirements:**
- 7-level geographic hierarchy:
  - Country → Region → State → City → Hub → Pincode → Product
- 30-day forecast horizon
- 85%+ forecast accuracy target
- Historical data analysis
- Trend identification
- Capacity planning support

**Acceptance Criteria:**
- Forecasts are generated for all hierarchy levels
- Forecast accuracy is measured and reported
- Forecasts are updated daily
- Historical forecasts are stored for analysis
- Capacity planning uses forecast data

---

### FR-010: Analytics & Reporting

**Priority:** P1 (High)  
**Status:** ✅ Implemented

**Requirements:**
- Real-time dashboards
- Custom report builder
- Scheduled report delivery
- Export formats: CSV, Excel, PDF
- BI tool integrations (PowerBI, Tableau, Looker)
- Data warehouse access

**Acceptance Criteria:**
- Dashboards load within 2 seconds
- Reports can be customized with filters
- Scheduled reports are delivered on time
- Exports are formatted correctly
- BI integrations are functional
- Data warehouse queries are optimized

---

### FR-011: Developer Portal & API Access

**Priority:** P1 (High)  
**Status:** ✅ Implemented

**Requirements:**
- Self-service API key generation
- API usage analytics (30-day charts)
- Rate limiting per API key
- Usage-based billing
- API documentation
- Sandbox environment

**Acceptance Criteria:**
- Developers can generate API keys independently
- Usage is tracked and displayed in real-time
- Rate limits are enforced
- Billing is calculated accurately
- Documentation is comprehensive
- Sandbox provides full functionality

---

### FR-012: Marketplace & Extensions

**Priority:** P2 (Medium)  
**Status:** ✅ Implemented

**Requirements:**
- Extension marketplace
- Third-party extension registration
- Extension installation/uninstallation
- Revenue sharing model
- Extension ratings and reviews
- Certification process

**Acceptance Criteria:**
- Extensions are discoverable in marketplace
- Installation is one-click
- Extensions integrate seamlessly
- Revenue sharing is tracked
- Extensions are certified before listing

---

## Non-Functional Requirements

### NFR-001: Performance

**Requirements:**
- API response time: < 500ms (p95)
- Page load time: < 2 seconds
- Database query time: < 100ms (p95)
- Real-time updates: < 1 second latency
- Concurrent users: 10,000+ per tenant
- Edge function execution: < 3 seconds

**Measurement:**
- APM tools (Datadog, New Relic)
- Database query logs
- Browser performance metrics
- Real-time monitoring dashboards

---

### NFR-002: Scalability

**Requirements:**
- Horizontal scaling of Edge Functions
- Database read replicas for reporting
- CDN for static assets
- Auto-scaling based on load
- Support for 1000+ tenants
- 1M+ work orders per day

**Implementation:**
- Supabase Edge Functions (auto-scaling)
- Supabase database scaling
- Cloudflare CDN
- Load balancing
- Caching strategy

---

### NFR-003: Security

**Requirements:**
- SOC 2 Type II compliance
- ISO 27001:2022 compliance
- End-to-end encryption (TLS 1.3)
- Data encryption at rest (AES-256)
- MFA support (TOTP)
- 7-year audit log retention
- Vulnerability scanning
- Penetration testing

**Implementation:**
- Row-Level Security (RLS) on all tables
- JWT authentication
- API key rotation
- Security headers (CSP, HSTS)
- Regular security audits

---

### NFR-004: Availability

**Requirements:**
- Uptime: 99.9% (8.76 hours downtime/year)
- Planned maintenance window: < 4 hours/month
- Disaster recovery: RPO < 1 hour, RTO < 4 hours
- Multi-region deployment option
- Automated failover

**Implementation:**
- Supabase high availability
- Automated backups (daily)
- Health checks and monitoring
- Incident response procedures

---

### NFR-005: Usability

**Requirements:**
- WCAG 2.1 AA compliance
- Mobile responsive design
- Intuitive navigation
- Help documentation accessible
- Error messages are clear and actionable
- Loading states for all async operations

**Implementation:**
- Accessibility testing tools
- Mobile-first design approach
- User testing feedback
- Comprehensive error handling

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  - Web Application                                          │
│  - Progressive Web App                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│              Supabase Platform                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Auth       │  │   Database   │  │ Edge Functions│     │
│  │   (JWT)      │  │ (PostgreSQL) │  │   (Deno)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Storage    │  │   Realtime   │  │   API Gateway│     │
│  │   (S3)       │  │  (WebSocket) │  │   (REST)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

**Frontend:**
- React components (functional with hooks)
- Context API for state management
- TanStack Query for server state
- React Router for navigation
- shadcn/ui for component library

**Backend:**
- Supabase Edge Functions (serverless)
- PostgreSQL database with RLS
- Supabase Auth (JWT-based)
- Supabase Storage (S3-compatible)
- Supabase Realtime (WebSocket)

**Integrations:**
- Google Gemini 2.5 Flash (AI)
- Exchange rate APIs (currency)
- Email services (SMTP)
- SMS services (Twilio)
- Payment gateways (Stripe)

---

## Data Models

### Core Entities

**User & Tenant:**
- `profiles` - User profiles with tenant association
- `tenants` - Tenant organizations
- `user_roles` - Role assignments per user/tenant
- `role_permissions` - Permission mappings

**Work Orders:**
- `tickets` - Service requests
- `work_orders` - Work order records
- `prechecks` - Precheck validation results
- `service_orders` - Generated service orders
- `attachments` - Photos and documents

**Financial:**
- `invoices` - Invoice records
- `payments` - Payment transactions
- `penalties` - Penalty calculations
- `settlements` - Settlement records
- `disputes` - Dispute cases

**Fraud & Compliance:**
- `fraud_alerts` - Fraud detection alerts
- `fraud_investigations` - Investigation records
- `audit_logs` - Audit trail
- `compliance_evidence` - Compliance documentation

**Forecasting:**
- `forecasts` - Forecast records
- `forecast_accuracy` - Accuracy metrics
- `demand_patterns` - Historical patterns

---

## API Specifications

### Authentication

**JWT Token (User):**
```
Authorization: Bearer {jwt_token}
```

**API Key (Developer):**
```
X-API-Key: {api_key}
```

### REST API Conventions

**Base URL:**
```
https://{project-id}.supabase.co/rest/v1
```

**Standard Methods:**
- `GET` - Retrieve resources
- `POST` - Create resources
- `PATCH` - Update resources
- `DELETE` - Delete resources

**Query Parameters:**
- `select` - Field selection
- `filter` - Row filtering (`eq`, `gt`, `lt`, `in`, etc.)
- `order` - Sorting
- `limit` - Result limiting
- `offset` - Pagination

**Response Format:**
```json
{
  "data": [...],
  "error": null,
  "count": 100
}
```

### Edge Function APIs

**Agent Services:**
- `POST /functions/v1/agent/ops` - Operations agent
- `POST /functions/v1/agent/fraud` - Fraud agent
- `POST /functions/v1/agent/finance` - Finance agent
- `POST /functions/v1/agent/forecast` - Forecast agent

**Request Format:**
```json
{
  "action": "create_work_order",
  "params": {...}
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {...},
  "error": null
}
```

---

## User Interface Specifications

### Design System

**Color Palette:**
- Primary: Blue (#0066CC)
- Secondary: Gray (#6B7280)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Error: Red (#EF4444)

**Typography:**
- Headings: Inter (Bold)
- Body: Inter (Regular)
- Code: JetBrains Mono

**Spacing:**
- Base unit: 4px
- Standard spacing: 8px, 16px, 24px, 32px

### Layout Structure

**Header:**
- Logo and branding
- Navigation menu
- User profile menu
- Notifications

**Sidebar:**
- Role-based menu items
- Collapsible groups
- Active state indicators
- Badge counts

**Main Content:**
- Breadcrumb navigation
- Page title and actions
- Data tables/cards
- Pagination

**Footer:**
- Copyright information
- Links to documentation

### Responsive Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## Security Specifications

### Authentication

- JWT tokens (15-minute expiry)
- Refresh tokens (7-day expiry)
- MFA support (TOTP)
- Password requirements: 8+ chars, uppercase, lowercase, number, special char

### Authorization

- Role-Based Access Control (RBAC)
- Permission-based API access
- Row-Level Security (RLS) on all tables
- API key scoping

### Data Protection

- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Secure cookie handling
- CSRF protection
- XSS protection

### Audit & Compliance

- 7-year audit log retention
- Immutable audit records
- Compliance evidence collection
- Security incident tracking

---

## Integration Specifications

### Email Integration

**SMTP Configuration:**
- Host, port, username, password
- TLS/SSL support
- From address configuration
- Template system

**Email Types:**
- Welcome emails
- Password reset
- Notification emails
- Report delivery

### SMS Integration

**Provider:** Twilio
- Phone number configuration
- Template messages
- Delivery tracking

### Payment Integration

**Provider:** Stripe
- Payment method collection
- Subscription management
- Invoice payment processing
- Webhook handling

### BI Tool Integration

**Supported Tools:**
- PowerBI
- Tableau
- Looker
- Google Data Studio

**Integration Method:**
- OAuth authentication
- Direct database connection
- API access
- Export formats

---

## Performance Specifications

### Response Time Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Page Load | < 2s | Browser DevTools |
| API Response | < 500ms (p95) | APM tools |
| Database Query | < 100ms (p95) | Query logs |
| Edge Function | < 3s | Function logs |
| Real-time Update | < 1s | WebSocket latency |

### Throughput Targets

| Metric | Target |
|--------|--------|
| API Requests/sec | 1,000+ |
| Concurrent Users | 10,000+ per tenant |
| Work Orders/day | 1M+ |
| Database Connections | 100+ |

### Resource Limits

| Resource | Limit |
|----------|-------|
| API Rate (Free) | 1,000/day |
| API Rate (Professional) | 10,000/day |
| API Rate (Business) | 100,000/day |
| Storage per Tenant | 100GB |
| Edge Function Memory | 512MB |
| Edge Function Timeout | 60s |

---

**Document Version:** 6.1.0  
**Last Updated:** January 2025  
**Maintained By:** Guardian Flow Product Team

