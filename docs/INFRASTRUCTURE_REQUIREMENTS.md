# Infrastructure Requirements

**Version:** 7.0 | **Date:** April 2026

> **Correction from previous versions:** Earlier infrastructure documentation incorrectly listed GPU node pools, Kubernetes clusters, TorchServe, and SQS/RabbitMQ as required. None of these are needed for the current build. The computer vision feature is a mock stub (`Math.random()`); no real CV model is deployed.

---

## Minimum Production Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js runtime | 20.x LTS | 22.x LTS |
| RAM (app server) | 512 MB | 2 GB |
| Disk (app + uploads) | 10 GB | 50 GB+ |
| MongoDB Atlas | M10 (2 vCPU, 2 GB RAM) | M30 (4 vCPU, 32 GB RAM) |
| Atlas storage | 10 GB | 100 GB + auto-scale |
| Atlas backups | Daily snapshots | Continuous + 30-day retention |

---

## 1. Database — MongoDB Atlas (Default)

**Required for standard deployment.**

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
DB_NAME=guardianflow
DB_POOL_MAX=20
```

Atlas configuration:
- Enable Atlas Vector Search if using real LLM embeddings (for RAG quality improvement)
- Enable Atlas backups (continuous recommended for production)
- Set up Atlas IP Access List for app server IPs
- Multi-region deployment for HA (M30+)

### PostgreSQL Alternative

If deploying against PostgreSQL instead:

```
DB_ADAPTER=postgresql
POSTGRES_URI=postgres://user:password@host:5432/guardianflow
```

Same application code runs against both adapters via the `server/db/factory.js` abstraction. Run migrations with `node server/scripts/phase0-migration.js` for both.

---

## 2. File Storage — Disk-Based (Default)

Files uploaded via Multer are stored to local disk by default. For production, mount a persistent volume or configure an S3-compatible store.

Directories used:
- `uploads/attachments/` — technician photo uploads
- `uploads/service-orders/` — generated PDF service orders

For cloud storage, configure the storage service (`server/routes/storage.js`) with an S3 compatible endpoint.

---

## 3. Optional External Services

These services are optional and gracefully degraded when not configured.

### 3.1 OpenAI API — AI features

```
OPENAI_API_KEY=sk-...
AI_PROVIDER=openai
```

Without this, the platform operates in **mock mode**:
- LLM responses are keyword-match approximations
- RAG search returns low-quality results (zero vectors)
- Anomaly detection is **always real** (z-score, no API key required)
- Vision/CV is **always mock** regardless of this setting

### 3.2 Payment Providers

```
STRIPE_SECRET_KEY=sk_live_...
# and/or PayPal / Razorpay credentials
```

Without payment credentials, the payments UI renders but all payment calls return errors.

### 3.3 Email (SMTP)

```
# Nodemailer SMTP configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

Used for: customer notifications, work order updates, report delivery. Without this, email features are silently disabled.

### 3.4 MQTT Broker — IoT Telemetry

```
MQTT_BROKER_URL=mqtt://broker.example.com:1883
```

Without this, IoT telemetry ingestion (`/api/iot-telemetry`) stubs out with log messages. No real sensor data is ingested. Predictive maintenance operates on historical work order data only.

### 3.5 SSO / SAML Provider

```
# Configure via /api/sso routes after deployment
# Requires: IdP metadata URL, Entity ID, certificate
```

SSO is scaffolded in `server/routes/sso.js`. Requires a SAML 2.0 provider (Okta, Azure AD, Google Workspace).

### 3.6 SIEM Integration

```
SIEM_WEBHOOK_URL=https://your-siem.example.com/ingest
```

Security events from `server/routes/security-monitor.js` can be forwarded to Datadog, Splunk, or Azure Sentinel via webhook. Not required for platform operation.

---

## 4. Not Required (Previous Docs Were Wrong)

| Item | Previous claim | Actual state |
|------|---------------|-------------|
| GPU node pool / Kubernetes | "Required for CV model serving" | **Not required** — CV is mock (`Math.random()`) |
| TorchServe / Kubeflow | "For ML model serving" | **Not required** — no production ML model deployed |
| AWS SQS / RabbitMQ | "For async photo validation queue" | **Not required** — no async CV pipeline |
| NVIDIA CUDA drivers | "For GPU inference" | **Not required** |
| ManTraNet / TruFor CV model | "For tamper detection" | **Not built** — stub only |

These become relevant once the computer vision gap (Gate 2 item) is implemented.

---

## 5. Network & Security

### Ports

| Service | Port | Notes |
|---------|------|-------|
| Express.js backend | 3001 | Configurable via `PORT` env var |
| Vite dev server | 5173 | Frontend dev only |
| WebSocket | 3001 | Same port as Express (upgraded HTTP connection) |

### Firewall Rules

- App server → MongoDB Atlas: Whitelist app server IP in Atlas IP Access List
- Load balancer → app server: Port 3001 (or 443 via TLS termination)
- App server → OpenAI API: Outbound HTTPS (443) to `api.openai.com`
- App server → SMTP: Outbound port 587 (TLS) or 465 (SSL)

### TLS

Configure TLS termination at the load balancer or reverse proxy (nginx/Caddy). The Express.js server itself does not terminate TLS.

---

## 6. Environment Variable Reference

See `.env.example` in the repository root for the full list with comments.

| Variable | Required | Default | Purpose |
|----------|:--------:|---------|---------|
| `VITE_API_URL` | ✅ | — | Frontend → backend URL |
| `JWT_SECRET` | ✅ | — | JWT signing key (use strong random string) |
| `DB_ADAPTER` | — | `mongodb` | `mongodb` or `postgresql` |
| `MONGODB_URI` | If MongoDB | — | MongoDB connection string |
| `POSTGRES_URI` | If PG | — | PostgreSQL connection string |
| `OPENAI_API_KEY` | — | — | Enables real LLM + embeddings |
| `AI_PROVIDER` | — | `mock` | `mock` or `openai` |
| `STRIPE_SECRET_KEY` | — | — | Enables Stripe payments |
| `MQTT_BROKER_URL` | — | — | Enables IoT telemetry |
| `PORT` | — | `3001` | Express.js listen port |

---

## 7. Running DB Migrations

```bash
# Run all migrations (idempotent)
node server/scripts/phase0-migration.js
```

Migrations are tracked in the `schema_migrations` collection. Running this on a database that already has the migrations applied is safe — it will skip already-applied migrations.
