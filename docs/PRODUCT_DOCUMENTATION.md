# Guardian Flow - Product Documentation

**Version:** 6.1.0  
**Last Updated:** 2nd November 2025  
**Status:** Production Ready  
**Document Type:** Complete Product Documentation

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Platform Architecture](#platform-architecture)
4. [Core Modules](#core-modules)
5. [User Guides](#user-guides)
6. [API Documentation](#api-documentation)
7. [Configuration Guide](#configuration-guide)
8. [Troubleshooting](#troubleshooting)
9. [Glossary](#glossary)

---

## Executive Summary

**Guardian Flow** is an enterprise-grade, modular operations platform designed for mission-critical functionality across multiple industries. The platform provides unified infrastructure for asset lifecycle management, AI forecasting, fraud detection, marketplace/extensions, analytics & BI, compliance automation, video training, and customer portals—all built on a secure, multi-tenant architecture.

### Key Differentiators

- **Modular Architecture**: Deploy modules independently or together
- **Multi-Industry Support**: Manufacturing, telecom, utilities, healthcare, retail, logistics, IT services
- **Enterprise Security**: SOC 2 & ISO 27001 ready, complete RBAC/RLS
- **AI-Powered Intelligence**: Fraud detection, forecasting, predictive maintenance
- **Developer-Friendly**: RESTful APIs, webhooks, marketplace ecosystem
- **Zero-Touch Automation**: 95% reduction in manual operations

---

## Product Overview

### What is Guardian Flow?

Guardian Flow is **not** a Field Service Management (FSM)-first product. Instead, it's an extensible suite of core modules, each serving distinct enterprise functions. Field Service Management is one integrated module within the broader platform ecosystem.

### Core Platform Components

1. **Platform Infrastructure** ($12/user/month base)
   - Multi-tenant isolation
   - Enterprise security & RBAC
   - API gateway & integrations
   - Developer portal & marketplace

2. **Modular Add-Ons** (pay-per-module)
   - Field Service Management
   - Asset Lifecycle Management
   - AI Forecasting & Scheduling
   - Fraud Detection & Compliance
   - Analytics & BI Integration
   - Customer Portal
   - Video Training & Knowledge Base
   - Marketplace & Extensions

### Target Markets

- **Enterprise Organizations** (500+ employees)
- **Regulated Industries** (healthcare, finance, utilities)
- **Multi-National Operations** requiring compliance
- **Organizations with Complex Partner Ecosystems**
- **Companies Requiring Fraud Prevention**

---

## Platform Architecture

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS + shadcn/ui components
- TanStack Query for data fetching
- React Router for navigation

**Backend:**
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- 77+ Edge Functions (Deno runtime)
- RESTful API architecture
- Real-time subscriptions via Supabase Realtime

**Infrastructure:**
- Multi-tenant database architecture
- Row-Level Security (RLS) on all tables
- Edge function deployment (global CDN)
- Automated backups & disaster recovery

### Data Architecture

**Core Tables:** 131+ database tables
- `work_orders` - Core work order management
- `tickets` - Service request tracking
- `profiles` - User & tenant management
- `user_roles` - RBAC role assignments
- `role_permissions` - Permission mappings
- `audit_logs` - Comprehensive audit trail

**Security:**
- 100% RLS coverage on all tables
- JWT-based authentication
- MFA support (TOTP)
- API key management for developers

---

## Core Modules

### 1. Field Service Management

**Overview:** Complete work order lifecycle from ticket creation to completion and invoicing.

**Key Features:**
- Ticket creation & management
- Work order orchestration
- Technician dispatch & routing
- Precheck automation (inventory, warranty, photos)
- Service order generation with QR codes
- Photo capture & validation
- Digital signatures

**Use Cases:**
- Service request handling
- Field technician management
- Work order tracking
- Customer communication

**Access:** `/work-orders`, `/tickets`, `/dispatch`

---

### 2. Asset Lifecycle Management

**Overview:** Complete asset tracking from procurement to retirement.

**Key Features:**
- Asset registration & cataloging
- Maintenance scheduling
- Warranty tracking
- Service history
- Predictive maintenance alerts
- Asset lifecycle reporting

**Use Cases:**
- Equipment tracking
- Maintenance scheduling
- Warranty management
- Asset performance analytics

**Access:** `/equipment`, `/maintenance-calendar`, `/predictive-maintenance`

---

### 3. AI Forecasting & Scheduling

**Overview:** ML-powered demand forecasting and intelligent scheduling.

**Key Features:**
- 7-level hierarchical forecasting (Country → Region → State → City → Hub → Pincode → Product)
- 30-day forecast horizon
- Route optimization
- Schedule optimization
- Capacity planning
- Demand pattern analysis

**Use Cases:**
- Resource planning
- Demand forecasting
- Schedule optimization
- Capacity management

**Access:** `/forecast-center`, `/scheduler`, `/route-optimization`

---

### 4. Fraud Detection & Compliance

**Overview:** AI-powered fraud detection and comprehensive compliance management.

**Key Features:**
- Real-time anomaly detection
- ML-powered fraud alerts
- Investigation workflows
- Compliance automation (SOC 2, ISO 27001)
- Audit trail management
- Risk scoring

**Use Cases:**
- Fraud investigation
- Compliance audits
- Risk management
- Regulatory reporting

**Access:** `/fraud`, `/compliance-dashboard`, `/compliance-center`

---

### 5. Analytics & BI Integration

**Overview:** Comprehensive analytics with native BI tool integrations.

**Key Features:**
- Real-time dashboards
- Custom report builder
- BI tool integrations (PowerBI, Tableau, Looker)
- Export capabilities (CSV, Excel, PDF)
- Scheduled reports
- Data warehouse access

**Use Cases:**
- Business intelligence
- Performance analytics
- Custom reporting
- Data visualization

**Access:** `/analytics`, `/analytics-platform`, `/analytics-integrations`

---

### 6. Customer Portal

**Overview:** Self-service portal for customers to track service requests.

**Key Features:**
- Service request tracking
- Work order status
- Service history
- Invoice viewing & payment
- Digital signature collection
- Communication hub

**Use Cases:**
- Customer self-service
- Service transparency
- Payment processing
- Customer engagement

**Access:** `/customer-portal`

---

### 7. Video Training & Knowledge Base

**Overview:** Comprehensive training and knowledge management system.

**Key Features:**
- Video training library
- Knowledge base articles
- Training progress tracking
- Certification management
- Onboarding workflows
- Search & discovery

**Use Cases:**
- Employee training
- Onboarding
- Knowledge management
- Certification tracking

**Access:** `/training`, `/knowledge-base`

---

### 8. Marketplace & Extensions

**Overview:** Ecosystem for third-party integrations and extensions.

**Key Features:**
- Extension marketplace
- Developer portal
- API key management
- Integration management
- Usage analytics
- Revenue sharing

**Use Cases:**
- Third-party integrations
- Custom extensions
- Developer ecosystem
- API monetization

**Access:** `/marketplace`, `/developer-portal`, `/developer-console`

---

## User Guides

### Getting Started

1. **Account Creation**
   - Navigate to `/auth` or module-specific auth page
   - Create account or use test accounts
   - Complete onboarding wizard

2. **First Login**
   - Select your plan (Starter, Professional, Business, Enterprise)
   - Choose modules you need
   - Configure company settings

3. **Module Access**
   - Access modules from sidebar navigation
   - Each module has its own login page (`/auth/module-name`)
   - Platform login provides unified access

### Role-Based Access

**System Admin (`sys_admin`)**
- Full platform access
- User management
- System configuration
- All modules accessible

**Tenant Admin (`tenant_admin`)**
- Tenant-level administration
- User management within tenant
- Module configuration
- Reporting access

**Operations Manager (`ops_manager`)**
- Work order management
- Technician dispatch
- Inventory management
- Operational reporting

**Technician (`technician`)**
- Work order viewing & completion
- Photo upload
- Service order signing
- Status updates

**Partner Admin (`partner_admin`)**
- Partner organization management
- Technician management
- Service delivery
- Performance tracking

### Common Workflows

**Creating a Work Order:**
1. Navigate to `/tickets`
2. Click "Create Ticket"
3. Fill in customer, equipment, and issue details
4. Ticket automatically converts to work order
5. Precheck system validates prerequisites
6. Work order released for assignment

**Processing Fraud Alert:**
1. Navigate to `/fraud`
2. Review ML-generated alerts
3. Open investigation
4. Add notes and evidence
5. Assign priority and resolution
6. Track investigation status

**Generating Reports:**
1. Navigate to `/analytics`
2. Select report type
3. Configure filters and date ranges
4. Generate report
5. Export or schedule for delivery

---

## API Documentation

### Base URL
```
https://{your-project-id}.supabase.co
```

### Authentication

**JWT Token (User Auth):**
```bash
Authorization: Bearer {jwt_token}
```

**API Key (Developer Access):**
```bash
X-API-Key: {api_key}
```

### Core Endpoints

**Work Orders:**
- `GET /rest/v1/work_orders` - List work orders
- `POST /rest/v1/work_orders` - Create work order
- `PATCH /rest/v1/work_orders?id=eq.{id}` - Update work order
- `DELETE /rest/v1/work_orders?id=eq.{id}` - Delete work order

**Tickets:**
- `GET /rest/v1/tickets` - List tickets
- `POST /rest/v1/tickets` - Create ticket
- `PATCH /rest/v1/tickets?id=eq.{id}` - Update ticket

**Fraud Detection:**
- `POST /functions/v1/fraud-detection` - Trigger fraud check
- `GET /rest/v1/fraud_alerts` - List alerts

**Forecasting:**
- `POST /functions/v1/forecast` - Generate forecast
- `GET /rest/v1/forecasts` - Retrieve forecasts

### Edge Functions

All agent services are exposed as Edge Functions:
- `/functions/v1/agent/ops` - Operations agent
- `/functions/v1/agent/fraud` - Fraud agent
- `/functions/v1/agent/finance` - Finance agent
- `/functions/v1/agent/forecast` - Forecasting agent

### Rate Limits

- **Free Tier:** 1,000 requests/day
- **Professional:** 10,000 requests/day
- **Business:** 100,000 requests/day
- **Enterprise:** Custom limits

### Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `406` - Not Acceptable (RLS policy violation)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

---

## Configuration Guide

### Environment Variables

**Required:**
```bash
VITE_SUPABASE_URL=https://{project-id}.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY={anon_key}
```

**Optional:**
```bash
VITE_APP_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
```

### Tenant Configuration

**Tenant Settings:**
- Company name & branding
- Timezone & locale
- Currency preferences
- SLA definitions
- Notification preferences

**Access:** `/settings` → Tenant Configuration

### Module Activation

**Enable/Disable Modules:**
1. Navigate to `/settings` → Modules
2. Toggle module activation
3. Configure module-specific settings
4. Assign module access to roles

### RBAC Configuration

**Managing Roles:**
1. Navigate to `/admin` (sys_admin only)
2. Go to Roles & Permissions
3. Create custom roles
4. Assign permissions
5. Map roles to users

---

## Troubleshooting

### Common Issues

**"Access Denied" Errors:**
- Verify user has required role/permission
- Check RBAC context is loaded
- Review `user_roles` table assignment
- Run `FIX_ACCESS_DENIED_PERMISSIONS.sql` if needed

**Login Failures:**
- Verify Supabase credentials in `.env`
- Check user exists in `auth.users`
- Ensure profile exists in `profiles` table
- Verify email confirmation status

**Missing Data:**
- Check RLS policies allow access
- Verify tenant_id matches user's tenant
- Review audit logs for errors
- Check database connection

**Performance Issues:**
- Review Edge Function logs
- Check database query performance
- Monitor API rate limits
- Review browser console for errors

### Debug Mode

Enable debug logging:
```typescript
localStorage.setItem('debug', 'true');
```

Check console for:
- RBAC role/permission loading
- API request/response logs
- Route navigation logs
- State management updates

### Support Resources

- **Documentation:** `/docs`
- **API Reference:** `/developer-portal`
- **Community:** Support portal
- **Email:** support@guardianflow.com

---

## Glossary

**Agent Service:** Autonomous AI-powered service handling specific operations (ops, fraud, finance, forecast)

**Edge Function:** Serverless function deployed on Supabase Edge network for low-latency execution

**Multi-Tenant:** Architecture allowing multiple independent organizations (tenants) on shared infrastructure

**RBAC:** Role-Based Access Control - permission system based on user roles

**RLS:** Row-Level Security - database-level security ensuring users only see their tenant's data

**Precheck:** Automated validation process before work order release (inventory, warranty, photos)

**SaPOS:** Smart Pricing & Offer System - AI-powered upsell recommendations

**SLA:** Service Level Agreement - performance commitments between platform and customers

**Tenant:** Independent organization using the platform with isolated data and configuration

---

**Document Version:** 6.1.0  
**Last Updated:** January 2025  
**Maintained By:** Guardian Flow Product Team

