# Guardian Flow v6.0

**Enterprise Field Service Intelligence Platform + PaaS**

Guardian Flow is an AI-powered field service management platform that combines work order orchestration, fraud detection, financial reconciliation, and hierarchical forecasting. Now with **Platform-as-a-Service (PaaS)** capabilities enabling external developers to build on top of Guardian Flow.

## 🚀 v6.0 - PaaS Evolution

### New Capabilities

**🔑 API Gateway & Security**
- Multi-tenant API key management
- Rate limiting (1000 calls/day default)
- Request/response logging with correlation IDs
- Secure internal service routing

**🛠 Agent Service APIs**
- `/api/agent/ops` - Work order orchestration
- `/api/agent/fraud` - Fraud detection & validation
- `/api/agent/finance` - Finance & billing operations
- `/api/agent/forecast` - Hierarchical forecasting

**💼 Developer Console**
- Self-service API key generation
- Real-time usage analytics (30-day charts)
- Billing summary with call counts
- Key management (revoke, renew, view usage)

**📊 Platform Metrics**
- System-wide observability (admin-only)
- Success/error rate tracking
- Endpoint performance monitoring
- Top tenant usage analytics

**🧪 Sandbox Environment**
- 7-day trial tenants with demo data
- Instant provisioning via public endpoint
- 500 API calls/day for testing
- Auto-expiry after trial period

**💰 Usage-Based Billing**
- Pay-per-call pricing (₹0.25 per request)
- Daily reconciliation of API usage
- Billing cycle tracking per tenant

## Core Features (v5.0)
- **Hierarchical Forecasting**: 7-level geographic intelligence
- **AI Agents**: Autonomous operations with GPT/Gemini integration
- **Fraud Detection**: ML-powered anomaly detection
- **Financial Management**: Automated penalties & invoicing
- **Multi-Tenant Architecture**: Complete data isolation

## Quick Start

### For Developers
1. Go to `/developer` to create a sandbox tenant
2. Receive your `api_key` and `tenant_id`
3. Make API calls to `/functions/v1/api-gateway`
4. Monitor usage at `/developer-console`

**API Example**:
```bash
curl -X POST https://PROJECT.supabase.co/functions/v1/api-gateway \
  -H "x-api-key: YOUR_KEY" \
  -H "x-tenant-id: YOUR_TENANT" \
  -H "Content-Type: application/json" \
  -d '{"service": "ops", "action": "list_work_orders", "data": {"limit": 10}}'
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: Lovable AI Gateway (Gemini/GPT models)
- **PaaS**: API Gateway + Multi-tenant billing
- **Testing**: Playwright E2E

## Documentation

- **Product Specs**: `public/PRODUCT_SPECIFICATIONS_V5.md` (v6.0 updated)
- **API Docs**: `public/API_DOCUMENTATION.md`
- **Testing**: `docs/COMPLETE_TEST_GUIDE.md`

## Key Routes

### End Users
- `/` - Dashboard
- `/tickets`, `/work-orders`, `/finance`, `/sapos`, `/forecast`, etc.

### Developers
- `/developer` - Public landing page
- `/developer-console` - API management
- `/platform-metrics` - System metrics (admin)

## Security

- Row-Level Security (RLS) on all tables
- API key authentication with rate limiting
- Multi-Factor Auth (MFA) for sensitive operations
- Complete audit logging

## License

Proprietary - © 2025 Guardian Flow
