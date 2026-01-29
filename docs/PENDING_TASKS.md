# Guardian Flow — Pending Tasks

**Version:** 6.1
**Date:** January 29, 2026
**Status:** Production-ready code, pending operational setup

---

## Status Legend

- **Ready** — Code complete, needs operational setup only
- **Configured** — Code and config in place, needs credentials/provisioning
- **Future** — Not yet implemented, planned for next iteration

---

## 1. Pre-Deployment (Operational Setup Required)

### 1.1 SSL/TLS Certificate — Ready
- nginx config is in place (`nginx/nginx.conf`, `nginx/ssl.conf`)
- Needs: SSL certificate and key placed at `nginx/ssl/cert.pem` and `nginx/ssl/key.pem`
- Options: Let's Encrypt (certbot), AWS ACM, or manual purchase
- Self-signed for testing: `openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -subj "/CN=localhost"`

### 1.2 Email Service (SMTP) — Configured
- Nodemailer integration in `server/services/email.js`
- Falls back to console logging when SMTP not configured
- Needs: SMTP credentials in `.env` (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)
- Options: Gmail App Password, SendGrid, AWS SES, Mailgun

### 1.3 Database Credentials — Configured
- Validation in `server/config/dbValidation.js` rejects defaults in production
- Needs: Strong unique DB_USER and DB_PASSWORD (16+ chars) for production
- docker-compose.yml uses env var references (`${DB_USER:-postgres}`)

### 1.4 JWT Secret — Configured
- Server refuses to start without JWT_SECRET in production
- Needs: Random 64+ character string in `.env`
- Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 1.5 FRONTEND_URL — Configured
- CORS validation requires FRONTEND_URL in production
- Server refuses to start without it
- Needs: Set to your production domain (e.g., `https://app.guardianflow.com`)

---

## 2. Cloud Deployment (Choose One)

### 2.1 Docker Compose (Self-hosted) — Ready
- All services defined in `docker-compose.yml`
- Requires: `.env` file with production credentials, SSL certificates
- Run: `docker compose up -d`

### 2.2 AWS (Terraform) — Configured
- Infrastructure code in `infrastructure/terraform/aws/`
- Creates: VPC, RDS, ECS Fargate, ALB, CloudFront, Secrets Manager
- Requires: AWS account, ACM certificate, ECR repository
- Steps:
  1. Build and push Docker image to ECR
  2. `terraform init && terraform apply`
  3. Point DNS to ALB

### 2.3 DNS Configuration — Future
- Not automated
- Needs: A/CNAME record pointing to ALB or nginx IP

---

## 3. Monitoring Setup

### 3.1 Prometheus/Grafana — Configured
- `/metrics` endpoint returns Prometheus-format data
- `/metrics/json` returns JSON for custom dashboards
- Needs: Prometheus scrape config pointing to `/metrics`
- Optional: Grafana dashboard for visualization

### 3.2 Error Tracking (Sentry) — Configured
- `server/services/errorTracking.js` supports optional Sentry integration
- Needs: SENTRY_DSN env var if using Sentry
- Structured JSON logging works without Sentry

### 3.3 Alerting — Future
- No alerting rules configured
- Needs: CloudWatch Alarms, PagerDuty, or Grafana alerting setup
- Recommended alerts: health check failures, error rate > 1%, p95 latency > 500ms

---

## 4. Security Hardening

### 4.1 Penetration Testing — Future
- Application code is hardened (SQL injection fixed, input validation, rate limiting)
- Needs: Professional pentest before public launch
- Scope: auth flows, API endpoints, RBAC bypass, XSS/CSRF

### 4.2 Dependency Audit — Future
- Run `npm audit` regularly
- Consider: Snyk or Dependabot for automated vulnerability scanning
- Add to CI pipeline

### 4.3 WAF (Web Application Firewall) — Future
- nginx provides basic rate limiting
- For enhanced protection: AWS WAF, Cloudflare WAF, or ModSecurity
- Recommended rules: SQL injection, XSS, bot detection

---

## 5. Scaling Preparation

### 5.1 Redis Deployment — Configured
- `server/services/cache.js` supports Redis with in-memory fallback
- docker-compose.yml includes optional Redis service
- Needs: Set REDIS_URL env var when running multiple instances
- Required for: shared rate limiting, distributed token blacklist

### 5.2 Horizontal Scaling — Configured
- ECS Fargate Terraform supports `app_instance_count` variable (default: 2)
- Stateless API design (JWT, no server sessions)
- Needs: Redis for shared state before scaling beyond 1 instance

### 5.3 Database Read Replicas — Future
- Current: single PostgreSQL instance with connection pooling (max 20)
- For high read loads: add RDS read replica
- Needs: application-level read/write splitting

### 5.4 Production Load Testing — Ready
- Scripts in place: `tests/load/production-load.js` (500 VUs), `tests/load/spike-test.js` (2000 VUs)
- Run before launch: `k6 run tests/load/production-load.js`
- Needs: k6 CLI installed, server running at target environment

---

## 6. Feature Enhancements

### 6.1 Email Templates — Future
- Current: inline HTML in `server/services/email.js`
- Improve: extract to template files, add welcome email, invoice email
- Consider: MJML or React Email for responsive templates

### 6.2 Webhook Retry Queue — Future
- Webhook delivery exists but no retry mechanism
- Needs: exponential backoff retry with dead letter queue
- Consider: Bull/BullMQ with Redis for job queue

### 6.3 API Versioning (Full) — Partial
- `/api/v1/` alias exists in server.js
- Future versions would need separate route files per version
- Current routes are effectively v1

### 6.4 GraphQL API — Future
- REST API is complete
- GraphQL would benefit: dashboard aggregation queries, mobile clients
- Consider: Apollo Server alongside Express

### 6.5 Mobile Push Notifications — Future
- WebSocket provides real-time updates for web clients
- Needs: Firebase Cloud Messaging or APNs for mobile push
- Relevant for: technician dispatch, work order assignments

### 6.6 Internationalization (i18n) — Future
- All strings currently in English
- Needs: i18n library (react-intl or i18next), translation files
- Priority for: multi-geography deployments

---

## 7. Documentation

### 7.1 API Documentation — Future
- Developer portal page exists at `/developer-portal`
- Needs: OpenAPI/Swagger spec for all endpoints
- Consider: swagger-jsdoc to generate from route annotations

### 7.2 Runbook — Future
- Needs: operational runbook for common scenarios
- Topics: deployment, rollback, database restore, incident response, scaling

### 7.3 Architecture Decision Records (ADRs) — Future
- Key decisions documented in TRD but not formalized as ADRs
- Consider: lightweight ADR format in `docs/decisions/`

---

## Priority Order for Launch

1. **SSL certificate + DNS** (blocks everything)
2. **Production credentials** (DB, JWT, FRONTEND_URL)
3. **SMTP credentials** (password reset functionality)
4. **Deploy** (Docker Compose or Terraform)
5. **Monitoring** (Prometheus scrape config)
6. **Production load test** (validate capacity)
7. **Penetration test** (security validation)

---

*End of Pending Tasks*
